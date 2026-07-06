import { fireEvent, render, screen } from "@testing-library/react";
import { App } from "./App";

describe("App", () => {
  it("mounts the keyboard board", () => {
    const { container } = render(<App />);
    expect(container.querySelector('svg[aria-label="Sofle Choc keyboard"]')).not.toBeNull();
  });

  it("boots with one default layer shown as the active tab", () => {
    render(<App />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(1);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
  });

  it("adds a new active layer when the add control is used", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /add layer/i }));

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(2);
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
  });
});
