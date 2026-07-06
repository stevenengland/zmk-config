import { render } from "@testing-library/react";
import { App } from "./App";

describe("App", () => {
  it("mounts the keyboard board", () => {
    const { container } = render(<App />);
    expect(container.querySelector('svg[aria-label="Sofle Choc keyboard"]')).not.toBeNull();
  });
});
