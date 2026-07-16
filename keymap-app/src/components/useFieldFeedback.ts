import { useCallback, useId, useState, type CSSProperties } from "react";

// Colors drawn from the "Engineering Chic" colorset (docs/design/stitch.md), matching StatusBar's error tone.
const ERROR = "#ffb4ab";

/** Props for one control: the error border and associations only while it is invalid. */
export interface FieldInputProps {
  style: CSSProperties;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
}

export interface FieldFeedback {
  /** Marks `name` invalid and shows `message` beside its control. */
  report: (name: string, message: string) => void;
  /** Drops the error association for `name`; a no-op when it is already valid. */
  clear: (name: string) => void;
  /** Drops every error association at once, e.g. when the editor rebinds to another key. */
  reset: () => void;
  error: (name: string) => { id: string; message: string } | undefined;
  /**
   * Input props for `name`, merged onto `base`. The error border is applied here
   * rather than in a stylesheet because the controls style themselves inline,
   * which outranks any class rule.
   */
  fieldProps: (name: string, base: CSSProperties) => FieldInputProps;
}

/**
 * Validation state for the fields one component owns: an invalid value stays in
 * its control with an accessible explanation beside it, and only a valid value
 * is handed on to the document (PRD #45 decision anchor D6 — field feedback
 * belongs at the field; the status bar carries operation results).
 */
export function useFieldFeedback(): FieldFeedback {
  const scope = useId();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const report = useCallback((name: string, message: string) => {
    setErrors((prev) => (prev[name] === message ? prev : { ...prev, [name]: message }));
  }, []);

  const clear = useCallback((name: string) => {
    setErrors((prev) => {
      if (!(name in prev)) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setErrors((prev) => (Object.keys(prev).length === 0 ? prev : {}));
  }, []);

  const error = (name: string) => {
    const message = errors[name];
    return message === undefined ? undefined : { id: `${scope}${name}-error`, message };
  };

  const fieldProps = (name: string, base: CSSProperties): FieldInputProps => {
    const current = error(name);
    if (!current) return { style: base };
    return {
      style: { ...base, borderColor: ERROR },
      "aria-invalid": true,
      "aria-describedby": current.id,
    };
  };

  return { report, clear, reset, error, fieldProps };
}
