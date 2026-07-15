import { expect, test } from "playwright/test";

test("edits responsively without document overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const selectedPosition = page.locator('[data-key-id="L-r0-c0"]');
  await selectedPosition.click();
  const editor = page.getByRole("dialog", { name: "Key editor" });
  await expect(editor).toBeVisible();
  expect(await editor.evaluate((element) => element.getBoundingClientRect().height)).toBeLessThanOrEqual(844 * 0.8 + 0.1);

  await page.getByLabel("Primary legend").fill("U+2318");
  await page.getByLabel("Primary legend").blur();
  await page.getByRole("button", { name: "Close key editor" }).click();

  await expect(editor).toBeHidden();
  await expect(selectedPosition).toHaveAttribute("aria-pressed", "true");
  await expect(selectedPosition.locator("text").filter({ hasText: "⌘" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Fit" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.setViewportSize({ width: 900, height: 700 });
  await expect(page.getByRole("region", { name: "Docked key editor" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Keyboard canvas" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
