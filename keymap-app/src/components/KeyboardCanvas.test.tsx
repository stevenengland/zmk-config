import { act, render, fireEvent, screen } from "@testing-library/react";
import { KeyboardCanvas } from "./KeyboardCanvas";

describe("KeyboardCanvas", () => {
  it("one Tab enters the board and keyboard activation selects the focused position", () => {
    // Given a board with one roving Tab stop
    const onSelectKey = vi.fn();
    const { container } = render(<KeyboardCanvas onSelectKey={onSelectKey} />);
    const positions = Array.from(
      container.querySelectorAll<SVGGElement>("[data-key-id], [data-encoder-id]"),
    );
    const entry = positions[0];

    expect(positions.filter((position) => position.getAttribute("tabindex") === "0")).toHaveLength(1);
    expect(entry.getAttribute("tabindex")).toBe("0");

    // When the user moves right and activates the focused position
    act(() => entry.focus());
    fireEvent.keyDown(entry, { key: "ArrowRight" });
    fireEvent.keyDown(positions[1], { key: "Enter" });

    // Then the new position is selected through the board's public callback
    expect(document.activeElement?.getAttribute("data-key-id")).toBe(
      positions[1].getAttribute("data-key-id"),
    );
    expect(onSelectKey).toHaveBeenCalledWith(positions[1].getAttribute("data-key-id"));
  });

  it("arrow navigation moves to the nearest visual position in the requested direction", () => {
    // Given focus on the top-left position
    const { container } = render(<KeyboardCanvas />);
    const start = container.querySelector<SVGGElement>('[data-key-id="L-r0-c0"]')!;
    act(() => start.focus());

    // When the user moves down
    fireEvent.keyDown(start, { key: "ArrowDown" });

    // Then focus moves to the position directly below, not the next DOM sibling
    expect(document.activeElement?.getAttribute("data-key-id")).toBe("L-r1-c0");
  });

  it("arrow navigation stays on the current position at a board edge", () => {
    // Given focus on the leftmost position
    const { container } = render(<KeyboardCanvas />);
    const edge = container.querySelector<SVGGElement>('[data-key-id="L-r0-c0"]')!;
    act(() => edge.focus());

    // When the user moves left with no candidate in that direction
    fireEvent.keyDown(edge, { key: "ArrowLeft" });

    // Then focus remains at the board edge
    expect(document.activeElement?.getAttribute("data-key-id")).toBe("L-r0-c0");
  });

  it("arrow navigation reaches a descriptively named and activatable encoder", () => {
    // Given focus on the inner-left key beside the encoders
    const onSelectKey = vi.fn();
    const { container } = render(<KeyboardCanvas onSelectKey={onSelectKey} />);
    const start = container.querySelector<SVGGElement>('[data-key-id="L-r2-c5"]')!;
    act(() => start.focus());

    // When the user moves right and activates the reached encoder
    fireEvent.keyDown(start, { key: "ArrowRight" });
    const encoder = container.querySelector<SVGGElement>('[data-encoder-id="L-enc"]')!;
    const rightEncoder = container.querySelector<SVGGElement>('[data-encoder-id="R-enc"]')!;
    fireEvent.keyDown(encoder, { key: " " });

    // Then the encoder is the roving focus anchor and is selected by its descriptive control
    expect(document.activeElement?.getAttribute("data-encoder-id")).toBe("L-enc");
    expect(encoder.getAttribute("aria-label")).toBe("Left encoder");
    expect(encoder.getAttribute("tabindex")).toBe("0");
    expect(onSelectKey).toHaveBeenCalledWith("L-enc");
    expect(rightEncoder.getAttribute("aria-label")).toBe("Right encoder");
    expect(rightEncoder.hasAttribute("tabindex")).toBe(true);
  });

  it("renders the full board: 58 key shapes and 2 encoder circles", () => {
    const { container } = render(<KeyboardCanvas />);

    expect(container.querySelectorAll("[data-key-id]")).toHaveLength(58);
    expect(container.querySelectorAll("[data-encoder-id]")).toHaveLength(2);
    expect(container.querySelectorAll("circle")).toHaveLength(2);
  });

  it("shows the state-matrix tooltip on hover and hides it on mouse-out", () => {
    const { container } = render(
      <KeyboardCanvas legends={{ "L-r2-c1": { primary: "a", shifted: "A" } }} />,
    );
    const key = container.querySelector('[data-key-id="L-r2-c1"]')!;

    fireEvent.mouseOver(key);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Left · row 3 · col 2");
    expect(screen.getByRole("tooltip")).toHaveTextContent("a");
    expect(screen.getByRole("tooltip")).toHaveTextContent("A");

    fireEvent.mouseOut(key);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("shows position and empty legend and behavior guidance for an unpopulated position", () => {
    // Given an unpopulated board position
    const { container } = render(<KeyboardCanvas legends={{}} />);
    const key = container.querySelector('[data-key-id="L-r2-c1"]')!;

    // When the position is hovered
    fireEvent.mouseOver(key);

    // Then its position and empty state are explained
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("Left · row 3 · col 2");
    expect(tooltip).toHaveTextContent("legendEmpty");
    expect(tooltip).toHaveTextContent("behaviorNone");
  });

  it("shows the state-matrix tooltip on focus and hides it on blur, for keyboard and touch users", () => {
    const { container } = render(
      <KeyboardCanvas legends={{ "L-r2-c1": { primary: "a", shifted: "A" } }} />,
    );
    const key = container.querySelector('[data-key-id="L-r2-c1"]')!;

    fireEvent.focus(key);
    expect(screen.getByRole("tooltip")).toHaveTextContent("a");

    fireEvent.blur(key);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("points a focused key's aria-describedby at its tooltip id", () => {
    const { container } = render(
      <KeyboardCanvas legends={{ "L-r2-c1": { primary: "a" } }} />,
    );
    const key = container.querySelector('[data-key-id="L-r2-c1"]')!;

    fireEvent.focus(key);

    const tooltip = screen.getByRole("tooltip");
    expect(key.getAttribute("aria-describedby")).toBe(tooltip.id);
  });

  it("still selects a key on click while its tooltip is showing", () => {
    const onSelectKey = vi.fn();
    const { container } = render(
      <KeyboardCanvas legends={{ "L-r2-c1": { primary: "a" } }} onSelectKey={onSelectKey} />,
    );
    const key = container.querySelector('[data-key-id="L-r2-c1"]')!;

    fireEvent.mouseOver(key);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.click(key);

    expect(onSelectKey).toHaveBeenCalledWith("L-r2-c1");
  });

  it("rotates the angled thumb-cluster keys", () => {
    const { container } = render(<KeyboardCanvas />);
    const rotated = Array.from(
      container.querySelectorAll<SVGGElement>("[data-key-id]"),
    ).filter((g) => (g.getAttribute("transform") ?? "").includes("rotate"));

    expect(rotated.length).toBeGreaterThan(0);
  });
});
