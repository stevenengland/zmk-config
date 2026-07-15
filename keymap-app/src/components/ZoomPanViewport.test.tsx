import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import { ZoomPanViewport } from "./ZoomPanViewport";

describe("ZoomPanViewport", () => {
  function dispatchPointer(target: Element, type: string, pointerId: number, clientX: number, clientY: number) {
    const event = new Event(type, { bubbles: true });
    Object.assign(event, { pointerId, clientX, clientY });
    fireEvent(target, event);
  }

  it("provides shared Fit and zoom controls with pointer-anchored wheel zoom", () => {
    render(
      <ZoomPanViewport ariaLabel="Edit layer viewport" fitWidth={1000}>
        <div>Board</div>
      </ZoomPanViewport>,
    );
    const viewport = screen.getByRole("region", { name: /edit layer viewport/i });
    Object.defineProperties(viewport, {
      clientWidth: { configurable: true, value: 500 },
      scrollLeft: { configurable: true, writable: true, value: 40 },
      scrollTop: { configurable: true, writable: true, value: 20 },
    });

    fireEvent.click(screen.getByRole("button", { name: /fit/i }));
    expect(screen.getByRole("slider", { name: /zoom/i })).toHaveAttribute("aria-valuetext", "50%");

    const wheel = createEvent.wheel(viewport, { deltaY: -100, ctrlKey: true, clientX: 60, clientY: 40 });
    fireEvent(viewport, wheel);

    expect(wheel.defaultPrevented).toBe(true);
    expect(screen.getByRole("slider", { name: /zoom/i })).toHaveAttribute("aria-valuetext", "100%");
    expect(viewport.scrollLeft).toBe(100);
    expect(viewport.scrollTop).toBe(60);
  });

  it("pans the viewport with a single pointer", () => {
    render(
      <ZoomPanViewport ariaLabel="Edit layer viewport" fitWidth={1000}>
        <div>Board</div>
      </ZoomPanViewport>,
    );
    const viewport = screen.getByRole("region", { name: /edit layer viewport/i });
    Object.defineProperties(viewport, {
      scrollLeft: { configurable: true, writable: true, value: 0 },
      scrollTop: { configurable: true, writable: true, value: 0 },
    });

    dispatchPointer(viewport, "pointerdown", 1, 100, 100);
    dispatchPointer(viewport, "pointermove", 1, 80, 70);

    expect(viewport.scrollLeft).toBe(20);
    expect(viewport.scrollTop).toBe(30);
  });

  it("zooms around a two-pointer pinch", () => {
    render(
      <ZoomPanViewport ariaLabel="Edit layer viewport" fitWidth={1000}>
        <div>Board</div>
      </ZoomPanViewport>,
    );
    const viewport = screen.getByRole("region", { name: /edit layer viewport/i });

    dispatchPointer(viewport, "pointerdown", 1, 0, 0);
    dispatchPointer(viewport, "pointerdown", 2, 100, 0);
    dispatchPointer(viewport, "pointermove", 2, 200, 0);

    expect(screen.getByRole("slider", { name: /zoom/i })).toHaveAttribute("aria-valuetext", "200%");
  });
});
