import { parse, serialize, type KeymapDocument } from "./schema";

describe("schema serialize/parse", () => {
  it("round-trips a document, omitting unset legend slots", () => {
    const doc: KeymapDocument = {
      schemaVersion: 1,
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
      schemaVersion: 1,
      layers: [{ name: "Base", color: "#00e5ff", keys: { "L-r0-c0": { primary: "Q", shifted: "" } } }],
    };

    const parsed = parse(serialize(doc));

    expect(parsed.layers[0].keys["L-r0-c0"]).toEqual({ primary: "Q" });
  });

  it("rejects an unknown schemaVersion with an error", () => {
    const json = JSON.stringify({ schemaVersion: 2, layers: [] });

    expect(() => parse(json)).toThrow(/schemaVersion/);
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
});
