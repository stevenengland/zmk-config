import {
  parse,
  resolveTapDisplays,
  resolveTooltipRows,
  serialize,
  SCHEMA_VERSION,
  type KeymapDocument,
} from "./schema";

describe("schema serialize/parse", () => {
  it("round-trips a document, omitting unset legend slots", () => {
    const doc: KeymapDocument = {
      schemaVersion: SCHEMA_VERSION,
      layers: [
        {
          name: "Base",
          color: "#00e5ff",
          keys: {
            "L-r0-c0": { primary: "Q" },
            "L-r0-c1": { primary: "W", shifted: "!", color: "#ff0000" },
          },
        },
      ],
    };

    const json = serialize(doc);

    expect(json).not.toContain("altgr");
    expect(json).not.toContain('""');
    expect(parse(json)).toEqual(doc);
  });

  it("drops empty-string slots instead of persisting them", () => {
    const doc: KeymapDocument = {
      schemaVersion: SCHEMA_VERSION,
      layers: [{ name: "Base", color: "#00e5ff", keys: { "L-r0-c0": { primary: "Q", shifted: "" } } }],
    };

    const parsed = parse(serialize(doc));

    expect(parsed.layers[0].keys["L-r0-c0"]).toEqual({ primary: "Q" });
  });

  it("rejects an unknown schemaVersion with an error", () => {
    const json = JSON.stringify({ schemaVersion: 3, layers: [] });

    expect(() => parse(json)).toThrow(/schemaVersion/);
  });

  it("upgrades a schemaVersion 1 document in memory, preserving all existing legends", () => {
    const v1Json = JSON.stringify({
      schemaVersion: 1,
      layers: [
        {
          name: "Base",
          color: "#00e5ff",
          keys: { "L-r0-c0": { primary: "Q", shifted: "!", color: "#ff0000" } },
        },
      ],
    });

    const parsed = parse(v1Json);

    expect(parsed.schemaVersion).toBe(SCHEMA_VERSION);
    expect(parsed.layers[0].keys["L-r0-c0"]).toEqual({
      primary: "Q",
      shifted: "!",
      color: "#ff0000",
    });
  });

  it("serializer always emits the current schemaVersion", () => {
    const json = serialize({
      schemaVersion: SCHEMA_VERSION,
      layers: [{ name: "Base", color: "#00e5ff", keys: {} }],
    });

    expect(JSON.parse(json).schemaVersion).toBe(SCHEMA_VERSION);
  });

  it("round-trips board.homing", () => {
    const doc: KeymapDocument = {
      schemaVersion: SCHEMA_VERSION,
      board: { homing: ["L-r2-c4", "R-r2-c1"] },
      layers: [{ name: "Base", color: "#00e5ff", keys: {} }],
    };

    const parsed = parse(serialize(doc));

    expect(parsed.board).toEqual({ homing: ["L-r2-c4", "R-r2-c1"] });
  });

  it("prunes an empty board section from the persisted JSON", () => {
    const doc: KeymapDocument = {
      schemaVersion: SCHEMA_VERSION,
      board: { homing: [] },
      layers: [{ name: "Base", color: "#00e5ff", keys: {} }],
    };

    const json = serialize(doc);

    expect(json).not.toContain("board");
    expect(parse(json).board).toBeUndefined();
  });

  it("omits `board` entirely when the document never had one", () => {
    const json = serialize({
      schemaVersion: SCHEMA_VERSION,
      layers: [{ name: "Base", color: "#00e5ff", keys: {} }],
    });

    expect(json).not.toContain("board");
  });

  it("rejects a document missing `layers` with an error", () => {
    const json = JSON.stringify({ schemaVersion: 1 });

    expect(() => parse(json)).toThrow(/layers/);
  });

  it("rejects a document whose `layers` is not an array with an error", () => {
    const json = JSON.stringify({ schemaVersion: 1, layers: "not-an-array" });

    expect(() => parse(json)).toThrow(/layers/);
  });

  it("rejects a document with a malformed layer object with an error", () => {
    const json = JSON.stringify({ schemaVersion: 1, layers: [{ name: "Base" }] });

    expect(() => parse(json)).toThrow(/layer/);
  });

  it("round-trips a hold glyph with its shifted variant", () => {
    const doc: KeymapDocument = {
      schemaVersion: SCHEMA_VERSION,
      layers: [
        {
          name: "Base",
          color: "#00e5ff",
          keys: { "L-r2-c1": { primary: "a", hold: { glyph: "ä", shifted: "Ä" } } },
        },
      ],
    };

    const parsed = parse(serialize(doc));

    expect(parsed.layers[0].keys["L-r2-c1"].hold).toEqual({ glyph: "ä", shifted: "Ä" });
  });

  it("omits the hold object entirely once its glyph is cleared", () => {
    const doc: KeymapDocument = {
      schemaVersion: SCHEMA_VERSION,
      layers: [{ name: "Base", color: "#00e5ff", keys: { "L-r2-c1": { primary: "a", hold: { glyph: "" } } } }],
    };

    const json = serialize(doc);

    expect(json).not.toContain("hold");
    expect(parse(json).layers[0].keys["L-r2-c1"].hold).toBeUndefined();
  });

  it("round-trips a hold binding that targets a layer by name", () => {
    const doc: KeymapDocument = {
      schemaVersion: SCHEMA_VERSION,
      layers: [
        { name: "Base", color: "#00e5ff", keys: { "L-r4-c4": { primary: "␣", hold: { layer: "Nav" } } } },
        { name: "Nav", color: "#fec931", keys: {} },
      ],
    };

    const parsed = parse(serialize(doc));

    expect(parsed.layers[0].keys["L-r4-c4"].hold).toEqual({ layer: "Nav" });
  });

  it("round-trips the macro registry and a key's macro reference", () => {
    const doc: KeymapDocument = {
      schemaVersion: SCHEMA_VERSION,
      macros: { copy: { glyph: "⌃C", label: "Copy", steps: "hold Ctrl · tap C" } },
      layers: [{ name: "Base", color: "#00e5ff", keys: { "R-r2-c1": { macro: "copy" } } }],
    };

    const parsed = parse(serialize(doc));

    expect(parsed.macros).toEqual({ copy: { glyph: "⌃C", label: "Copy", steps: "hold Ctrl · tap C" } });
    expect(parsed.layers[0].keys["R-r2-c1"]).toEqual({ macro: "copy" });
  });

  it("persists a macro registry entry even when no key references it", () => {
    const doc: KeymapDocument = {
      schemaVersion: SCHEMA_VERSION,
      macros: { copy: { glyph: "⌃C", label: "Copy", steps: "hold Ctrl · tap C" } },
      layers: [{ name: "Base", color: "#00e5ff", keys: {} }],
    };

    const parsed = parse(serialize(doc));

    expect(parsed.macros).toEqual({ copy: { glyph: "⌃C", label: "Copy", steps: "hold Ctrl · tap C" } });
  });

  it("omits `macros` entirely when the document never had any", () => {
    const json = serialize({
      schemaVersion: SCHEMA_VERSION,
      layers: [{ name: "Base", color: "#00e5ff", keys: {} }],
    });

    expect(json).not.toContain("macros");
  });

  it("prunes an empty macro registry from the persisted JSON", () => {
    const doc: KeymapDocument = {
      schemaVersion: SCHEMA_VERSION,
      macros: {},
      layers: [{ name: "Base", color: "#00e5ff", keys: {} }],
    };

    const json = serialize(doc);

    expect(json).not.toContain("macros");
    expect(parse(json).macros).toBeUndefined();
  });

  it("round-trips a tap-dance row", () => {
    const doc: KeymapDocument = {
      schemaVersion: SCHEMA_VERSION,
      layers: [
        {
          name: "Base",
          color: "#00e5ff",
          keys: { "L-r2-c1": { primary: "⇧", taps: [{ count: 2, glyph: "⇪" }] } },
        },
      ],
    };

    const parsed = parse(serialize(doc));

    expect(parsed.layers[0].keys["L-r2-c1"].taps).toEqual([{ count: 2, glyph: "⇪" }]);
  });

  it("round-trips a tap-dance row's toggle flag", () => {
    const doc: KeymapDocument = {
      schemaVersion: SCHEMA_VERSION,
      layers: [
        {
          name: "Base",
          color: "#00e5ff",
          keys: { "L-r2-c1": { primary: "⇧", taps: [{ count: 2, glyph: "⇧", toggle: true }] } },
        },
      ],
    };

    const parsed = parse(serialize(doc));

    expect(parsed.layers[0].keys["L-r2-c1"].taps).toEqual([{ count: 2, glyph: "⇧", toggle: true }]);
  });

  it("prunes the taps array from the persisted JSON once it's empty", () => {
    const doc: KeymapDocument = {
      schemaVersion: SCHEMA_VERSION,
      layers: [{ name: "Base", color: "#00e5ff", keys: { "L-r2-c1": { primary: "⇧", taps: [] } } }],
    };

    const json = serialize(doc);

    expect(json).not.toContain("taps");
    expect(parse(json).layers[0].keys["L-r2-c1"].taps).toBeUndefined();
  });
});

