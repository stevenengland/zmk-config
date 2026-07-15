import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import { ZoomPanViewport } from "./ZoomPanViewport";

describe("ZoomPanViewport", () => {
  function dispatchPointer(target: Element, type: string, pointerId: number, clientX: number, clientY: number) {
    const event = new Event(type, { bubbles: true });
    Object.assign(event, { pointerId, clientX, clientY });
    fireEvent(target, event);
  }

  it("fits content to the viewport width", () => {
    // Given content twice as wide as its viewport
    render(
      <ZoomPanViewport ariaLabel="Edit layer viewport" fitWidth={1000}>
        <div>Board</div>
      </ZoomPanViewport>,
    );
    const viewport = screen.getByRole("region", { name: /edit layer viewport/i });
    Object.defineProperties(viewport, {
      clientWidth: { configurable: true, value: 500 },
    });

    // When Fit is pressed
    fireEvent.click(screen.getByRole("button", { name: /fit/i }));

    // Then the content zoom matches the available width
    expect(screen.getByRole("slider", { name: /zoom/i })).toHaveAttribute("aria-valuetext", "50%");
  });

  it("zooms in from the shared controls", () => {
    // Given a viewport at its default zoom
    render(
      <ZoomPanViewport ariaLabel="Edit layer viewport" fitWidth={1000}>
        <div>Board</div>
      </ZoomPanViewport>,
    );

    // When zoom in is pressed
    fireEvent.click(screen.getByRole("button", { name: /zoom in/i }));

    // Then the zoom increases by one step
    expect(screen.getByRole("slider", { name: /zoom/i })).toHaveAttribute("aria-valuetext", "110%");
  });

  it("zooms out from the shared controls", () => {
    // Given a viewport at its default zoom
    render(
      <ZoomPanViewport ariaLabel="Edit layer viewport" fitWidth={1000}>
        <div>Board</div>
      </ZoomPanViewport>,
    );

    // When zoom out is pressed
    fireEvent.click(screen.getByRole("button", { name: /zoom out/i }));

    // Then the zoom decreases by one step
    expect(screen.getByRole("slider", { name: /zoom/i })).toHaveAttribute("aria-valuetext", "90%");
  });

  it("anchors wheel zoom to the pointer", () => {
    // Given a scrolled viewport
    render(
      <ZoomPanViewport ariaLabel="Edit layer viewport" fitWidth={1000}>
        <div>Board</div>
      </ZoomPanViewport>,
    );
    const viewport = screen.getByRole("region", { name: /edit layer viewport/i });
    Object.defineProperties(viewport, {
      scrollLeft: { configurable: true, writable: true, value: 40 },
      scrollTop: { configurable: true, writable: true, value: 20 },
    });

    // When the user zooms at a pointer location
    const wheel = createEvent.wheel(viewport, { deltaY: -100, ctrlKey: true, clientX: 60, clientY: 40 });
    fireEvent(viewport, wheel);

    // Then zoom changes without moving the content beneath the pointer
    expect(wheel.defaultPrevented).toBe(true);
    expect(screen.getByRole("slider", { name: /zoom/i })).toHaveAttribute("aria-valuetext", "150%");
    expect(viewport.scrollLeft).toBe(90);
    expect(viewport.scrollTop).toBe(50);
  });

  it("pans the viewport with a single pointer", () => {
    // Given an unscrolled viewport
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

    // When a pointer drags across the viewport
    dispatchPointer(viewport, "pointerdown", 1, 100, 100);
    dispatchPointer(viewport, "pointermove", 1, 80, 70);

    // Then the viewport scroll follows the drag
    expect(viewport.scrollLeft).toBe(20);
    expect(viewport.scrollTop).toBe(30);
  });

  it("zooms around a two-pointer pinch", () => {
    // Given a viewport with two active pointers
    render(
      <ZoomPanViewport ariaLabel="Edit layer viewport" fitWidth={1000}>
        <div>Board</div>
      </ZoomPanViewport>,
    );
    const viewport = screen.getByRole("region", { name: /edit layer viewport/i });

    dispatchPointer(viewport, "pointerdown", 1, 0, 0);
    dispatchPointer(viewport, "pointerdown", 2, 100, 0);

    // When the pinch distance doubles
    dispatchPointer(viewport, "pointermove", 2, 200, 0);

    // Then zoom doubles around the gesture midpoint
    expect(screen.getByRole("slider", { name: /zoom/i })).toHaveAttribute("aria-valuetext", "200%");
  });
});
