# keymap-app

Keymap illustrator for the Sofle Choc — a single-page React app for laying out
key legends across layers and exporting the result.

## Development

All npm scripts run from this directory (`keymap-app/`).

```bash
npm install
npm run dev        # Vite dev server
npm run test       # Vitest + React Testing Library
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run build      # typecheck + single-file production build
```

## Saving and opening keymaps

Keymaps persist as JSON (`{ "schemaVersion": 1, "layers": [...] }`). The
**Open** and **Save** toolbar actions adapt to what the current origin supports,
so the app works with zero setup from a bare `file://` page and upgrades to
in-place write-back when served over http(s).

### Baseline mode (works everywhere, including `file://`)

Available on every origin — a `file://` page, an insecure host, or any browser
without the File System Access API.

- **Open** — pick a `.json` file through the browser's file chooser; the app
  validates it and renders the layers. Invalid or malformed JSON is reported in
  the status bar and the current document is left untouched.
- **Save** — downloads the keymap as `keymap.json` through your browser's normal
  download flow. Each save produces a fresh download; there is no write-back.

### Enhanced mode (in-place write-back)

On a **secure `http(s)` origin** (localhost counts) where the browser exposes
the **File System Access API**, the app writes back to the file you opened
without re-prompting.

- **Open** — the system file picker appears once and the app keeps a handle to
  the chosen file.
- **Save** — writes straight back to that same file. No new picker, no
  duplicate downloads. Saving a brand-new document (nothing opened yet) shows
  the save picker once to choose the destination, then reuses it.

Capability detection is strict: the enhanced path is selected **only** when the
API is present on a secure `http(s)` origin. `file://` always uses baseline mode
even in a browser that exposes the API.

### Verifying write-back with `npx serve`

`file://` cannot use the File System Access API, so verify the enhanced path
over a local server:

1. Build the app: `npm run build`.
2. Serve the output over http: `npx serve dist` (localhost is treated as a
   secure origin).
3. Open the served URL in a Chromium-based browser (File System Access support
   required).
4. Click **Open**, choose a `keymap.json`, and edit a legend.
5. Click **Save** — the change is written back to the original file with no
   second prompt. Reopen the file to confirm the edit persisted.

Opening the built `dist/index.html` directly via `file://` instead exercises
baseline mode: **Open** uses the file input and **Save** downloads a copy.
