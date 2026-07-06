import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { LayerTabs } from "./LayerTabs";
import type { Layer } from "../model/schema";

function layers(...names: string[]): Layer[] {
  return names.map((name) => ({ name, color: "#00e5ff", keys: {} }));
}

const noop = () => {};

const handlers = {
  onSelect: noop,
  onAdd: noop,
  onRename: noop,
  onRecolor: noop,
  onDelete: noop,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("LayerTabs", () => {
  it("renders one tab per layer and marks the active one", () => {
    render(<LayerTabs {...handlers} layers={layers("Base", "Symbols")} activeIndex={1} />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(2);
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
    expect(tabs[0]).toHaveAttribute("aria-selected", "false");
  });

  it("selects a layer when its tab is clicked", () => {
    const onSelect = vi.fn();
    render(<LayerTabs {...handlers} onSelect={onSelect} layers={layers("Base", "Symbols")} activeIndex={0} />);

    fireEvent.click(screen.getByRole("tab", { name: /Symbols/ }));

    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it("adds a layer via the add control", () => {
    const onAdd = vi.fn();
    render(<LayerTabs {...handlers} onAdd={onAdd} layers={layers("Base")} activeIndex={0} />);

    fireEvent.click(screen.getByRole("button", { name: /add layer/i }));

    expect(onAdd).toHaveBeenCalled();
  });

  it("renames the active layer when its name field changes", () => {
    const onRename = vi.fn();
    render(<LayerTabs {...handlers} onRename={onRename} layers={layers("Base")} activeIndex={0} />);

    fireEvent.change(screen.getByLabelText(/layer name/i), { target: { value: "Nav" } });

    expect(onRename).toHaveBeenCalledWith(0, "Nav");
  });

  it("recolors the active layer when its color field changes", () => {
    const onRecolor = vi.fn();
    render(<LayerTabs {...handlers} onRecolor={onRecolor} layers={layers("Base")} activeIndex={0} />);

    fireEvent.change(screen.getByLabelText(/layer color/i), { target: { value: "#ff0000" } });

    expect(onRecolor).toHaveBeenCalledWith(0, "#ff0000");
  });

  it("deletes the active layer only after confirmation", () => {
    const onDelete = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<LayerTabs {...handlers} onDelete={onDelete} layers={layers("Base", "Symbols")} activeIndex={1} />);

    fireEvent.click(screen.getByRole("button", { name: /delete layer/i }));

    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it("keeps the layer when deletion is cancelled", () => {
    const onDelete = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<LayerTabs {...handlers} onDelete={onDelete} layers={layers("Base", "Symbols")} activeIndex={1} />);

    fireEvent.click(screen.getByRole("button", { name: /delete layer/i }));

    expect(onDelete).not.toHaveBeenCalled();
  });

  it("disables delete on the last remaining layer", () => {
    render(<LayerTabs {...handlers} layers={layers("Base")} activeIndex={0} />);

    expect(screen.getByRole("button", { name: /delete layer/i })).toBeDisabled();
  });
});
