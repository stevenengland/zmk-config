import { render, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Keycap } from "./Keycap";
import type { BoardElement } from "../model/geometry";
import {
  boxOf,
  holdUnderlineRect,
  homingBarRect,
  KEY_EDGE_ACCENT_WIDTH,
  KEY_STROKE,
  layerTickPath,
  macroChipRect,
  SYMBOL_FONT_FAMILY,
  tapRowY,
} from "../model/renderStyle";

const key: BoardElement = { id: "L-r0-c0", kind: "key", x: 0, y: 0, w: 54, h: 54 };
const encoder: BoardElement = { id: "L-enc", kind: "encoder", x: 100, y: 100, w: 62, h: 62 };

function svg(child: React.ReactNode) {
  return render(<svg>{child}</svg>);
}

describe("Keycap legends", () => {
  it("renders committed slot text in its corner and nothing for empty slots", () => {
    const { container } = svg(
      <Keycap element={key} legend={{ primary: "A", shifted: "!" }} />,
    );

    const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent);
    expect(texts).toContain("A");
    expect(texts).toContain("!");
    // altgr unset → no third legend; top-right is never rendered
    expect(texts).toHaveLength(2);
  });

  it("positions primary bottom-left larger, shifted top-left, altgr bottom-right", () => {
    const { container } = svg(
      <Keycap element={key} legend={{ primary: "A", shifted: "S", altgr: "G" }} />,
    );
    const byText = (t: string) =>
      Array.from(container.querySelectorAll("text")).find((el) => el.textContent === t)!;

    const primary = byText("A");
    const shifted = byText("S");
    const altgr = byText("G");

    // primary is the larger legend
    expect(Number(primary.getAttribute("font-size"))).toBeGreaterThan(
      Number(shifted.getAttribute("font-size")),
    );
    // primary bottom-left vs shifted top-left: same x anchor, primary lower
    expect(primary.getAttribute("x")).toBe(shifted.getAttribute("x"));
    expect(Number(primary.getAttribute("y"))).toBeGreaterThan(Number(shifted.getAttribute("y")));
    // altgr bottom-right: further right than primary, end-anchored
    expect(Number(altgr.getAttribute("x"))).toBeGreaterThan(Number(primary.getAttribute("x")));
    expect(altgr.getAttribute("text-anchor")).toBe("end");
  });

  it("renders legend text through the embedded symbol font, matching SVG export", () => {
    const { container } = svg(<Keycap element={key} legend={{ primary: "A" }} />);

    expect(container.querySelector("text")!.getAttribute("font-family")).toContain(
      SYMBOL_FONT_FAMILY,
    );
  });

  it("colors the primary legend with the per-key color", () => {
    const { container } = svg(
      <Keycap element={key} legend={{ primary: "A", color: "#fec931" }} />,
    );

    expect(container.querySelector("text")!.getAttribute("fill")).toBe("#fec931");
  });

  it("selects on click and marks the pressed state", () => {
    const onSelect = vi.fn();
    const { container } = svg(<Keycap element={key} onSelect={onSelect} selected />);

    const group = container.querySelector("[data-key-id]")!;
    fireEvent.click(group);

    expect(onSelect).toHaveBeenCalledWith("L-r0-c0");
    expect(group).toHaveAttribute("aria-pressed", "true");
  });

  it("renders and selects encoders exactly like keys", () => {
    const onSelect = vi.fn();
    const { container } = svg(
      <Keycap element={encoder} legend={{ primary: "V" }} onSelect={onSelect} />,
    );

    fireEvent.click(container.querySelector("[data-encoder-id]")!);

    expect(onSelect).toHaveBeenCalledWith("L-enc");
    expect(container.querySelector("text")!.textContent).toBe("V");
  });

  it("paints the layer color as a corner tick over the top-right border, with no in-cap dot", () => {
    const { container } = svg(<Keycap element={key} layerColor="#00e5ff" />);
    const group = container.querySelector("[data-key-id]")!;

    expect(group.querySelector("circle")).toBeNull();

    const tick = Array.from(group.querySelectorAll("path")).find(
      (p) => p.getAttribute("stroke") === "#00e5ff",
    )!;
    expect(tick).toBeTruthy();
    expect(tick.getAttribute("d")).toBe(layerTickPath(boxOf(key)));
    expect(tick.getAttribute("fill")).toBe("none");
    expect(tick.getAttribute("stroke-width")).toBe(String(KEY_EDGE_ACCENT_WIDTH));
  });

  it("renders no corner tick when no layer color is given", () => {
    const { container } = svg(<Keycap element={key} />);
    const group = container.querySelector("[data-key-id]")!;

    const tickPath = layerTickPath(boxOf(key));
    expect(Array.from(group.querySelectorAll("path")).some((p) => p.getAttribute("d") === tickPath)).toBe(
      false,
    );
  });

  it("never renders a corner tick on encoders, even with a layer color", () => {
    const { container } = svg(<Keycap element={encoder} layerColor="#00e5ff" />);
    const group = container.querySelector("[data-encoder-id]")!;

    expect(group.querySelectorAll("path")).toHaveLength(0);
  });

  it("renders the homing bar on the bottom edge in the key-stroke steel tone when homing", () => {
    const { container } = svg(<Keycap element={key} homing />);
    const group = container.querySelector("[data-key-id]")!;
    const rect = group.querySelector(`rect[fill="${KEY_STROKE}"]`)!;
    const expected = homingBarRect(boxOf(key));

    expect(rect).toBeTruthy();
    expect(rect.getAttribute("x")).toBe(String(expected.x));
    expect(rect.getAttribute("y")).toBe(String(expected.y));
    expect(rect.getAttribute("width")).toBe(String(expected.width));
    expect(rect.getAttribute("height")).toBe(String(expected.height));
  });

  it("renders no homing bar when not homing", () => {
    const { container } = svg(<Keycap element={key} />);
    const group = container.querySelector("[data-key-id]")!;

    expect(group.querySelector(`rect[fill="${KEY_STROKE}"]`)).toBeNull();
  });

  it("never renders a homing bar on encoders, even when marked homing", () => {
    const { container } = svg(<Keycap element={encoder} homing />);
    const group = container.querySelector("[data-encoder-id]")!;

    expect(group.querySelector(`rect[fill="${KEY_STROKE}"]`)).toBeNull();
  });

  it("renders the hold glyph end-aligned top-right with a solid underline", () => {
    const { container } = svg(
      <Keycap element={key} legend={{ primary: "a", hold: { glyph: "ä" } }} />,
    );
    const group = container.querySelector("[data-key-id]")!;

    const holdText = Array.from(group.querySelectorAll("text")).find((t) => t.textContent === "ä")!;
    expect(holdText).toBeTruthy();
    expect(holdText.getAttribute("text-anchor")).toBe("end");
    expect(holdText.getAttribute("dominant-baseline")).toBe("hanging");

    const expected = holdUnderlineRect(boxOf(key));
    const underline = group.querySelector(`rect[x="${expected.x}"][y="${expected.y}"]`)!;
    expect(underline).toBeTruthy();
    expect(underline.getAttribute("width")).toBe(String(expected.width));
    expect(underline.getAttribute("height")).toBe(String(expected.height));
  });

  it("renders no hold row when the key has no hold glyph", () => {
    const { container } = svg(<Keycap element={key} legend={{ primary: "a" }} />);
    const group = container.querySelector("[data-key-id]")!;

    const expected = holdUnderlineRect(boxOf(key));
    expect(group.querySelector(`rect[x="${expected.x}"][y="${expected.y}"]`)).toBeNull();
  });

  it("renders a layer-tap hold as the target layer's name, tinted in its color", () => {
    const layers = [
      { name: "Base", color: "#00e5ff", keys: {} },
      { name: "Nav", color: "#fec931", keys: {} },
    ];
    const { container } = svg(
      <Keycap element={key} legend={{ hold: { layer: "Nav" } }} layers={layers} />,
    );
    const group = container.querySelector("[data-key-id]")!;

    const holdText = Array.from(group.querySelectorAll("text")).find((t) => t.textContent === "Nav")!;
    expect(holdText).toBeTruthy();
    expect(holdText.getAttribute("fill")).toBe("#fec931");

    const underline = group.querySelector(`rect[fill="#fec931"]`)!;
    expect(underline).toBeTruthy();
  });

  it("clicking a layer-tap hold legend jumps to that layer without selecting the key", () => {
    const layers = [
      { name: "Base", color: "#00e5ff", keys: {} },
      { name: "Nav", color: "#fec931", keys: {} },
    ];
    const onJumpToLayer = vi.fn();
    const onSelect = vi.fn();
    const { container } = svg(
      <Keycap
        element={key}
        legend={{ hold: { layer: "Nav" } }}
        layers={layers}
        onJumpToLayer={onJumpToLayer}
        onSelect={onSelect}
      />,
    );

    const holdText = Array.from(container.querySelectorAll("text")).find((t) => t.textContent === "Nav")!;
    fireEvent.click(holdText);

    expect(onJumpToLayer).toHaveBeenCalledWith("Nav");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("does not treat a plain glyph hold as clickable", () => {
    const onJumpToLayer = vi.fn();
    const { container } = svg(
      <Keycap element={key} legend={{ hold: { glyph: "ä" } }} onJumpToLayer={onJumpToLayer} />,
    );

    const holdText = Array.from(container.querySelectorAll("text")).find((t) => t.textContent === "ä")!;
    fireEvent.click(holdText);

    expect(onJumpToLayer).not.toHaveBeenCalled();
  });

  it("renders a tap-dance row below the hold row, dot-prefixed by its count", () => {
    const { container } = svg(
      <Keycap element={key} legend={{ primary: "⇧", hold: { glyph: "ä" }, taps: [{ count: 2, glyph: "⇪" }] }} />,
    );
    const group = container.querySelector("[data-key-id]")!;

    const tapText = Array.from(group.querySelectorAll("text")).find((t) => t.textContent === "··⇪")!;
    expect(tapText).toBeTruthy();
    expect(tapText.getAttribute("text-anchor")).toBe("end");
    expect(tapText.getAttribute("dominant-baseline")).toBe("hanging");
    expect(tapText.getAttribute("y")).toBe(String(tapRowY(boxOf(key), 0, true)));
  });

  it("renders one row per tap count, ascending", () => {
    const { container } = svg(
      <Keycap
        element={key}
        legend={{
          primary: "⇧",
          taps: [
            { count: 3, glyph: "⇧" },
            { count: 2, glyph: "⇪" },
          ],
        }}
      />,
    );
    const group = container.querySelector("[data-key-id]")!;

    const rowTop = Array.from(group.querySelectorAll("text")).find((t) => t.textContent === "··⇪")!;
    const rowBottom = Array.from(group.querySelectorAll("text")).find((t) => t.textContent === "···⇧")!;
    expect(Number(rowTop.getAttribute("y"))).toBeLessThan(Number(rowBottom.getAttribute("y")));
  });

  it("suffixes a toggle tap row with the hollow ring", () => {
    const { container } = svg(
      <Keycap element={key} legend={{ primary: "⇧", taps: [{ count: 2, glyph: "⇧", toggle: true }] }} />,
    );

    const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent);
    expect(texts).toContain("··⇧◦");
  });

  it("renders no tap rows for a key with no taps", () => {
    const { container } = svg(<Keycap element={key} legend={{ primary: "a" }} />);

    const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent);
    expect(texts.some((t) => t?.includes("·"))).toBe(false);
  });

  it("renders a macro-bound key's glyph in place of primary, wrapped in a dashed chip", () => {
    const macros = { copy: { glyph: "⌃C", label: "Copy", steps: "hold Ctrl · tap C" } };
    const { container } = svg(
      <Keycap element={key} legend={{ macro: "copy" }} macros={macros} />,
    );
    const group = container.querySelector("[data-key-id]")!;

    const primary = Array.from(group.querySelectorAll("text")).find((t) => t.textContent === "⌃C")!;
    expect(primary).toBeTruthy();

    const expected = macroChipRect("⌃C", boxOf(key));
    const chip = group.querySelector(`rect[x="${expected.x}"][y="${expected.y}"]`)!;
    expect(chip).toBeTruthy();
    expect(chip.getAttribute("width")).toBe(String(expected.width));
    expect(chip.getAttribute("height")).toBe(String(expected.height));
    expect(chip.getAttribute("fill")).toBe("none");
    expect(chip.getAttribute("stroke-dasharray")).toBeTruthy();
  });

  it("sizes the macro chip by code points, so an astral-plane glyph is one unit wide, not two", () => {
    const box = boxOf(key);
    // 📋 (U+1F4CB) is a surrogate pair — String.length counts it as 2.
    expect(macroChipRect("📋", box).width).toBe(macroChipRect("a", box).width);
  });

  it("renders no macro chip for a key with no macro reference", () => {
    const { container } = svg(<Keycap element={key} legend={{ primary: "a" }} />);
    const group = container.querySelector("[data-key-id]")!;

    const expected = macroChipRect("a", boxOf(key));
    expect(group.querySelector(`rect[x="${expected.x}"][y="${expected.y}"]`)).toBeNull();
  });

  it("falls back to no primary text when a macro reference doesn't resolve in the registry", () => {
    const { container } = svg(<Keycap element={key} legend={{ macro: "missing" }} macros={{}} />);
    const group = container.querySelector("[data-key-id]")!;

    expect(group.querySelectorAll("text")).toHaveLength(0);
  });
});
