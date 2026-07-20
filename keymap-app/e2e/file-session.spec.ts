import { expect, test } from "playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: false });
  });
});

test("saving an edited document clears unsaved state and confirms the operation", async ({ page }) => {
  // Given an untitled document with a canonical edit
  await page.goto("/");
  await page.getByRole("button", { name: "Add layer" }).click();
  await expect(page.getByText("Unsaved changes", { exact: false })).toBeVisible();

  // When the document is saved through the baseline download path
  await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Save" }).click(),
  ]);

  // Then the file identity and operation feedback show the saved state
  await expect(page.getByText("Unsaved changes", { exact: false })).toBeHidden();
  await expect(page.getByText("keymap.json", { exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Saved keymap");
});

test("a failed save stays announced until dismissed", async ({ page }) => {
  // Given a browser whose download boundary rejects the save
  await page.addInitScript(() => {
    URL.createObjectURL = () => {
      throw new Error("download blocked");
    };
  });
  await page.goto("/");

  // When Save is used
  await page.getByRole("button", { name: "Save" }).click();

  // Then the failure remains an accessible alert until explicitly dismissed
  const alert = page.getByRole("alert");
  await expect(alert).toContainText("Could not save file: download blocked");
  await page.getByRole("button", { name: "Dismiss notification" }).click();
  await expect(alert).toBeHidden();
});

test("unload protection follows canonical document content", async ({ page }) => {
  // Given a clean document
  await page.goto("/");

  // When the browser checks clean and then edited content
  const cleanUnloadAllowed = await page.evaluate(() =>
    window.dispatchEvent(new Event("beforeunload", { cancelable: true })),
  );
  await page.getByRole("button", { name: "Add layer" }).click();
  const dirtyUnloadAllowed = await page.evaluate(() =>
    window.dispatchEvent(new Event("beforeunload", { cancelable: true })),
  );

  // Then only the dirty document requests a warning
  expect(cleanUnloadAllowed).toBe(true);
  expect(dirtyUnloadAllowed).toBe(false);
});
