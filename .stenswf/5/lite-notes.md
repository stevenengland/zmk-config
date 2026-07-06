# Lite Notes — #5

## Assumptions (plan-light)

## Assumptions (ship-light)
- Any `U+`-prefixed field value is treated as an intended codepoint; malformed hex (e.g. `U+ZZZZ`) yields a status-bar error rather than being stored literally.
- Slot fields commit on blur and on Enter.
- A "Reset color" control was added to revert a key's primary color to the layer default; it exercises the color-clear reducer path and supports the recolor AC.
- Encoders are selectable and legended identically to keys (user story 17); corner legends are placed within the encoder's circular bounding box.
- Status message clears on a new key selection and on a successful commit.
- Symbol picker and embedded Noto font are out of this slice (ACs cover free-type `U+XXXX` input only); deferred to a later slice.
