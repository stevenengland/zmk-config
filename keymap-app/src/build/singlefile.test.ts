import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const distDir = resolve(appRoot, "dist");
const indexHtml = resolve(distDir, "index.html");

// External asset references (not data:, http(s):, or in-document #anchors) would
// break a file:// open — the whole point of the single-file bundle.
const EXTERNAL_ASSET = /(?:src|href)="(?!data:|https?:|#)[^"]+"/g;

describe("production single-file build", () => {
  beforeAll(() => {
    execSync("npm run build", { cwd: appRoot, stdio: "pipe" });
  }, 120_000);

  it("emits a self-contained index.html and no separate asset chunks", () => {
    expect(existsSync(indexHtml)).toBe(true);
    const stray = readdirSync(distDir).filter(
      (name) => name.endsWith(".js") || name.endsWith(".css"),
    );
    expect(stray).toEqual([]);
  });

  it("inlines every asset so it opens via file://", () => {
    const html = readFileSync(indexHtml, "utf8");
    expect(html.match(EXTERNAL_ASSET)).toBeNull();
    expect(html).toContain("<script");
    expect(html.length).toBeGreaterThan(50_000);
  });
});
