import * as React from "react";
import { AppDialog } from "@/components/composed/AppDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Single-field dialog — rename, quick-create, anything that asks for one value.
 *
 * Replaces LedgerPage's local RenameModal and the `window.prompt` in NotesPage,
 * which solved the same problem two different ways.
 *
 * This is also the first place in MAIA that shows a validation message rather
 * than silently no-opping on an empty submit.
 */
function PromptDialog({
  open,
  onClose,
  onSubmit,
  title = "Rename",
  description,
  label = "Name",
  placeholder,
  initialValue = "",
  submitLabel = "Save",
  cancelLabel = "Cancel",
  validate,
  ...props
}) {
  const [value, setValue] = React.useState(initialValue);
  const [error, setError] = React.useState(null);
  const [touched, setTouched] = React.useState(false);
  const inputId = React.useId();
  const errorId = `${inputId}-error`;

  // Reset whenever the dialog is reopened, so a previous edit doesn't leak in.
  React.useEffect(() => {
    if (open) {
      setValue(initialValue);
      setError(null);
      setTouched(false);
    }
  }, [open, initialValue]);

  const runValidation = React.useCallback(
    (next) => {
      const trimmed = next.trim();
      if (!trimmed) return `${label} can't be empty.`;
      return validate ? validate(trimmed) ?? null : null;
    },
    [label, validate]
  );

  const handleChange = (event) => {
    const next = event.target.value;
    setValue(next);
    if (touched) setError(runValidation(next));
  };

  const handleSubmit = (event) => {
    event?.preventDefault();
    const problem = runValidation(value);
    setTouched(true);
    setError(problem);
    if (problem) return;
    onSubmit?.(value.trim());
    onClose?.();
  };

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      contentClassName="overflow-visible"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button onClick={handleSubmit}>{submitLabel}</Button>
        </>
      }
      {...props}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <Label htmlFor={inputId}>{label}</Label>
        <Input
          id={inputId}
          value={value}
          placeholder={placeholder}
          autoFocus
          onChange={handleChange}
          onBlur={() => {
            setTouched(true);
            setError(runValidation(value));
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
        {error && (
          <p id={errorId} role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </form>
    </AppDialog>
  );
}

export { PromptDialog };
