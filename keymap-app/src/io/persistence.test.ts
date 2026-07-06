import { afterEach, beforeEach, vi } from "vitest";
import type { KeymapDocument } from "../model/schema";
import { hasFileSystemAccess, openDocument, saveDocument } from "./persistence";

const DOC: KeymapDocument = {
  schemaVersion: 1,
  layers: [{ name: "Base", color: "#00e5ff", keys: { "L-r0-c0": { primary: "Q" } } }],
};

function docJson(): string {
  return JSON.stringify(DOC);
}

/** Point `window.location` and secure-context flag at a given origin shape. */
function setOrigin(protocol: string, secure: boolean): void {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { protocol },
  });
  Object.defineProperty(window, "isSecureContext", { configurable: true, value: secure });
}

/** A File whose text() resolves to `content`, independent of jsdom Blob support. */
function fileWith(content: string): File {
  return { text: () => Promise.resolve(content) } as unknown as File;
}

afterEach(() => {
  vi.restoreAllMocks();
  delete (window as Record<string, unknown>).showOpenFilePicker;
  delete (window as Record<string, unknown>).showSaveFilePicker;
});

describe("capability detection", () => {
  afterEach(() => {
    delete (window as Record<string, unknown>).showOpenFilePicker;
  });

  it("selects the File System Access path on a secure https origin with the API present", () => {
    setOrigin("https:", true);
    (window as Record<string, unknown>).showOpenFilePicker = () => {};
    expect(hasFileSystemAccess()).toBe(true);
  });

  it("selects the File System Access path on secure http (localhost / npx serve)", () => {
    setOrigin("http:", true);
    (window as Record<string, unknown>).showOpenFilePicker = () => {};
    expect(hasFileSystemAccess()).toBe(true);
  });

  it("falls back to baseline on file:// even when the API is present", () => {
    setOrigin("file:", true);
    (window as Record<string, unknown>).showOpenFilePicker = () => {};
    expect(hasFileSystemAccess()).toBe(false);
  });

  it("falls back to baseline when the API is absent", () => {
    setOrigin("https:", true);
    expect(hasFileSystemAccess()).toBe(false);
  });
});

describe("baseline open (file input) and save (download)", () => {
  beforeEach(() => setOrigin("file:", true));

  it("reads and validates a document chosen through the file input", async () => {
    const input = { type: "", accept: "", files: [fileWith(docJson())], click() {} } as unknown as HTMLInputElement;
    const listeners: Record<string, () => void> = {};
    input.addEventListener = ((event: string, cb: () => void) => {
      listeners[event] = cb;
    }) as HTMLInputElement["addEventListener"];
    input.click = () => listeners.change?.();
    vi.spyOn(document, "createElement").mockReturnValue(input);

    const result = await openDocument();

    expect(result?.document).toEqual(DOC);
    expect(result?.handle).toBeNull();
  });

  it("surfaces malformed JSON as a rejection so the caller can keep the current document", async () => {
    const input = { files: [fileWith("{ not json")], click() {} } as unknown as HTMLInputElement;
    const listeners: Record<string, () => void> = {};
    input.addEventListener = ((event: string, cb: () => void) => {
      listeners[event] = cb;
    }) as HTMLInputElement["addEventListener"];
    input.click = () => listeners.change?.();
    vi.spyOn(document, "createElement").mockReturnValue(input);

    await expect(openDocument()).rejects.toThrow();
  });

  it("saves by triggering a download and keeps no write-back handle", async () => {
    const anchor = { href: "", download: "", click: vi.fn() } as unknown as HTMLAnchorElement;
    vi.spyOn(document, "createElement").mockReturnValue(anchor);
    const createURL = vi.fn(() => "blob:x");
    const revokeURL = vi.fn();
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = createURL;
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = revokeURL;

    const handle = await saveDocument(DOC, null);

    expect((anchor.click as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
    expect(anchor.download).toMatch(/\.json$/);
    expect(handle).toBeNull();
  });
});

describe("File System Access open + in-place write-back", () => {
  beforeEach(() => setOrigin("https:", true));

  it("opens through the picker once and reuses the handle for later saves without re-prompting", async () => {
    const written: string[] = [];
    const writable = { write: (d: string) => void written.push(d), close: () => Promise.resolve() };
    const fileHandle = {
      getFile: () => Promise.resolve(fileWith(docJson())),
      createWritable: () => Promise.resolve(writable),
    };
    const openPicker = vi.fn(() => Promise.resolve([fileHandle]));
    const savePicker = vi.fn(() => Promise.resolve(fileHandle));
    (window as Record<string, unknown>).showOpenFilePicker = openPicker;
    (window as Record<string, unknown>).showSaveFilePicker = savePicker;

    const opened = await openDocument();
    expect(opened?.document).toEqual(DOC);
    expect(openPicker).toHaveBeenCalledTimes(1);

    const handle1 = await saveDocument(DOC, opened!.handle);
    const handle2 = await saveDocument(DOC, handle1);

    expect(savePicker).not.toHaveBeenCalled();
    expect(written).toHaveLength(2);
    expect(handle2).toBe(opened!.handle);
  });

  it("prompts once with the save picker when saving a document that was never opened", async () => {
    const writable = { write: vi.fn(), close: () => Promise.resolve() };
    const fileHandle = { createWritable: () => Promise.resolve(writable) };
    const savePicker = vi.fn(() => Promise.resolve(fileHandle));
    (window as Record<string, unknown>).showOpenFilePicker = () => {};
    (window as Record<string, unknown>).showSaveFilePicker = savePicker;

    await saveDocument(DOC, null);

    expect(savePicker).toHaveBeenCalledTimes(1);
    expect(writable.write).toHaveBeenCalled();
  });
});
