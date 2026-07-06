import type { CSSProperties } from "react";

// Colors drawn from the "Engineering Chic" colorset (docs/design/stitch.md).
const SURFACE_CONTAINER = "#20201f";
const OUTLINE_VARIANT = "#3b494c";
const ON_SURFACE_VARIANT = "#bac9cc";
const ON_ERROR_CONTAINER = "#ffdad6";
const ERROR = "#ffb4ab";

export type StatusTone = "info" | "error";

export interface StatusMessage {
  text: string;
  tone: StatusTone;
}

interface StatusBarProps {
  message: StatusMessage | null;
}

function barStyle(tone: StatusTone): CSSProperties {
  return {
    minHeight: 24,
    display: "flex",
    alignItems: "center",
    padding: "0 12px",
    borderTop: `1px solid ${OUTLINE_VARIANT}`,
    background: SURFACE_CONTAINER,
    color: tone === "error" ? ON_ERROR_CONTAINER : ON_SURFACE_VARIANT,
    fontFamily: "JetBrains Mono, monospace",
    fontSize: 12,
  };
}

/**
 * Inline status bar: the app's non-blocking result/error surface. Errors (e.g.
 * an invalid codepoint) render in the error tone; an empty message renders the
 * bar blank so its height stays reserved.
 */
export function StatusBar({ message }: StatusBarProps) {
  const tone = message?.tone ?? "info";
  return (
    <div role="status" aria-live="polite" style={barStyle(tone)}>
      {message ? (
        <span style={tone === "error" ? { color: ERROR } : undefined}>{message.text}</span>
      ) : null}
    </div>
  );
}
