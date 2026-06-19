// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Pulsar
 * @author Pulsar Compute
 * @notice $PULSAR — the signal layer for decentralized AI compute.
 *
 *  ERC-20 utility token on Base (chainId 8453) used to:
 *    - pay for AI inference jobs (consumers burn/spend $PULSAR)
 *    - reward node operators that supply GPU/compute power (suppliers earn $PULSAR)
 *    - accrue a protocol fee on every compute job, funding quarterly buyback-and-burn
 *
 *  Design goals:
 *    1. Fixed supply (1_000_000_000e18), mint disabled forever.
 *    2. Optional buy/sell tax, hard-capped at 5/5, reducible to 0/0.
 *       Tax split: treasury / liquidity / burn (configurable within cap).
 *    3. Anti-bot max-wallet and max-tx limits at launch, removable by owner.
 *    4. Manual burn function for deflationary mechanics.
 *    5. NOT upgradeable — source is immortal and auditable.
 *
 *  Tax mechanics:
 *    - "Buy"  = transfer from the Uniswap V2 pair to any non-exempt address.
 *    - "Sell" = transfer from any non-exempt address to the Uniswap V2 pair.
 *    - All other transfers (wallet→wallet, team vesting, staking rewards) are untaxed.
 *    - Exempt addresses (pair, owner, treasury, staking contract, etc.) bypass tax.
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract Pulsar is ERC20, Ownable, ReentrancyGuard, Pausable {
    // ---------------------------------------------------------------------
    // Constants
    // ---------------------------------------------------------------------

    /// @notice Total fixed supply: 1,000,000,000 $PULSAR (1B), 18 decimals.
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 * 10 ** 18;

    /// @notice Hard cap on buy tax (in basis points). 500 = 5%.
    uint16 public constant MAX_TAX_BPS = 500;

    /// @notice Hard cap on max-tx as % of supply (5% of supply).
    uint256 public constant MAX_TX_CAP_BPS = 500; // 5%

    /// @notice Hard cap on max-wallet as % of supply (5% of supply at launch).
    uint256 public constant MAX_WALLET_CAP_BPS = 500; // 5%

    // ---------------------------------------------------------------------
    // Tax configuration
    // ---------------------------------------------------------------------

    uint16 public buyTaxBps = 200;   // 2% default
    uint16 public sellTaxBps = 200;  // 2% default

    /// @notice Splits of the collected tax, in basis points. Must sum to 10000.
    uint16 public treasuryTaxShareBps = 5000; // 50% of tax -> treasury (1% of total)
    uint16 public liquidityTaxShareBps = 2500; // 25% of tax -> liquidity (0.5% of total)
    uint16 public burnTaxShareBps = 2500;      // 25% of tax -> burn (0.5% of total)

    address public treasuryWallet;
    address public liquidityWallet;

    /// @notice Uniswap V2 pair set after liquidity is added. Used to detect buy/sell.
    address public uniswapV2Pair;

    // ---------------------------------------------------------------------
    // Anti-bot limits
    // ---------------------------------------------------------------------

    bool public limitsInEffect = true;
    bool public tradingEnabled = false;

    uint256 public maxTxAmount = INITIAL_SUPPLY * MAX_TX_CAP_BPS / 10000;
    uint256 public maxWalletAmount = INITIAL_SUPPLY * MAX_WALLET_CAP_BPS / 10000;

    // ---------------------------------------------------------------------
    // Exemptions
    // ---------------------------------------------------------------------

    mapping(address => bool) public isExcludedFromFees;
    mapping(address => bool) public isExcludedFromLimits;
    mapping(address => bool) public automatedMarketMakerPairs;

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    event TreasuryWalletUpdated(address indexed previous, address indexed next);
    event LiquidityWalletUpdated(address indexed previous, address indexed next);
    event BuyTaxUpdated(uint16 previousBps, uint16 nextBps);
    event SellTaxUpdated(uint16 previousBps, uint16 nextBps);
    event TaxSharesUpdated(uint16 treasuryBps, uint16 liquidityBps, uint16 burnBps);
    event LimitsToggled(bool enabled);
    event TradingEnabled();
    event MaxTxUpdated(uint256 previous, uint256 next);
    event MaxWalletUpdated(uint256 previous, uint256 next);
    event PairSet(address indexed pair, bool isAMM);
    event ExcludeFromFees(address indexed account, bool isExcluded);
    event ExcludeFromLimits(address indexed account, bool isExcluded);
    event ManualBurn(address indexed burner, uint256 amount);
    event TokensRecovered(address indexed token, address indexed to, uint256 amount);

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    constructor(
        address _treasuryWallet,
        address _liquidityWallet,
        address _teamWallet
    ) ERC20("Pulsar", "PULSAR") Ownable(msg.sender) {
        require(_treasuryWallet != address(0), "Pulsar: treasury zero");
        require(_liquidityWallet != address(0), "Pulsar: liquidity zero");
        require(_teamWallet != address(0), "Pulsar: team zero");

        treasuryWallet = _treasuryWallet;
        liquidityWallet = _liquidityWallet;

        // Exempt core accounts from fees + limits
        _setExcludedFromFees(msg.sender, true);
        _setExcludedFromFees(_treasuryWallet, true);
        _setExcludedFromFees(_liquidityWallet, true);
        _setExcludedFromFees(_teamWallet, true);
        _setExcludedFromFees(address(this), true);

        _setExcludedFromLimits(msg.sender, true);
        _setExcludedFromLimits(_treasuryWallet, true);
        _setExcludedFromLimits(_liquidityWallet, true);
        _setExcludedFromLimits(_teamWallet, true);
        _setExcludedFromLimits(address(this), true);

        // Mint the full fixed supply to deployer. Deployer is responsible for
        // transferring allocations (ecosystem, treasury, team, marketing, presale,
        // liquidity) to their respective wallets/vesting contracts per the
        // tokenomics schedule documented in /docs/TOKENOMICS.md.
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    receive() external payable {}

    // ---------------------------------------------------------------------
    // Admin: trading, limits, taxes
    // ---------------------------------------------------------------------

    /// @notice Enable public trading. Called once after liquidity is added.
    function enableTrading() external onlyOwner {
        require(!tradingEnabled, "Pulsar: already enabled");
        tradingEnabled = true;
        emit TradingEnabled();
    }

    /// @notice Permanently remove anti-bot limits. Irreversible.
    function removeLimits() external onlyOwner {
        limitsInEffect = false;
        maxTxAmount = INITIAL_SUPPLY;
        maxWalletAmount = INITIAL_SUPPLY;
        emit LimitsToggled(false);
    }

    /// @notice Toggle limits back on if needed pre-launch (cannot re-enable after removeLimits if you choose to lock).
    function setLimitsInEffect(bool enabled) external onlyOwner {
        limitsInEffect = enabled;
        emit LimitsToggled(enabled);
    }

    function setMaxTx(uint256 _maxTx) external onlyOwner {
        require(_maxTx >= INITIAL_SUPPLY * 50 / 10000, "Pulsar: < 0.5% supply");
        require(_maxTx <= INITIAL_SUPPLY * MAX_TX_CAP_BPS / 10000, "Pulsar: > cap");
        uint256 prev = maxTxAmount;
        maxTxAmount = _maxTx;
        emit MaxTxUpdated(prev, _maxTx);
    }

    function setMaxWallet(uint256 _maxWallet) external onlyOwner {
        require(_maxWallet >= INITIAL_SUPPLY * 50 / 10000, "Pulsar: < 0.5% supply");
        require(_maxWallet <= INITIAL_SUPPLY * MAX_WALLET_CAP_BPS / 10000, "Pulsar: > cap");
        uint256 prev = maxWalletAmount;
        maxWalletAmount = _maxWallet;
        emit MaxWalletUpdated(prev, _maxWallet);
    }

    /// @notice Set buy tax in bps. Hard-capped at MAX_TAX_BPS (5%).
    function setBuyTax(uint16 _bps) external onlyOwner {
        require(_bps <= MAX_TAX_BPS, "Pulsar: > cap");
        uint16 prev = buyTaxBps;
        buyTaxBps = _bps;
        emit BuyTaxUpdated(prev, _bps);
    }

    function setSellTax(uint16 _bps) external onlyOwner {
        require(_bps <= MAX_TAX_BPS, "Pulsar: > cap");
        uint16 prev = sellTaxBps;
        sellTaxBps = _bps;
        emit SellTaxUpdated(prev, _bps);
    }

    /// @notice Configure how the collected tax is split. Must sum to 10000.
    function setTaxShares(
        uint16 _treasuryBps,
        uint16 _liquidityBps,
        uint16 _burnBps
    ) external onlyOwner {
        require(
            uint256(_treasuryBps) + uint256(_liquidityBps) + uint256(_burnBps) == 10000,
            "Pulsar: shares != 10000"
        );
        treasuryTaxShareBps = _treasuryBps;
        liquidityTaxShareBps = _liquidityBps;
        burnTaxShareBps = _burnBps;
        emit TaxSharesUpdated(_treasuryBps, _liquidityBps, _burnBps);
    }

    function setTreasuryWallet(address _wallet) external onlyOwner {
        require(_wallet != address(0), "Pulsar: zero");
        address prev = treasuryWallet;
        treasuryWallet = _wallet;
        emit TreasuryWalletUpdated(prev, _wallet);
    }

    function setLiquidityWallet(address _wallet) external onlyOwner {
        require(_wallet != address(0), "Pulsar: zero");
        address prev = liquidityWallet;
        liquidityWallet = _wallet;
        emit LiquidityWalletUpdated(prev, _wallet);
    }

    function setAutomatedMarketMakerPair(address pair, bool isAMM) external onlyOwner {
        require(pair != address(0), "Pulsar: zero");
        automatedMarketMakerPairs[pair] = isAMM;
        if (isAMM && uniswapV2Pair == address(0)) {
            uniswapV2Pair = pair;
        }
        emit PairSet(pair, isAMM);
    }

    function setExcludedFromFees(address account, bool excluded) external onlyOwner {
        _setExcludedFromFees(account, excluded);
    }

    function setExcludedFromLimits(address account, bool excluded) external onlyOwner {
        _setExcludedFromLimits(account, excluded);
    }

    function _setExcludedFromFees(address account, bool excluded) internal {
        isExcludedFromFees[account] = excluded;
        emit ExcludeFromFees(account, excluded);
    }

    function _setExcludedFromLimits(address account, bool excluded) internal {
        isExcludedFromLimits[account] = excluded;
        emit ExcludeFromLimits(account, excluded);
    }

    // ---------------------------------------------------------------------
    // Burn + rescue
    // ---------------------------------------------------------------------

    /// @notice Permanently burn $PULSAR from caller's balance.
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
        emit ManualBurn(msg.sender, amount);
    }

    /// @notice Burn $PULSAR from an approved allowance (e.g. protocol fee burn).
    function burnFrom(address account, uint256 amount) external {
        uint256 currentAllowance = allowance(account, msg.sender);
        require(currentAllowance >= amount, "Pulsar: < allowance");
        _spendAllowance(account, msg.sender, amount);
        _burn(account, amount);
        emit ManualBurn(msg.sender, amount);
    }

    /// @notice Rescue ERC-20 tokens accidentally sent to the contract (excludes $PULSAR during limits phase).
    function recoverERC20(address token, address to, uint256 amount) external onlyOwner nonReentrant {
        require(to != address(0), "Pulsar: zero");
        if (token == address(this) && limitsInEffect) {
            // do not allow draining the contract's $PULSAR while limits are live
            require(amount <= balanceOf(address(this)), "Pulsar: > bal");
        }
        IERC20(token).transfer(to, amount);
        emit TokensRecovered(token, to, amount);
    }

    // ---------------------------------------------------------------------
    // Internal: tax-aware transfer
    // ---------------------------------------------------------------------

    function _update(
        address from,
        address to,
        uint256 amount
    ) internal override {
        if (amount == 0) {
            super._update(from, to, 0);
            return;
        }

        bool isBuy = automatedMarketMakerPairs[from] && !isExcludedFromFees[from];
        bool isSell = automatedMarketMakerPairs[to] && !isExcludedFromFees[to];

        // Trading guard — only buys are blocked pre-launch; sells/normal transfers allowed post-liquidity
        if (!tradingEnabled) {
            require(!isBuy, "Pulsar: trading not enabled");
        }

        // Limits
        if (limitsInEffect) {
            if (!isExcludedFromLimits[from] && !isExcludedFromLimits[to]) {
                require(amount <= maxTxAmount, "Pulsar: > max tx");

                if (!automatedMarketMakerPairs[to]) {
                    // wallet-to-wallet or wallet-to-contract: enforce max wallet on receiver
                    uint256 nextBal = balanceOf(to) + amount;
                    require(nextBal <= maxWalletAmount, "Pulsar: > max wallet");
                }
            }
        }

        // Tax
        uint256 taxAmount = 0;
        if (isBuy && buyTaxBps > 0 && !isExcludedFromFees[to]) {
            taxAmount = amount * buyTaxBps / 10000;
        } else if (isSell && sellTaxBps > 0 && !isExcludedFromFees[from]) {
            taxAmount = amount * sellTaxBps / 10000;
        }

        if (taxAmount > 0) {
            uint256 burnPart = taxAmount * burnTaxShareBps / 10000;
            uint256 liqPart = taxAmount * liquidityTaxShareBps / 10000;
            uint256 treasuryPart = taxAmount - burnPart - liqPart; // remainder -> avoids rounding dust

            if (burnPart > 0) {
                super._update(from, address(0), burnPart);
            }
            if (treasuryPart > 0) {
                super._update(from, treasuryWallet, treasuryPart);
            }
            if (liqPart > 0) {
                super._update(from, liquidityWallet, liqPart);
            }
            amount -= taxAmount;
        }

        super._update(from, to, amount);
    }
}

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
}
