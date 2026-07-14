import { render, screen } from "@testing-library/react";
import { KeyTooltip } from "./KeyTooltip";

const anchorRect = { top: 10, left: 20, bottom: 30, right: 40 };

describe("KeyTooltip", () => {
  it("renders nothing for a key with no legends", () => {
    const { container } = render(
      <KeyTooltip keyId="L-r0-c0" legend={{}} macros={{}} layers={[]} anchorRect={anchorRect} />,
    );

    expect(container).toBeEmptyDOMElement();
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
});
