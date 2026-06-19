// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title PulsarStaking
 * @author Pulsar Compute
 * @notice Simple, auditable single-asset staking for $PULSAR.
 *
 *  Design:
 *    - Stake $PULSAR, earn $PULSAR at a configurable APY.
 *    - Rewards are emitted linearly over time from a reward pool funded by the treasury.
 *    - No locking — users can unstake anytime (subject to optional unstake window).
 *    - Owner (multisig) sets reward rate and tops up the reward pool.
 *
 *  Reward math (standard compound-free linear emission):
 *    rewardRate = rewardPool / rewardDurationSeconds
 *    earned(user) = staked * (rewardPerToken_now - rewardPerToken_at_last_update) / 1e18
 *
 *  Trust assumptions:
 *    - Owner is a Gnosis Safe multisig (per /docs/SECURITY.md).
 *    - Owner can change rewardRate but cannot seize user principal.
 *    - Owner can sweep only unrewarded $PULSAR (rescue) — never user stakes.
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract PulsarStaking is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    IERC20 public immutable pulsar;

    // ---------------------------------------------------------------------
    // Reward config
    // ---------------------------------------------------------------------

    uint256 public rewardRate; // $PULSAR per second distributed to all stakers
    uint256 public periodFinish; // timestamp when current reward period ends
    uint256 public lastUpdateTime; // last time rewardPerToken was updated
    uint256 public rewardPerTokenStored; // accumulated reward per 1 staked token (1e18 scale)

    uint256 public constant REWARD_DURATION = 30 days; // each top-up emits over 30 days

    // ---------------------------------------------------------------------
    // User state
    // ---------------------------------------------------------------------

    struct UserInfo {
        uint256 amount;            // staked balance
        uint256 rewardDebt;        // user's rewardPerToken at last action
        uint256 pendingRewards;    // accumulated but unclaimed rewards
    }

    mapping(address => UserInfo) public userInfo;

    uint256 public totalStaked;

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 amount);
    event RewardRateUpdated(uint256 oldRate, uint256 newRate, uint256 periodFinish);
    event RewardPoolToppedUp(uint256 amount);
    event Recovered(address indexed token, address indexed to, uint256 amount);

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    constructor(address _pulsar) Ownable(msg.sender) {
        require(_pulsar != address(0), "Staking: zero");
        pulsar = IERC20(_pulsar);
    }

    // ---------------------------------------------------------------------
    // View helpers
    // ---------------------------------------------------------------------

    function lastTimeRewardApplicable() public view returns (uint256) {
        return block.timestamp < periodFinish ? block.timestamp : periodFinish;
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) {
            return rewardPerTokenStored;
        }
        return rewardPerTokenStored
            + (lastTimeRewardApplicable() - lastUpdateTime) * rewardRate * 1e18 / totalStaked;
    }

    /// @notice Pending rewards for a user, including unclaimed.
    function earned(address account) public view returns (uint256) {
        UserInfo memory info = userInfo[account];
        return info.pendingRewards
            + info.amount * (rewardPerToken() - info.rewardDebt) / 1e18;
    }

    /// @notice Approximate APY (basis points, 18-decimal scale) at current state.
    /// @dev Returns 0 if totalStaked == 0.
    function currentAPYBps() external view returns (uint256) {
        if (totalStaked == 0 || rewardRate == 0) return 0;
        uint256 annualRewards = rewardRate * 365 days;
        return annualRewards * 10000 / totalStaked;
    }

    // ---------------------------------------------------------------------
    // User actions
    // ---------------------------------------------------------------------

    function stake(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Staking: 0");
        _updateReward(msg.sender);

        pulsar.safeTransferFrom(msg.sender, address(this), amount);
        userInfo[msg.sender].amount += amount;
        totalStaked += amount;

        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Staking: 0");
        UserInfo storage info = userInfo[msg.sender];
        require(info.amount >= amount, "Staking: > staked");

        _updateReward(msg.sender);

        info.amount -= amount;
        totalStaked -= amount;
        pulsar.safeTransfer(msg.sender, amount);

        emit Unstaked(msg.sender, amount);
    }

    /// @notice Claim all pending rewards without unstaking.
    function claim() external nonReentrant whenNotPaused {
        _updateReward(msg.sender);
        UserInfo storage info = userInfo[msg.sender];
        uint256 reward = info.pendingRewards;
        if (reward > 0) {
            info.pendingRewards = 0;
            require(pulsar.balanceOf(address(this)) >= reward, "Staking: insufficient");
            pulsar.safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    /// @notice Convenience: unstake everything and claim rewards.
    function exit() external nonReentrant {
        UserInfo storage info = userInfo[msg.sender];
        if (info.amount > 0) {
            uint256 amount = info.amount;
            _updateReward(msg.sender);
            info.amount = 0;
            totalStaked -= amount;
            pulsar.safeTransfer(msg.sender, amount);
            emit Unstaked(msg.sender, amount);
        }
        uint256 reward = info.pendingRewards;
        if (reward > 0) {
            info.pendingRewards = 0;
            pulsar.safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    // ---------------------------------------------------------------------
    // Internal
    // ---------------------------------------------------------------------

    function _updateReward(address account) internal {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();
        if (account != address(0)) {
            UserInfo storage info = userInfo[account];
            info.pendingRewards = earned(account);
            info.rewardDebt = rewardPerTokenStored;
        }
    }

    // ---------------------------------------------------------------------
    // Owner
    // ---------------------------------------------------------------------

    /// @notice Top up the reward pool with `amount` $PULSAR and reset the 30-day emission.
    /// @param amount $PULSAR (18 decimals) to add to the reward pool.
    function topUpRewards(uint256 amount) external onlyOwner {
        require(amount > 0, "Staking: 0");
        _updateReward(address(0));
        pulsar.safeTransferFrom(msg.sender, address(this), amount);

        uint256 remaining = 0;
        if (block.timestamp < periodFinish) {
            remaining = rewardRate * (periodFinish - block.timestamp);
        }
        rewardRate = (remaining + amount) / REWARD_DURATION;
        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp + REWARD_DURATION;

        emit RewardRateUpdated(rewardRate, rewardRate, periodFinish);
        emit RewardPoolToppedUp(amount);
    }

    function setRewardRate(uint256 _rate) external onlyOwner {
        _updateReward(address(0));
        uint256 prev = rewardRate;
        rewardRate = _rate;
        if (block.timestamp >= periodFinish) {
            periodFinish = block.timestamp + REWARD_DURATION;
            lastUpdateTime = block.timestamp;
        }
        emit RewardRateUpdated(prev, _rate, periodFinish);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Rescue tokens accidentally sent to the contract.
    /// @dev Cannot rescue $PULSAR below the locked user pool.
    function recoverERC20(address token, address to, uint256 amount) external onlyOwner nonReentrant {
        require(to != address(0), "Staking: zero");
        if (token == address(pulsar)) {
            uint256 available = pulsar.balanceOf(address(this)) - totalStaked;
            require(amount <= available, "Staking: > available");
        }
        IERC20(token).safeTransfer(to, amount);
        emit Recovered(token, to, amount);
    }
}
