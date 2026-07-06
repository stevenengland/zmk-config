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

  it("starts with undo/redo disabled and enables undo after an edit", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: /undo/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /redo/i })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /add layer/i }));

    expect(screen.getByRole("button", { name: /undo/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /redo/i })).toBeDisabled();
  });

  it("undoes and redoes a layer add via Ctrl+Z / Ctrl+Shift+Z", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /add layer/i }));
    expect(screen.getAllByRole("tab")).toHaveLength(2);

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(screen.getAllByRole("tab")).toHaveLength(1);

    fireEvent.keyDown(window, { key: "z", ctrlKey: true, shiftKey: true });
    expect(screen.getAllByRole("tab")).toHaveLength(2);
  });

  it("undoes the same edit via the toolbar button as via the keyboard shortcut", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /add layer/i }));
    fireEvent.click(screen.getByRole("button", { name: /^undo$/i }));

    expect(screen.getAllByRole("tab")).toHaveLength(1);
  });

  it("clears the redo stack once a new edit follows an undo", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /add layer/i }));
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    fireEvent.click(screen.getByRole("button", { name: /add layer/i }));

    expect(screen.getByRole("button", { name: /redo/i })).toBeDisabled();
  });

  it("leaves a focused text field's own undo alone instead of hijacking Ctrl+Z", () => {
    const { container } = render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /add layer/i }));
    fireEvent.click(container.querySelector('[data-key-id="L-r0-c0"]')!);
    const input = screen.getByLabelText(/primary legend/i);

    fireEvent.keyDown(input, { key: "z", ctrlKey: true });

    // The layer add is still on the undo stack — the shortcut didn't fire
    // while focus was inside a text field.
    expect(screen.getAllByRole("tab")).toHaveLength(2);
  });
});
