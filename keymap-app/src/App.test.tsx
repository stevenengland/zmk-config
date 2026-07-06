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

  it("binds the editor to a clicked key and renders a committed legend on the board", () => {
    const { container } = render(<App />);

    fireEvent.click(container.querySelector('[data-key-id="L-r0-c0"]')!);
    expect(screen.getByRole("heading", { name: "L-r0-c0" })).toBeInTheDocument();

    const input = screen.getByLabelText(/primary legend/i);
    fireEvent.change(input, { target: { value: "U+2318" } });
    fireEvent.blur(input);

    const legend = Array.from(container.querySelectorAll("text")).map((t) => t.textContent);
    expect(legend).toContain("⌘");
  });

  it("reports an invalid codepoint on the status bar", () => {
    const { container } = render(<App />);

    fireEvent.click(container.querySelector('[data-key-id="L-r0-c0"]')!);
    const input = screen.getByLabelText(/primary legend/i);
    fireEvent.change(input, { target: { value: "U+ZZZZ" } });
    fireEvent.blur(input);

    expect(screen.getByRole("status")).toHaveTextContent(/invalid codepoint/i);
  });
});
