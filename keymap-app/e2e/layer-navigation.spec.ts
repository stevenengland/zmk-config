import { expect, test } from "playwright/test";

test("compact layer controls keep the active tab reachable without page overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const addLayer = page.getByRole("button", { name: "Add layer" });
  const layerActions = page.getByRole("button", { name: "Layer actions" });
  for (let count = 0; count < 6; count += 1) await addLayer.click();

  const addBounds = await addLayer.boundingBox();
  const actionBounds = await layerActions.boundingBox();
  expect(addBounds).not.toBeNull();
  expect(actionBounds).not.toBeNull();
  expect(addBounds!.width).toBeLessThanOrEqual(48);
  expect(actionBounds!.width).toBeLessThanOrEqual(48);

  const activeTab = page.getByRole("tab", { name: "Layer 7" });
  await expect(activeTab).toHaveAttribute("aria-selected", "true");
  await expect(activeTab).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