describe("resolveTapDisplays", () => {
  it("prefixes the glyph with `count` middots", () => {
    expect(resolveTapDisplays([{ count: 2, glyph: "⇪" }])).toEqual([{ text: "··⇪" }]);
  });

  it("orders multiple rows ascending by count", () => {
    const displays = resolveTapDisplays([
      { count: 3, glyph: "⇧" },
      { count: 2, glyph: "⇪" },
    ]);

    expect(displays).toEqual([{ text: "··⇪" }, { text: "···⇧" }]);
  });

  it("suffixes a toggle row with the hollow ring", () => {
    expect(resolveTapDisplays([{ count: 2, glyph: "⇧", toggle: true }])).toEqual([{ text: "··⇧◦" }]);
  });

  it("returns an empty list for no taps", () => {
    expect(resolveTapDisplays(undefined)).toEqual([]);
  });
});

describe("resolveTooltipRows", () => {
  it("shows only the rows that are set: tap, Shift+tap, AltGr", () => {
    const rows = resolveTooltipRows({ primary: "a", shifted: "A", altgr: "æ" }, {}, []);

    expect(rows).toEqual([
      { label: "tap", value: "a" },
      { label: "⇧ + tap", value: "A" },
      { label: "AltGr", value: "æ" },
    ]);
  });

  it("omits rows for slots that are unset", () => {
    const rows = resolveTooltipRows({ primary: "a" }, {}, []);

    expect(rows).toEqual([{ label: "tap", value: "a" }]);
  });

  it("shows a hold row for a glyph hold", () => {
    const rows = resolveTooltipRows({ hold: { glyph: "ä" } }, {}, []);

    expect(rows).toEqual([{ label: "hold", value: "ä" }]);
  });

  it("shows a hold row tinted to the target layer for a layer-tap hold", () => {
    const layers = [{ name: "Nav", color: "#fec931", keys: {} }];
    const rows = resolveTooltipRows({ hold: { layer: "Nav" } }, {}, layers);

    expect(rows).toEqual([{ label: "hold", value: "Nav" }]);
  });

  it("shows a Shift+hold row when the hold's glyph has a shifted variant", () => {
    const rows = resolveTooltipRows({ hold: { glyph: "ä", shifted: "Ä" } }, {}, []);

    expect(rows).toEqual([
      { label: "hold", value: "ä" },
      { label: "⇧ + hold", value: "Ä" },
    ]);
  });

  it("does not show a Shift+hold row for a layer-tap hold", () => {
    const layers = [{ name: "Nav", color: "#fec931", keys: {} }];
    const rows = resolveTooltipRows({ hold: { layer: "Nav" } }, {}, layers);

    expect(rows).toEqual([{ label: "hold", value: "Nav" }]);
  });

  it("shows the macro's label and steps in the tap row when a macro is bound", () => {
    const macros = { copy: { glyph: "⌃C", label: "Copy", steps: "hold Ctrl · tap C" } };
    const rows = resolveTooltipRows({ primary: "j", macro: "copy" }, macros, []);

    expect(rows).toEqual([{ label: "tap", value: "Copy — hold Ctrl · tap C" }]);
  });

  it("adds one row per tap-dance count, ascending", () => {
    const rows = resolveTooltipRows(
      { taps: [{ count: 3, glyph: "⇧" }, { count: 2, glyph: "⇪" }] },
      {},
      [],
    );

    expect(rows).toEqual([
      { label: "2× tap", value: "⇪" },
      { label: "3× tap", value: "⇧" },
    ]);
  });
});
