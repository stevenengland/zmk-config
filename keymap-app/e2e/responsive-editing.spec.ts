import { expect, test } from "playwright/test";

test("mobile editing preserves selection without document overflow", async ({ page }) => {
  // Given the app at a phone viewport
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  // When a board position is edited through the modal sheet
  const selectedPosition = page.locator('[data-key-id="L-r0-c0"]');
  await selectedPosition.click();
  const editor = page.getByRole("dialog", { name: "Key editor" });
  await expect(editor).toBeVisible();
  expect(await editor.evaluate((element) => element.getBoundingClientRect().height)).toBeLessThanOrEqual(844 * 0.8 + 0.1);

  await page.getByLabel("Primary legend").fill("U+2318");
  await page.getByLabel("Primary legend").blur();
  await page.getByRole("button", { name: "Close key editor" }).click();

  // Then the edit and selection remain visible with reachable controls and no overflow
  await expect(editor).toBeHidden();
  await expect(selectedPosition).toHaveAttribute("aria-pressed", "true");
  await expect(selectedPosition.locator("text").filter({ hasText: "⌘" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Fit" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("desktop editing docks beside a non-collapsed canvas", async ({ page }) => {
  // When the app loads at the desktop boundary
  await page.setViewportSize({ width: 900, height: 700 });
  await page.goto("/");

  // Then the docked editor and canvas remain visible without document overflow
  await expect(page.getByRole("region", { name: "Docked key editor" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Keyboard canvas" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
