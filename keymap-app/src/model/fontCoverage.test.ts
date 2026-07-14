import { describe, it, expect } from "vitest";
import coverage from "../assets/fonts/subset-coverage.json";
import marks from "../data/marks.json";
import symbols from "../data/symbols.json";

// The embedded fonts are the only ones an exported SVG can rely on: they are
// inlined as data: URIs and the file is opened on machines that have nothing
// else installed. A legend whose codepoint is in none of them silently falls
// back to a system font — or to tofu — which is exactly the drift the shared
// render constants exist to prevent.
//
// `subset-coverage.json` is emitted by scripts/gen-font-subset.sh, read back
// out of the woff2 files it just produced, so it reports what the shipped
// fonts can actually draw rather than what we asked pyftsubset for.

const perFont = coverage.fonts as Record<string, number[]>;
const embedded = new Set(Object.values(perFont).flat());

function codepointsOf(text: string): number[] {
  return [...text].map((ch) => ch.codePointAt(0)!);
}

function format(codepoints: number[]): string[] {
  return codepoints.map((cp) => `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`);
}

describe("embedded font coverage", () => {
  it("draws every behavior mark from an embedded font", () => {
    const glyphs = Object.values(marks).flatMap(codepointsOf);
    expect(format(glyphs.filter((cp) => !embedded.has(cp)))).toEqual([]);
  });

  it("draws every picker symbol from an embedded font", () => {
    // No single Noto face carries the whole picker, so the guarantee is the
    // union of the embedded subsets, in the order LEGEND_FONT stacks them.
    const glyphs = symbols.categories.flatMap((cat) => cat.symbols).flatMap(codepointsOf);
    expect(format(glyphs.filter((cp) => !embedded.has(cp)))).toEqual([]);
  });
});
