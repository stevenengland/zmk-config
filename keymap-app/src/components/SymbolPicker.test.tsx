import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SymbolPicker, SYMBOL_FONT_FAMILY } from "./SymbolPicker";
import symbols from "../data/symbols.json";

const totalSymbols = symbols.categories.reduce(
  (sum, c) => sum + c.symbols.length,
  0,
);

describe("SymbolPicker", () => {
  it("renders every category from the data file", () => {
    render(<SymbolPicker onInsert={() => {}} />);

    for (const category of symbols.categories) {
      expect(screen.getByText(category.name)).toBeInTheDocument();
    }
    expect(symbols.categories).toHaveLength(6);
  });

  it("renders one insert control per symbol in the data file", () => {
    render(<SymbolPicker onInsert={() => {}} />);

    const buttons = screen.getAllByRole("button", { name: /^insert /i });
    expect(buttons).toHaveLength(totalSymbols);
  });

  it("emits the clicked glyph so new data entries need no code change", () => {
    const onInsert = vi.fn();
    render(<SymbolPicker onInsert={onInsert} />);

    // Drive from the data file rather than a hard-coded glyph: whatever the
    // first curated symbol is, clicking its control emits exactly it.
    const first = symbols.categories[0].symbols[0];
    fireEvent.click(screen.getByRole("button", { name: `Insert ${first}` }));

    expect(onInsert).toHaveBeenCalledWith(first);
  });

  it("renders glyphs with the embedded Noto Sans Symbols 2 subset", () => {
    const { container } = render(<SymbolPicker onInsert={() => {}} />);

    const style = container.querySelector("style");
    expect(style?.textContent).toContain("@font-face");
    expect(style?.textContent).toContain(SYMBOL_FONT_FAMILY);

    const first = symbols.categories[0].symbols[0];
    const button = screen.getByRole("button", { name: `Insert ${first}` });
    expect(button.style.fontFamily).toContain(SYMBOL_FONT_FAMILY);
  });
});
