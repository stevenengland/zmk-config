import { boardGeometry, keys, encoders } from "./geometry";

const KEY_ID = /^[LR]-r[0-4]-c[0-5]$/;

describe("Sofle Choc board geometry", () => {
  it("exposes exactly 58 keys", () => {
    expect(keys).toHaveLength(58);
  });

  it("exposes exactly 2 encoders", () => {
    expect(encoders).toHaveLength(2);
  });

  it("splits keys evenly, 29 per half", () => {
    expect(keys.filter((k) => k.id.startsWith("L-"))).toHaveLength(29);
    expect(keys.filter((k) => k.id.startsWith("R-"))).toHaveLength(29);
  });

  it("gives every key a unique id in L-r<row>-c<col> / R-r<row>-c<col> format", () => {
    for (const key of keys) {
      expect(key.id).toMatch(KEY_ID);
    }
    const ids = keys.map((k) => k.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("names the two encoders L-enc and R-enc", () => {
    expect(encoders.map((e) => e.id).sort()).toEqual(["L-enc", "R-enc"]);
  });

  it("keeps all 60 element ids globally unique", () => {
    const ids = boardGeometry.map((e) => e.id);
    expect(new Set(ids).size).toBe(60);
  });
});
