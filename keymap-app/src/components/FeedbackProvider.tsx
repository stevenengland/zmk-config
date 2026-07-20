import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import "./FeedbackProvider.css";

type FeedbackTone = "success" | "error";

interface FeedbackNotice {
  text: string;
  tone: FeedbackTone;
}

interface FeedbackActions {
  success: (text: string) => void;
  error: (text: string) => void;
  clear: () => void;
}

interface FeedbackProviderProps {
  children: ReactNode;
  sheetOpen: boolean;
}

const FeedbackContext = createContext<FeedbackActions | null>(null);

export function FeedbackProvider({ children, sheetOpen }: FeedbackProviderProps) {
  const [notice, setNotice] = useState<FeedbackNotice | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const deadlineRef = useRef(0);
  const remainingRef = useRef(4_000);
  const hoverPausedRef = useRef(false);
  const focusPausedRef = useRef(false);
  const actions = useMemo<FeedbackActions>(() => ({
    success: (text) => setNotice({ text, tone: "success" }),
    error: (text) => setNotice({ text, tone: "error" }),
    clear: () => setNotice(null),
  }), []);

  useEffect(() => {
    if (notice?.tone !== "success") return;
    remainingRef.current = 4_000;
    deadlineRef.current = Date.now() + remainingRef.current;
    timeoutRef.current = window.setTimeout(() => setNotice(null), remainingRef.current);
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    };
  }, [notice]);

  const pauseDismissal = (source: "hover" | "focus") => {
    if (source === "hover") hoverPausedRef.current = true;
    else focusPausedRef.current = true;
    if (timeoutRef.current === null) return;
    remainingRef.current = Math.max(0, deadlineRef.current - Date.now());
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  };

  const resumeDismissal = (source: "hover" | "focus") => {
    if (source === "hover") hoverPausedRef.current = false;
    else focusPausedRef.current = false;
    if (hoverPausedRef.current || focusPausedRef.current || notice?.tone !== "success") return;
    deadlineRef.current = Date.now() + remainingRef.current;
    timeoutRef.current = window.setTimeout(() => setNotice(null), remainingRef.current);
  };

  return (
    <FeedbackContext.Provider value={actions}>
      {children}
      {notice ? (
        <div
          className={`km-feedback${sheetOpen ? " km-feedback--sheet-open" : ""}`}
          role={notice.tone === "error" ? "alert" : "status"}
          aria-live={notice.tone === "error" ? "assertive" : "polite"}
          data-tone={notice.tone}
          tabIndex={0}
          onMouseEnter={() => pauseDismissal("hover")}
          onMouseLeave={() => resumeDismissal("hover")}
          onFocus={() => pauseDismissal("focus")}
          onBlur={() => resumeDismissal("focus")}
        >
          <span>{notice.text}</span>
          {notice.tone === "error" ? (
            <button
              type="button"
              className="km-feedback__dismiss"
              aria-label="Dismiss notification"
              onClick={() => setNotice(null)}
            >
              Close
            </button>
          ) : null}
        </div>
      ) : null}
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackActions {
  const feedback = useContext(FeedbackContext);
  if (!feedback) throw new Error("useFeedback must be used within FeedbackProvider");
  return feedback;
}
