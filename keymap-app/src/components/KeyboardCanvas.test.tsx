import { render } from "@testing-library/react";
import { KeyboardCanvas } from "./KeyboardCanvas";

describe("KeyboardCanvas", () => {
  it("renders the full board: 58 key shapes and 2 encoder circles", () => {
    const { container } = render(<KeyboardCanvas />);

    expect(container.querySelectorAll("[data-key-id]")).toHaveLength(58);
    expect(container.querySelectorAll("[data-encoder-id]")).toHaveLength(2);
    expect(container.querySelectorAll("circle")).toHaveLength(2);
  });

  it("rotates the angled thumb-cluster keys", () => {
    const { container } = render(<KeyboardCanvas />);
    const rotated = Array.from(
      container.querySelectorAll<SVGGElement>("[data-key-id]"),
    ).filter((g) => (g.getAttribute("transform") ?? "").includes("rotate"));

    expect(rotated.length).toBeGreaterThan(0);
  });
});
