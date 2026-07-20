// Keymap persistence with capability-detected progressive enhancement.
//
// Baseline (works everywhere, including `file://`): Open reads a document
// through a hidden file input; Save streams the JSON out as a download.
// Enhanced (secure http(s) origin with the File System Access API, e.g.
// `npx serve`): Open uses the system picker once and hands back a file
// handle; subsequent Saves reuse that handle to write back in place without
// re-prompting.

import { parse, serialize, type KeymapDocument } from "../model/schema";

const FILE_NAME = "keymap.json";
const MIME = "application/json";

// Minimal File System Access API surface — the DOM lib does not declare these
// on `Window`, so we model just what this module touches.
interface FsWritable {
  write(data: string): Promise<void> | void;
  close(): Promise<void> | void;
}
interface FsFileHandle {
  getFile?(): Promise<File>;
  createWritable(): Promise<FsWritable>;
}
interface FsWindow {
  showOpenFilePicker?: (options?: unknown) => Promise<FsFileHandle[]>;
  showSaveFilePicker?: (options?: unknown) => Promise<FsFileHandle>;
}

/** Opaque write-back target: an FSA handle when enhanced, `null` at baseline. */
export type SaveTarget = FsFileHandle | null;

export interface OpenResult {
  document: KeymapDocument;
  handle: SaveTarget;
  filename: string;
}

const PICKER_TYPES = [
  { description: "Keymap JSON", accept: { [MIME]: [".json"] as string[] } },
];

/**
 * True only when the enhanced write-back path is available: the File System
 * Access API is present on a secure `http(s)` origin. `file://` (and any
 * non-secure origin) always resolves to `false`, so it takes the baseline.
 */
export function hasFileSystemAccess(): boolean {
  if (typeof window === "undefined") return false;
  const proto = window.location?.protocol;
  const secure = (window as unknown as { isSecureContext?: boolean }).isSecureContext === true;
  const api = typeof (window as unknown as FsWindow).showOpenFilePicker === "function";
  return (proto === "http:" || proto === "https:") && secure && api;
}

/** Parse + schema-validate raw file text; throws on malformed or unsupported JSON. */
async function readDocument(file: File): Promise<KeymapDocument> {
  return parse(await file.text());
}

/** Baseline open: pick a single file through a transient `<input type=file>`. */
function pickFileViaInput(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = `${MIME},.json`;
    input.addEventListener("change", () => resolve(input.files?.[0] ?? null));
    input.click();
  });
}

/**
 * Load a document. On the enhanced path the returned `handle` enables in-place
 * write-back; on baseline it is `null`. Resolves to `null` when the user
 * dismisses the picker. Rejects when the chosen file is not a valid document —
 * callers keep the current document on rejection.
 */
export async function openDocument(): Promise<OpenResult | null> {
  if (hasFileSystemAccess()) {
    const picker = (window as unknown as FsWindow).showOpenFilePicker!;
    const [handle] = await picker({ types: PICKER_TYPES, multiple: false });
    const file = await handle.getFile!();
    return { document: await readDocument(file), handle, filename: file.name };
  }
  const file = await pickFileViaInput();
  if (!file) return null;
  return { document: await readDocument(file), handle: null, filename: file.name };
}

/** Baseline save: stream the JSON out as a download. */
function downloadJson(json: string): void {
  const blob = new Blob([json], { type: MIME });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = FILE_NAME;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Persist a document and return the write-back target for the next save. On the
 * enhanced path, an existing `target` is reused (in-place, no prompt); with no
 * target the save picker is shown once and its handle returned. On baseline the
 * document downloads and `null` is returned.
 */
export async function saveDocument(
  doc: KeymapDocument,
  target: SaveTarget,
): Promise<SaveTarget> {
  const json = serialize(doc);
  if (hasFileSystemAccess()) {
    const handle = target ?? (await (window as unknown as FsWindow).showSaveFilePicker!({
      suggestedName: FILE_NAME,
      types: PICKER_TYPES,
    }));
    const writable = await handle.createWritable();
    await writable.write(json);
    await writable.close();
    return handle;
  }
  downloadJson(json);
  return null;
}
