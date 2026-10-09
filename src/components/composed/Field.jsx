import * as React from "react";
import { cn } from "@/lib/utils";
import { Input as ArcInput } from "@/components/arc/input/input";
import { Textarea as ArcTextarea } from "@/components/arc/textarea/textarea";
import { Input as UiInput } from "@/components/ui/input";
import { Textarea as UiTextarea } from "@/components/ui/textarea";
import styles from "./Field.module.css";

/**
 * Labelled form control with hint and error slots.
 *
 * MAIA had five competing input styles (INPUT_CLASS, two copies of INPUT_CLEAN,
 * GlassInput, and bare inline classes) and no validation display anywhere, an
 * empty submit silently no-opped. Field is the single wrapper: it owns the
 * label/control association, `aria-invalid`, and `aria-describedby`, so those
 * can't drift per-page again.
 *
 * Wraps a single control child and injects the wiring:
 *
 *   <Field label="Title" error={err}><Input value={v} onChange={…} /></Field>
 *
 * When the child is MAIA's text Input or Textarea, Field renders Arc's own
 * input / textarea instead (visible label, hint and error tied to the field,
 * Arc's animated messages). Any other child (button groups, custom layouts)
 * gets the same label / hint / error chrome around it.
 */
const ARC_CONTROLS = new Map([
  [UiInput, ArcInput],
  [UiTextarea, ArcTextarea],
]);

const hasSrOnly = (labelClassName) => /(^|\s)sr-only(\s|$)/.test(labelClassName ?? "");

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

  const isElement = React.isValidElement(children);
  // Passing `htmlFor` opts out of control injection: the caller has its own
  // layout around the control (an icon button beside the input, say) and
  // wires the id itself.
  const ArcControl = isElement && !htmlFor ? ARC_CONTROLS.get(children.type) : undefined;

  if (ArcControl && label) {
    const { className: controlClassName, ...controlProps } = children.props;
    return (
      <div
        className={cn(styles.arcField, hasSrOnly(labelClassName) && styles.srOnlyLabel, className)}
        {...props}
      >
        <ArcControl
          {...controlProps}
          id={controlProps.id ?? id}
          className={controlClassName}
          label={label}
          description={error ? undefined : hint}
          error={error || undefined}
          aria-required={required || undefined}
        />
      </div>
    );
  }

  const describedBy = [hint && !error ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(" ") || undefined;

  // Inject the association onto the control without every caller repeating it.
  // Cloning would put the id on a wrapper div and duplicate it when `htmlFor`
  // is set, so that case passes children through untouched.
  const control = isElement && !htmlFor
    ? React.cloneElement(children, {
        id: children.props.id ?? id,
        "aria-invalid": error ? true : children.props["aria-invalid"],
        "aria-describedby": describedBy ?? children.props["aria-describedby"],
        "aria-required": required || undefined,
      })
    : children;

  return (
    <div className={cn(styles.field, className)} {...props}>
      {label && (
        <label htmlFor={id} className={cn(styles.label, labelClassName)}>
          {label}
        </label>
      )}
      {control}
      {hint && !error && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}

export { Field };
