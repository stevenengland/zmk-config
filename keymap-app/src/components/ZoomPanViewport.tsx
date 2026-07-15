import {
  useEffect,
  useCallback,
  useRef,
  useState,
  type AriaRole,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import "./ZoomPanViewport.css";
import { anchoredScroll } from "./zoomPanMath";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
const BUTTON_STEP = 0.1;
const WHEEL_STEP = 0.005;

function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

interface ZoomPanViewportProps {
  ariaLabel: string;
  children: ReactNode;
  fitWidth: number;
  role?: AriaRole;
  contentClassName?: string;
}

interface Point {
  x: number;
  y: number;
}

interface PanStart extends Point {
  pointerId: number;
  left: number;
  top: number;
}

interface PinchStart {
  distance: number;
  midpoint: Point;
  zoom: number;
  left: number;
  top: number;
}

function distance([first, second]: Point[]): number {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function midpoint([first, second]: Point[]): Point {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

export function ZoomPanViewport({
  ariaLabel,
  children,
  fitWidth,
  role = "region",
  contentClassName,
}: ZoomPanViewportProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(zoom);
  const pointersRef = useRef(new Map<number, Point>());
  const panStartRef = useRef<PanStart | null>(null);
  const pinchStartRef = useRef<PinchStart | null>(null);
  zoomRef.current = zoom;

  const setAnchoredZoom = useCallback((nextZoom: number, pointer: Point) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const previousZoom = zoomRef.current;
    const next = clampZoom(nextZoom);
    if (next === previousZoom) return;
    viewport.scrollLeft = anchoredScroll(previousZoom, next, viewport.scrollLeft, pointer.x);
    viewport.scrollTop = anchoredScroll(previousZoom, next, viewport.scrollTop, pointer.y);
    zoomRef.current = next;
    setZoom(next);
  }, []);

  const fit = useCallback(() => {
    const width = viewportRef.current?.clientWidth ?? 0;
    if (width > 0) setAnchoredZoom(width / fitWidth, { x: 0, y: 0 });
  }, [fitWidth, setAnchoredZoom]);

  useEffect(() => {
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [fit]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const bounds = viewport.getBoundingClientRect();
      setAnchoredZoom(zoomRef.current - event.deltaY * WHEEL_STEP, {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });
    };
    viewport.addEventListener("wheel", handleWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handleWheel);
  }, [setAnchoredZoom]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = Array.from(pointersRef.current.values());
    if (points.length === 1) {
      panStartRef.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        left: viewport.scrollLeft,
        top: viewport.scrollTop,
      };
    } else if (points.length === 2) {
      panStartRef.current = null;
      pinchStartRef.current = {
        distance: distance(points),
        midpoint: midpoint(points),
        zoom: zoomRef.current,
        left: viewport.scrollLeft,
        top: viewport.scrollTop,
      };
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    if (!viewport || !pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = Array.from(pointersRef.current.values());
    if (points.length === 2 && pinchStartRef.current) {
      const start = pinchStartRef.current;
      const next = clampZoom(start.zoom * (distance(points) / start.distance));
      viewport.scrollLeft = anchoredScroll(start.zoom, next, start.left, start.midpoint.x);
      viewport.scrollTop = anchoredScroll(start.zoom, next, start.top, start.midpoint.y);
      zoomRef.current = next;
      setZoom(next);
    } else if (points.length === 1 && panStartRef.current?.pointerId === event.pointerId) {
      const start = panStartRef.current;
      viewport.scrollLeft = start.left + start.x - event.clientX;
      viewport.scrollTop = start.top + start.y - event.clientY;
    }
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    panStartRef.current = null;
    pinchStartRef.current = null;
  };

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className="km-zoom-pan">
      <div className="km-zoom-pan__controls" aria-label={`${ariaLabel} controls`}>
        <button type="button" className="km-btn" onClick={fit}>Fit</button>
        <button
          type="button"
          className="km-btn"
          aria-label="Zoom out"
          onClick={() => setAnchoredZoom(zoom - BUTTON_STEP, { x: 0, y: 0 })}
        >
          −
        </button>
        <input
          type="range"
          aria-label="Zoom"
          aria-valuetext={`${zoomPercent}%`}
          min={MIN_ZOOM * 100}
          max={MAX_ZOOM * 100}
          value={zoom * 100}
          onChange={(event) => setAnchoredZoom(Number(event.target.value) / 100, { x: 0, y: 0 })}
        />
        <span aria-hidden>{zoomPercent}%</span>
        <button
          type="button"
          className="km-btn"
          aria-label="Zoom in"
          onClick={() => setAnchoredZoom(zoom + BUTTON_STEP, { x: 0, y: 0 })}
        >
          +
        </button>
      </div>
      <div
        ref={viewportRef}
        className="km-zoom-pan__viewport"
        role={role}
        aria-label={ariaLabel}
        style={{ overflowY: "auto" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <div
          className={["km-zoom-pan__content", contentClassName].filter(Boolean).join(" ")}
          style={{ transform: `scale(${zoom})` }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
