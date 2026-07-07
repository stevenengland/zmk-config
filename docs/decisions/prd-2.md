# Decisions — PRD #2: PRD: Sofle Choc Keymap Illustrator SPA (keymap-app)

*Curated from slice anchors on 2026-07-06.*

### D1 — Use deep plain-TS core modules with thin React shell

- **Category:** arch
- **Source:** prd-from-grill-me
- **Rationale:** Core logic (schema, geometry, history, persistence, export) stays framework-free and unit-testable; React is only a rendering shell.
- **Refs:** #2, keymap-app/


### D2 — Manage state via useReducer + Context, no state library

- **Category:** arch
- **Source:** prd-from-grill-me
- **Rationale:** Single-document editor state is simple; immutable reducer state doubles as the undo/redo snapshot source. Redux/Zustand add deps for no gain.
- **Refs:** #2, keymap-app/


### D3 — Hardcode Sofle Choc geometry as a static hand-authored table

- **Category:** arch
- **Source:** prd-from-grill-me
- **Rationale:** Derived once from josefadamcik.github.io Sofle Choc layout image (user-confirmed ground truth). No parser/KLE import — mirrors QMK static info.json.
- **Refs:** #2, keymap-app/


### D4 — Defer layerRef slot 4; reserve top-right corner and schema headroom

- **Category:** arch
- **Source:** prd-from-grill-me
- **Rationale:** Spec contradiction (symbol-only storage vs layer-color default) parked by user: cut from v1, keep rendering corner and schema extensible for later.
- **Refs:** #2, keymap-app/


### D5 — Persistence: file-input/download baseline, FSA write-back only on localhost

- **Category:** arch
- **Source:** prd-from-grill-me
- **Rationale:** File System Access API is unreliable on file://; user chose baseline-everywhere plus in-place write-back only when served (npx serve or similar).
- **Refs:** #2, keymap-app/


### D6 — Bundle to single index.html via vite-plugin-singlefile

- **Category:** arch
- **Source:** prd-from-grill-me
- **Rationale:** Tool must open by double-click via file:// with zero setup and no runtime deps; all JS/CSS/font inlined.
- **Refs:** #2, keymap-app/


### D7 — Render keyboard as inline SVG, one group per key

- **Category:** arch
- **Source:** prd-from-grill-me
- **Rationale:** Native transform/rotate handles angled thumb clusters; text-per-corner legends; live SVG serializes directly into the per-layer SVG export.
- **Refs:** #2, keymap-app/


### D8 — Key ids are side+row+col (L-r2-c4); encoders L-enc/R-enc

- **Category:** decision
- **Source:** prd-from-grill-me
- **Rationale:** Readable and stable when hand-editing JSON; maps directly to the physical board and geometry table. Flat ZMK index rejected as opaque.
- **Refs:** #2, keymap-app/


### D9 — Persist { schemaVersion: 1, layers }; omit unset legend slots

- **Category:** decision
- **Source:** prd-from-grill-me
- **Rationale:** schemaVersion protects a future ZMK importer from breaking old files; omitting empty slots keeps files clean and makes "unset" unambiguous.
- **Refs:** #2, keymap-app/


### D10 — Encoders carry the same legend slots as keys

- **Category:** decision
- **Source:** prd-from-grill-me
- **Rationale:** User wants press/rotate behaviors documented; sharing KeyLegends avoids a special-cased encoder data model.
- **Refs:** #2, keymap-app/


### D11 — Embed Noto Sans Symbols 2 subset for symbol glyphs

- **Category:** decision
- **Source:** prd-from-grill-me
- **Rationale:** System fonts render media/system icons inconsistently; OFL subset woff2 checked in with pyftsubset regeneration script guarantees identical output.
- **Refs:** #2, keymap-app/


### D12 — Surface errors via inline status bar; modal only for layer delete

- **Category:** decision
- **Source:** prd-from-grill-me
- **Rationale:** Non-blocking strip persists until next action, needs no toast lib; sole blocking dialog is the destructive layer-delete confirm.
- **Refs:** #2, keymap-app/


### D13 — Include snapshot undo/redo in v1

- **Category:** decision
- **Source:** prd-from-grill-me
- **Rationale:** Spec omitted it; with explicit-save-only persistence one mis-click loses work. Immutable reducer state makes snapshots near-free.
- **Refs:** #2, keymap-app/


### D14 — Boot with one empty default layer; no seed keymap content

- **Category:** decision
- **Source:** prd-from-grill-me
- **Rationale:** User rejected spec's 5 prefilled layers (Base/Red/Blue/Purple/spare) — no parsing means nothing real to prefill; clean slate chosen.
- **Refs:** #2, keymap-app/


<!-- from slice #9 -->


<!-- from slice #8 -->


<!-- from slice #6 -->


<!-- from slice #4 -->


<!-- from slice #3 -->


<!-- from slice #7 -->


<!-- from slice #5 -->

