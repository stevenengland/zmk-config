import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { LayerTabs } from "./LayerTabs";
import type { Layer } from "../model/schema";

function layers(...names: string[]): Layer[] {
  return names.map((name) => ({ name, color: "#00e5ff", keys: {} }));
}

const noop = () => {};

const handlers = {
  onSelect: noop,
  onSelectOverview: noop,
  onAdd: noop,
  onRename: noop,
  onRecolor: noop,
  onDelete: noop,
  viewMode: "edit" as const,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("LayerTabs", () => {
  it("renders one tab per layer and marks the active one", () => {
    render(<LayerTabs {...handlers} layers={layers("Base", "Symbols")} activeIndex={1} />);

    const tabs = screen.getAllByRole("tab");
    // "Overview" is the first tab; the two layer tabs follow.
    expect(tabs).toHaveLength(3);
    expect(tabs[2]).toHaveAttribute("aria-selected", "true");
    expect(tabs[1]).toHaveAttribute("aria-selected", "false");
  });

  it("renders the Overview entry as the first item in the strip", () => {
    render(<LayerTabs {...handlers} layers={layers("Base", "Symbols")} activeIndex={0} />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]).toHaveTextContent("Overview");
  });

  it("enters overview mode when Overview is clicked", () => {
    const onSelectOverview = vi.fn();
    render(
      <LayerTabs
        {...handlers}
        onSelectOverview={onSelectOverview}
        layers={layers("Base", "Symbols")}
        activeIndex={0}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: /overview/i }));

    expect(onSelectOverview).toHaveBeenCalled();
  });

  it("marks Overview selected in overview mode and no layer tab selected", () => {
    render(
      <LayerTabs {...handlers} viewMode="overview" layers={layers("Base", "Symbols")} activeIndex={0} />,
    );

    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[1]).toHaveAttribute("aria-selected", "false");
    expect(tabs[2]).toHaveAttribute("aria-selected", "false");
  });

  it("selects a layer when its tab is clicked", () => {
    const onSelect = vi.fn();
    render(<LayerTabs {...handlers} onSelect={onSelect} layers={layers("Base", "Symbols")} activeIndex={0} />);

    fireEvent.click(screen.getByRole("tab", { name: /Symbols/ }));

    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it("keeps the active layer tab visible when selection changes", () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    const { rerender } = render(
      <LayerTabs {...handlers} layers={layers("Base", "Symbols", "Navigation")} activeIndex={0} />,
    );
    scrollIntoView.mockClear();

    rerender(<LayerTabs {...handlers} layers={layers("Base", "Symbols", "Navigation")} activeIndex={2} />);

    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest", inline: "nearest" });
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollIntoView;
  });

  it("adds a layer via the add control", () => {
    const onAdd = vi.fn();
    render(<LayerTabs {...handlers} onAdd={onAdd} layers={layers("Base")} activeIndex={0} />);

    fireEvent.click(screen.getByRole("button", { name: /add layer/i }));

    expect(onAdd).toHaveBeenCalled();
  });

  it("keeps the active layer unchanged when editing is cancelled", () => {
    const onRename = vi.fn();
    const onRecolor = vi.fn();
    render(
      <LayerTabs
        {...handlers}
        onRename={onRename}
        onRecolor={onRecolor}
        layers={layers("Base")}
        activeIndex={0}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /layer actions/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /edit layer/i }));
    const dialog = screen.getByRole("dialog", { name: /edit layer/i });
    fireEvent.change(within(dialog).getByLabelText(/layer name/i), { target: { value: "Nav" } });
    fireEvent.change(within(dialog).getByLabelText(/layer color/i), { target: { value: "#ff0000" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /cancel/i }));

    expect(screen.queryByRole("dialog", { name: /edit layer/i })).not.toBeInTheDocument();
    expect(onRename).not.toHaveBeenCalled();
    expect(onRecolor).not.toHaveBeenCalled();
  });

  it("commits the active layer name and color together", () => {
    const onRename = vi.fn();
    const onRecolor = vi.fn();
    render(
      <LayerTabs
        {...handlers}
        onRename={onRename}
        onRecolor={onRecolor}
        layers={layers("Base")}
        activeIndex={0}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /layer actions/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /edit layer/i }));
    const dialog = screen.getByRole("dialog", { name: /edit layer/i });
    fireEvent.change(within(dialog).getByLabelText(/layer name/i), { target: { value: "Nav" } });
    fireEvent.change(within(dialog).getByLabelText(/layer color/i), { target: { value: "#ff0000" } });

    fireEvent.click(within(dialog).getByRole("button", { name: /save changes/i }));

    expect(onRename).toHaveBeenCalledWith(0, "Nav");
    expect(onRecolor).toHaveBeenCalledWith(0, "#ff0000");
    expect(screen.queryByRole("dialog", { name: /edit layer/i })).not.toBeInTheDocument();
  });

  it("deletes the active layer only after confirmation", () => {
    const onDelete = vi.fn();
    render(<LayerTabs {...handlers} onDelete={onDelete} layers={layers("Base", "Symbols")} activeIndex={1} />);

    fireEvent.click(screen.getByRole("button", { name: /layer actions/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /delete layer/i }));
    const confirmation = screen.getByRole("alertdialog", { name: /delete layer/i });
    expect(confirmation).toHaveTextContent('Delete layer "Symbols"?');
    fireEvent.click(within(confirmation).getByRole("button", { name: /^delete layer$/i }));

    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it("names the layer and reference impact before deletion", () => {
    render(<LayerTabs {...handlers} layers={layers("Base", "Symbols")} activeIndex={1} />);

    fireEvent.click(screen.getByRole("button", { name: /layer actions/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /delete layer/i }));

    const confirmation = screen.getByRole("alertdialog", { name: /delete layer/i });
    expect(confirmation).toHaveTextContent('Delete layer "Symbols"?');
    expect(confirmation).toHaveTextContent(/references to this layer will be removed/i);
  });

  it("keeps the layer when deletion is cancelled", () => {
    const onDelete = vi.fn();
    render(<LayerTabs {...handlers} onDelete={onDelete} layers={layers("Base", "Symbols")} activeIndex={1} />);

    fireEvent.click(screen.getByRole("button", { name: /layer actions/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /delete layer/i }));
    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(onDelete).not.toHaveBeenCalled();
  });

  it("disables delete on the last remaining layer", () => {
    render(<LayerTabs {...handlers} layers={layers("Base")} activeIndex={0} />);

    fireEvent.click(screen.getByRole("button", { name: /layer actions/i }));
    expect(screen.getByRole("menuitem", { name: /delete layer/i })).toBeDisabled();
  });

  it("explains why the last remaining layer cannot be deleted", () => {
    render(<LayerTabs {...handlers} layers={layers("Base")} activeIndex={0} />);

    fireEvent.click(screen.getByRole("button", { name: /layer actions/i }));

    expect(screen.getByRole("menu", { name: /layer actions/i })).toHaveTextContent(/one layer is required/i);
  });
});
