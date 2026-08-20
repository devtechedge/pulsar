import { expect, test } from "@playwright/test";

test.describe("Pulsar marketing site", () => {
  test("renders the hero and pre-TGE status", async ({ page }) => {
    await page.goto("/");

    const hero = page.getByTestId("hero");
    await expect(hero).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole("heading", {
        name: /signal layer for decentralized AI compute/i,
      })
    ).toBeVisible();
    await expect(hero.getByText("Contract: deploying at TGE")).toBeVisible();
  });

  test("tokenomics section shows 1B supply", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("hero")).toBeVisible({ timeout: 20_000 });

    const section = page.getByTestId("tokenomics");
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible({ timeout: 20_000 });
    await expect(section.getByText(/1,?000,?000,?000/)).toBeVisible();
  });

  test("network pulse visualizes live jobs", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("hero")).toBeVisible({ timeout: 20_000 });

    const pulse = page.getByTestId("network-pulse");
    await pulse.scrollIntoViewIfNeeded();
    await expect(pulse).toBeVisible({ timeout: 20_000 });
    await expect(pulse.getByText(/Every compute job is a pulse/i)).toBeVisible();
  });

  test("staking dashboard is a preview before TGE", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("hero")).toBeVisible({ timeout: 20_000 });

    const staking = page.getByTestId("staking-dashboard");
    await staking.scrollIntoViewIfNeeded();
    await expect(staking).toBeVisible({ timeout: 20_000 });
    await expect(
      staking.getByText(/Stake \$PULSAR, earn \$PULSAR/i)
    ).toBeVisible();
    await expect(
      staking.getByText(/preview with placeholder values/i)
    ).toBeVisible();
  });
});
