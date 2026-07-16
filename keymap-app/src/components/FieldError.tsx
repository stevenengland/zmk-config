import type { FieldFeedback } from "./useFieldFeedback";
import "./FieldError.css";

interface FieldErrorProps<Name extends string> {
  feedback: FieldFeedback<Name>;
  /** The field name reported to `feedback`, tying this text to that control. */
  name: Name;
}

/** The inline explanation for one field; renders nothing while the field is valid. */
export function FieldError<Name extends string>({ feedback, name }: FieldErrorProps<Name>) {
  const current = feedback.error(name);
  if (!current) return null;
  return (
    <p className="km-field-error" id={current.id} role="alert">
      {current.message}
    </p>
  );
}
