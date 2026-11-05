import { useId, type ReactNode } from "react";
import { Label } from "./label";
export function Field({
  label,
  error,
  children,
  hint,
  id,
}: {
  label: string;
  error?: string;
  children: (id: string) => ReactNode;
  hint?: string;
  id?: string;
}) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <div className="field">
      <Label htmlFor={fieldId}>{label}</Label>
      {children(fieldId)}
      {error ? (
        <p id={`${fieldId}-error`} className="field-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="field-hint">{hint}</p>
      ) : null}
    </div>
  );
}
