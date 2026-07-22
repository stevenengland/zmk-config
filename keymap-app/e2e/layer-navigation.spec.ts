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

test("editing a layer updates its tab and board together", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Layer actions" }).click();
  await page.getByRole("menuitem", { name: "Edit layer" }).click();

  const dialog = page.getByRole("dialog", { name: "Edit layer" });
  await dialog.getByRole("textbox", { name: "Layer name" }).fill("Navigation");
  await dialog.getByLabel("Layer color").fill("#ff3366");
  await dialog.getByRole("button", { name: "Save changes" }).click();

  await expect(page.getByRole("tab", { name: "Navigation" })).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("region", { name: "Keyboard canvas" }).locator('path[stroke="#ff3366"]').first(),
  ).toBeVisible();
});

test("deleting a layer names its impact and only removes it after confirmation", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add layer" }).click();

  const actions = page.getByRole("button", { name: "Layer actions" });
  await actions.click();
  await page.getByRole("menuitem", { name: "Delete layer" }).click();

  const dialog = page.getByRole("alertdialog", { name: 'Delete layer "Layer 2"?' });
  await expect(dialog).toContainText("assignments and references");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("tab", { name: "Layer 2" })).toBeVisible();

  await actions.click();
  await page.getByRole("menuitem", { name: "Delete layer" }).click();
  await page
    .getByRole("alertdialog", { name: 'Delete layer "Layer 2"?' })
    .getByRole("button", { name: "Delete layer" })
    .click();
  await expect(page.getByRole("tab", { name: "Layer 2" })).toHaveCount(0);
});
