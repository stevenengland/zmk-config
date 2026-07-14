import { parse, serialize, SCHEMA_VERSION, type KeymapDocument } from "./schema";

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
});
