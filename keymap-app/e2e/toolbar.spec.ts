import { expect, test } from "playwright/test";

for (const width of [1280, 640, 390]) {
  test(`global toolbar stays usable without document overflow at ${width}px`, async ({ page }) => {
    // Given the app at a representative desktop, boundary, or phone viewport
    await page.setViewportSize({ width, height: 720 });
    await page.goto("/");

    // When the user opens the responsive action menu from the keyboard
    const toolbar = page.getByRole("toolbar", { name: "Global controls" });
    const menuTrigger = toolbar.getByRole("button", { name: width < 640 ? "More" : "Export" });
    await menuTrigger.focus();
    await menuTrigger.press("Enter");

    // Then Save and every rendered control remain focused, unwrapped, and unclipped
    await expect(toolbar.getByRole("button", { name: "Save" })).toBeVisible();
    const geometry = await toolbar.evaluate((element) => {
      const toolbarRect = element.getBoundingClientRect();
      const controls = Array.from(element.querySelectorAll("button")).filter(
        (control) => !control.closest('[role="menu"]'),
      );
      const firstControlTop = controls[0]?.getBoundingClientRect().top;
      return {
        documentFits: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        controlsFit: controls.every((control) => {
          const rect = control.getBoundingClientRect();
          return rect.left >= toolbarRect.left && rect.right <= toolbarRect.right;
        }),
        controlsStayInOneRow: controls.every((control) => control.getBoundingClientRect().top === firstControlTop),
      };
    });
    expect(geometry).toEqual({ documentFits: true, controlsFit: true, controlsStayInOneRow: true });
    await expect(page.getByRole("menu", { name: width < 640 ? "More" : "Export" }).getByRole("menuitem").first()).toBeFocused();
  });
}
