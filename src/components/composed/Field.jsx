import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

/**
 * Labelled form control with hint and error slots.
 *
 * MAIA had five competing input styles (INPUT_CLASS, two copies of INPUT_CLEAN,
 * GlassInput, and bare inline classes) and no validation display anywhere — an
 * empty submit silently no-opped. Field is the single wrapper: it owns the
 * label/control association, `aria-invalid`, and `aria-describedby`, so those
 * can't drift per-page again.
 *
 * Wraps a single control child and injects the wiring:
 *
 *   <Field label="Title" error={err}><Input value={v} onChange={…} /></Field>
 */
function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  className,
  labelClassName,
  children,
  ...props
}) {
  const generatedId = React.useId();
  const id = htmlFor ?? generatedId;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy = [hint ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(" ") || undefined;

  // Inject the association onto the control without every caller repeating it.
  const control = React.isValidElement(children)
    ? React.cloneElement(children, {
        id: children.props.id ?? id,
        "aria-invalid": error ? true : children.props["aria-invalid"],
        "aria-describedby": describedBy ?? children.props["aria-describedby"],
        "aria-required": required || undefined,
      })
    : children;

  return (
    <div className={cn("flex flex-col gap-2", className)} {...props}>
      {label && (
        <Label htmlFor={id} className={labelClassName}>
          {label}
          {required && (
            <span className="text-destructive" aria-hidden="true">
              *
            </span>
          )}
        </Label>
      )}
      {control}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export { Field };
