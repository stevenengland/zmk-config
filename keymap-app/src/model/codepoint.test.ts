import { describe, it, expect } from "vitest";
import { convertLegendInput } from "./codepoint";

describe("convertLegendInput", () => {
  it("passes plain text through unchanged", () => {
    expect(convertLegendInput("A")).toEqual({ ok: true, glyph: "A" });
    expect(convertLegendInput("Esc")).toEqual({ ok: true, glyph: "Esc" });
  });

  it("converts U+XXXX notation to its glyph", () => {
    expect(convertLegendInput("U+2318")).toEqual({ ok: true, glyph: "⌘" });
  });

  it("accepts lowercase hex and the u+ prefix case-insensitively", () => {
    expect(convertLegendInput("u+00e9")).toEqual({ ok: true, glyph: "é" });
  });

  it("converts astral-plane codepoints", () => {
    expect(convertLegendInput("U+1F600")).toEqual({ ok: true, glyph: "\u{1F600}" });
  });

  it("rejects malformed hex in U+ notation", () => {
    const result = convertLegendInput("U+ZZZZ");
    expect(result.ok).toBe(false);
  });

  it("rejects out-of-range codepoints", () => {
    expect(convertLegendInput("U+110000").ok).toBe(false);
  });

  it("rejects surrogate codepoints", () => {
    expect(convertLegendInput("U+D800").ok).toBe(false);
  });
});
