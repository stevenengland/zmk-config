import { render, fireEvent, screen } from "@testing-library/react";
import { KeyboardCanvas } from "./KeyboardCanvas";

describe("KeyboardCanvas", () => {
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
    expect(screen.getByRole("tooltip")).toHaveTextContent("a");
    expect(screen.getByRole("tooltip")).toHaveTextContent("A");

    fireEvent.mouseOut(key);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("shows no tooltip for a key with no legend", () => {
    const { container } = render(<KeyboardCanvas legends={{}} />);
    const key = container.querySelector('[data-key-id="L-r2-c1"]')!;

    fireEvent.mouseOver(key);

    expect(screen.queryByRole("tooltip")).toBeNull();
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
