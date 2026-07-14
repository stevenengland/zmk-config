import { afterEach, describe, expect, it, vi } from "vitest";
import { boardGeometry } from "../model/geometry";
import { SCHEMA_VERSION, type KeymapDocument, type Layer } from "../model/schema";
import { boxOf, homingBarRect, KEY_STROKE, layerTickPath } from "../model/renderStyle";
import { exportAllLayersSvg, exportJson, exportLayerSvg, layerToSvg } from "./export";

vi.mock("../model/schema", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../model/schema")>();
  return { ...actual, serialize: vi.fn(actual.serialize) };
});

import { serialize } from "../model/schema";

const LAYER: Layer = {
  name: "Base",
  color: "#00e5ff",
  keys: { "L-r0-c0": { primary: "Q", shifted: "!", altgr: "@", color: "#ff0000" } },
};

const DOC: KeymapDocument = {
  schemaVersion: SCHEMA_VERSION,
  layers: [LAYER, { name: "Nav", color: "#fec931", keys: {} }],
};

/** Reused mock anchor; records the `download` name in effect at each click. */
function mockDownload(): string[] {
  const downloads: string[] = [];
  const anchor = {
    href: "",
    download: "",
    click: vi.fn(() => downloads.push(anchor.download)),
  } as unknown as HTMLAnchorElement;
  vi.spyOn(document, "createElement").mockReturnValue(anchor);
  (URL as unknown as { createObjectURL: unknown }).createObjectURL = vi.fn(() => "blob:x");
  (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn();
  return downloads;
}

afterEach(() => vi.restoreAllMocks());

describe("layerToSvg", () => {
  it("embeds the font-face and every legend text for the layer", () => {
    const svg = layerToSvg(LAYER);

    expect(svg).toContain("@font-face");
    expect(svg).toContain("Noto Sans Symbols 2");
    expect(svg).toContain("Q");
    expect(svg).toContain("!");
    expect(svg).toContain("@");
  });

  it("paints the identical layer-colored corner tick as the live canvas, and no LED dot", () => {
    const svg = layerToSvg(LAYER);
    const box = boxOf(boardGeometry.find((e) => e.id === "L-r0-c0")!);

    expect(svg).toContain(`d="${layerTickPath(box)}" fill="none" stroke="${LAYER.color}"`);
  });

  it("renders the homing bar identically to the canvas for a homed key", () => {
    const svg = layerToSvg(LAYER, ["L-r0-c0"]);
    const box = boxOf(boardGeometry.find((e) => e.id === "L-r0-c0")!);
    const r = homingBarRect(box);

    expect(svg).toContain(
      `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" rx="${r.rx}" fill="${KEY_STROKE}" />`,
    );
  });

  it("renders no homing bar for a key not in the homing set", () => {
    const svg = layerToSvg(LAYER, ["R-r2-c1"]);
    const box = boxOf(boardGeometry.find((e) => e.id === "L-r0-c0")!);
    const r = homingBarRect(box);

    expect(svg).not.toContain(`x="${r.x}" y="${r.y}" width="${r.width}"`);
  });
});

describe("exportLayerSvg", () => {
  it("downloads a standalone .svg named after the layer", () => {
    const downloads = mockDownload();

    exportLayerSvg(LAYER);

    expect(downloads).toEqual(["Base.svg"]);
  });
});

describe("exportAllLayersSvg", () => {
  it("triggers one sequential download per layer, each named after its layer", () => {
    const downloads = mockDownload();

    exportAllLayersSvg(DOC.layers);

    expect(downloads).toEqual(["Base.svg", "Nav.svg"]);
  });
});

describe("exportJson", () => {
  it("downloads the document via the same serializer Save uses", () => {
    const downloads = mockDownload();

    exportJson(DOC);

    expect(serialize).toHaveBeenCalledWith(DOC);
    expect(downloads).toEqual(["keymap.json"]);
  });
});
