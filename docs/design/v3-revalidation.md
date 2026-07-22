# Revalidation — #54 (v3 design vs. enriched keymap)

Re-tests the v3 design in PRD #46 against `config/keymap.json` (the
now-populated representative document) and the current `keymap-app`
UI/schema. Per D10, amends PRD #46 or its decision anchor if the
design doesn't hold. **Outcome: design holds. No PRD or decision
amendment required.**

## Representative content → v3 model mapping

`config/keymap.json` is schemaVersion 1/2 (glyph/presentation model,
`keymap-app/src/model/schema.ts`) — pre-dates the v3 typed-action
document. Mapping below is glyph-content → proposed v3 concept.

| Enriched JSON content | v3 target | Notes |
|---|---|---|
| `layers[].keys[].primary` plain letter/symbol (`Q`, `ESC`, `⇥`, `CT`, `⌘`, `ALT`, `⇧`, `⏎`) | Key-press action (`KEYBOARD_*` / `MODIFIER_*` usage) | Presentation glyph only; v3 requires an explicit typed action selection per key — no inference from the glyph. |
| Digit row `primary`/`shifted`/`altgr` (e.g. `"2"` / `"\""` / `"²"`) | Single key-press action (`KEYBOARD_N2`) resolved per active Locale Profile | Confirms Problem Statement: three freeform strings can't safely reconstruct one action + locale. Out of Scope already excludes automatic v1/v2 inference — re-authoring via the v3 UI is expected, not a gap. |
| `L-r0-c0`..`R-r3-c5` position keys, `L-r4-*`/`R-r4-*` thumb keys | Board descriptor stable position IDs | Already defined in `keymap-app/src/model/geometry.ts` (`${side}-r${row}-c${col}`) and used by the live canvas. Recommend the v3 board descriptor adopt this scheme verbatim rather than a new ID format — satisfies D4's "stable, readable, kind-prefixed" requirement with zero UI rework. |
| (no keys bound — `L-enc`/`R-enc` absent from the document) | Board descriptor encoder press positions | IDs already exist in `geometry.ts` (`kind: "encoder"`); `config/sofle.conf` has `CONFIG_EC11` commented out, which is fine — that flag gates rotation (out of scope per PRD), not the press switch. No binding exists yet in the representative content to exercise this path; low risk since the ID scheme and generator requirement are already fully specified. |
| Layer `Nav` (`R-r2-c4`/`R-r3-c4`/`R-r3-c3`/`R-r3-c5`, duplicating Base's arrow glyphs) | Layer entity + a layer-activation action (hold-tap or toggle) reaching it | No binding in the document currently activates `Nav` — it is visually defined but unreachable. Design already specifies layer-hold and toggle actions in full (D1, D6); this is a content gap, not a design gap. |
| `hold`, `taps`, `macro` fields on `KeyLegend` (schema supports them; unused in this document) | Hold-tap / tap-dance compositions, Macro registry entries | Zero real examples in the representative content. `MacroDef.steps` in the current schema is a free-text prose summary (`"Ctrl+C, wait, Ctrl+V"`) — confirms D8's typed step-array (`tap`/`press`/`release`/`wait`/`tapDuration`/`pauseUntilRelease`) is the correct replacement, since prose steps aren't machine-actionable. |
| `keys[].color` (per-key, e.g. `L-r4-c3` Shift tinted `#0011ff`) | Per-key display override | Presentation only; covered by "generation ignores display fields" (PRD Solution ¶1) and User Story 4. No new decision needed. |
| `layers[].color` (`Base` `#00e5ff`, `Nav` `#d4bbff`) | Layer display tint | Presentation only, same as above — used only to tint a layer-hold's resolved glyph (`resolveHoldDisplay`). |
| `board.homing` (present in schema, unset in this document) | — | Presentation-only home-row marker; not mentioned in the v3 document model and doesn't need to be — covered by the same "display fields are ignored by generation" principle. |

## Gap found

The enriched document exercises only plain key-press glyphs. It has
no hold-tap, toggle, macro, or tap-dance usage, and defines `Nav` as
a layer with no way to reach it. This means the richer parts of the
v3 action catalog (hold-tap, toggle, tap-dance, macros) are validated
against the PRD's own field-level decisions (D1, D6, D8) but not
against real authored content.

**Assessment: not a design gap.** Every action variant is already
specified at the decision level in PRD #46 (D1–D11), and the PRD's
own Testing Decisions call for golden-file fixtures for these paths
rather than reliance on hand-authored examples. No PRD or decision
anchor changes are required.

## Human approval

Approved as-is by the product owner in the #54 ship-light session —
proceed with implementation on the existing PRD #46 / decision anchor
D1–D11 without amendment. No unresolved changes.
