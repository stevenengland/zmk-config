export function anchoredScroll(
  previousZoom: number,
  nextZoom: number,
  scroll: number,
  pointerOffset: number,
): number {
  return ((scroll + pointerOffset) / previousZoom) * nextZoom - pointerOffset;
}
