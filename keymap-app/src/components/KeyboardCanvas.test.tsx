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

  it("rotates the angled thumb-cluster keys", () => {
    const { container } = render(<KeyboardCanvas />);
    const rotated = Array.from(
      container.querySelectorAll<SVGGElement>("[data-key-id]"),
    ).filter((g) => (g.getAttribute("transform") ?? "").includes("rotate"));

    expect(rotated.length).toBeGreaterThan(0);
  });
});
