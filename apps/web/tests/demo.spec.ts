import { test, expect } from "@playwright/test";

test("completes the proof of review demo", async ({ page }) => {
  const shots = "/home/ubuntu/scratch/demo-shots";
  await page.goto("/demo");
  await page.screenshot({ path: `${shots}/step-1.png`, fullPage: true });
  await page.getByRole("button", { name: "GENERATE DEMO PURCHASE CREDENTIAL" }).click();
  await expect(page.getByRole("heading", { name: "SHOW PRIVATE DATA" })).toBeVisible();
  await page.screenshot({ path: `${shots}/step-2.png`, fullPage: true });
  await page.getByRole("button", { name: "CONTINUE" }).click();
  await page.getByRole("button", { name: "GENERATE PRIVATE PROOF" }).click();
  await expect(page.getByRole("button", { name: "WRITE REVIEW" })).toBeVisible({ timeout: 120000 });
  await page.screenshot({ path: `${shots}/step-3.png`, fullPage: true });
  await page.getByRole("button", { name: "WRITE REVIEW" }).click();
  await page.getByRole("button", { name: "COMPUTE REVIEW COMMITMENT" }).click();
  await page.screenshot({ path: `${shots}/step-4.png`, fullPage: true });
  await page.getByRole("button", { name: "VERIFY ON ETHEREUM" }).click();
  await expect(page.getByRole("heading", { name: "DISPLAY" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/VERIFICATION TRANSACTION · 0x/)).toBeVisible();
  await page.screenshot({ path: `${shots}/step-5.png`, fullPage: true });
  await page.getByRole("button", { name: "ATTEMPT DUPLICATE REVIEW" }).click();
  await page.screenshot({ path: `${shots}/step-6.png`, fullPage: true });
  await page.getByRole("button", { name: "RESUBMIT SAME PROOF" }).click();
  await expect(page.getByText(/NULLIFIER REJECTED/).first()).toBeVisible();
  await page.screenshot({ path: `${shots}/step-7.png`, fullPage: true });
});
