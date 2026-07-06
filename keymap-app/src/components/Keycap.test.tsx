import { render, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Keycap } from "./Keycap";
import type { BoardElement } from "../model/geometry";
import { SYMBOL_FONT_FAMILY } from "../model/renderStyle";

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
});
