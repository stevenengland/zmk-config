import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatusBar } from "./StatusBar";

describe("StatusBar", () => {
  it("renders nothing but the bar when there is no message", () => {
    render(<StatusBar message={null} />);

    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("shows an error message", () => {
    render(<StatusBar message={{ text: "invalid codepoint: U+ZZZZ", tone: "error" }} />);

    expect(screen.getByRole("status")).toHaveTextContent("invalid codepoint: U+ZZZZ");
  });
});
