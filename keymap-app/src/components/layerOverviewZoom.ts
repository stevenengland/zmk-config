/**
 * Scroll offset that keeps the content point currently under the cursor pinned
 * in place across a scale change — the "zoom toward the cursor" behavior. The
 * pointer offset is measured from the scroll container's top/left edge.
 */
export function anchoredScroll(
  prevScale: number,
  nextScale: number,
  scroll: number,
  pointerOffset: number,
): number {
  const contentPoint = (scroll + pointerOffset) / prevScale;
  return contentPoint * nextScale - pointerOffset;
}
