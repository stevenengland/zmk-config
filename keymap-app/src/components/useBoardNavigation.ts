import { useRef, useState, type KeyboardEvent } from "react";
import type { BoardElement } from "../model/geometry";

type Direction = "up" | "down" | "left" | "right";

interface UseBoardNavigationOptions {
  elements: readonly BoardElement[];
  selectedId?: string | null;
  onActivate?: (id: string) => void;
}

function positionCenter(element: BoardElement) {
  return element.kind === "encoder"
    ? { x: element.x, y: element.y }
    : { x: element.x + element.w / 2, y: element.y + element.h / 2 };
}

function nearestPosition(
  elements: readonly BoardElement[],
  id: string,
  direction: Direction,
) {
  const current = elements.find((element) => element.id === id);
  if (!current) return undefined;
  const origin = positionCenter(current);

  return elements
    .filter((candidate) => {
      if (candidate.id === id) return false;
      const point = positionCenter(candidate);
      if (direction === "up") return point.y < origin.y;
      if (direction === "down") return point.y > origin.y;
      if (direction === "left") return point.x < origin.x;
      return point.x > origin.x;
    })
    .map((candidate) => {
      const point = positionCenter(candidate);
      return {
        candidate,
        distance: (point.x - origin.x) ** 2 + (point.y - origin.y) ** 2,
      };
    })
    .sort((a, b) => a.distance - b.distance)[0]?.candidate;
}

export function useBoardNavigation({
  elements,
  selectedId,
  onActivate,
}: UseBoardNavigationOptions) {
  const [focusAnchorId, setFocusAnchorId] = useState(selectedId ?? elements[0].id);
  const positionRefs = useRef(new Map<string, SVGGElement>());

  const focusPosition = (id: string, direction: Direction) => {
    const next = nearestPosition(elements, id, direction);
    if (!next) return;
    setFocusAnchorId(next.id);
    positionRefs.current.get(next.id)?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<SVGGElement>, id: string) => {
    const directionByKey: Partial<Record<string, Direction>> = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
    };
    const direction = directionByKey[event.key];
    if (direction) {
      event.preventDefault();
      focusPosition(id, direction);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onActivate?.(id);
    }
  };

  const selectPosition = (id: string) => {
    setFocusAnchorId(id);
    positionRefs.current.get(id)?.focus();
    onActivate?.(id);
  };

  const positionProps = (id: string) => ({
    tabIndex: (id === focusAnchorId ? 0 : -1) as 0 | -1,
    onFocus: setFocusAnchorId,
    onKeyDown: handleKeyDown,
    onSelect: selectPosition,
    elementRef: (node: SVGGElement | null) => {
      if (node) positionRefs.current.set(id, node);
      else positionRefs.current.delete(id);
    },
  });

  return { positionProps };
}
