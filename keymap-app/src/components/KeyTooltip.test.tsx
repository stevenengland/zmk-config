import { render, screen } from "@testing-library/react";
import { KeyTooltip } from "./KeyTooltip";

const anchorRect = { top: 10, left: 20, bottom: 30, right: 40 };

/** Stubs the tooltip's own measured size and the viewport, restored by the caller. */
function stubViewport(tooltipSize: { width: number; height: number }, viewport: { width: number; height: number }) {
  const original = HTMLElement.prototype.getBoundingClientRect;
  HTMLElement.prototype.getBoundingClientRect = function () {
    return { ...tooltipSize, top: 0, left: 0, bottom: tooltipSize.height, right: tooltipSize.width, x: 0, y: 0, toJSON() {} };
  };
  const widthDescriptor = Object.getOwnPropertyDescriptor(window, "innerWidth");
  const heightDescriptor = Object.getOwnPropertyDescriptor(window, "innerHeight");
  Object.defineProperty(window, "innerWidth", { value: viewport.width, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: viewport.height, configurable: true });
  return () => {
    HTMLElement.prototype.getBoundingClientRect = original;
    if (widthDescriptor) Object.defineProperty(window, "innerWidth", widthDescriptor);
    if (heightDescriptor) Object.defineProperty(window, "innerHeight", heightDescriptor);
  };
}

describe("KeyTooltip", () => {
  it("explains the position and empty state for a key with no legends", () => {
    // Given a board position with no configured legend or behavior
    render(
      <KeyTooltip keyId="L-r0-c0" legend={{}} macros={{}} layers={[]} anchorRect={anchorRect} />,
    );

    // Then the tooltip identifies the position and its empty state
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("Left · row 1 · col 1");
    expect(tooltip).toHaveTextContent("legendEmpty");
    expect(tooltip).toHaveTextContent("behaviorNone");
  });

  it("never intercepts pointer events, so it can never block clicking or selecting the key", () => {
    render(
      <KeyTooltip
        keyId="L-r0-c0"
        legend={{ primary: "a" }}
        macros={{}}
        layers={[]}
        anchorRect={anchorRect}
      />,
    );

    expect(screen.getByRole("tooltip")).toHaveStyle({ pointerEvents: "none" });
  });

  it("flips above the key when the tooltip would overflow the viewport bottom", () => {
    const restore = stubViewport({ width: 150, height: 80 }, { width: 1000, height: 800 });
    try {
      const nearBottom = { top: 700, left: 20, bottom: 780, right: 60 };
      render(
        <KeyTooltip keyId="L-r0-c0" legend={{ primary: "a" }} macros={{}} layers={[]} anchorRect={nearBottom} />,
      );

      // 780 + 6 + 80 = 866 > 800: flips to sit above the key instead.
      expect(screen.getByRole("tooltip")).toHaveStyle({ top: "614px" });
    } finally {
      restore();
    }
  });

  it("clamps the left edge when the tooltip would overflow the viewport right", () => {
    const restore = stubViewport({ width: 200, height: 80 }, { width: 1000, height: 800 });
    try {
      const nearRight = { top: 10, left: 900, bottom: 30, right: 940 };
      render(
        <KeyTooltip keyId="L-r0-c0" legend={{ primary: "a" }} macros={{}} layers={[]} anchorRect={nearRight} />,
      );

      // 900 + 200 = 1100 > 1000: clamps so the tooltip's right edge stays on screen.
      expect(screen.getByRole("tooltip")).toHaveStyle({ left: "794px" });
    } finally {
      restore();
    }
  });

  it("keeps the default below-and-left-aligned position when it fits the viewport", () => {
    const restore = stubViewport({ width: 100, height: 40 }, { width: 1000, height: 800 });
    try {
      render(
        <KeyTooltip keyId="L-r0-c0" legend={{ primary: "a" }} macros={{}} layers={[]} anchorRect={anchorRect} />,
      );

      expect(screen.getByRole("tooltip")).toHaveStyle({ left: "20px", top: "36px" });
    } finally {
      restore();
    }
  });
});
