import * as React from "react";
import { AppDialog } from "@/components/composed/AppDialog";
import { Button } from "@/components/arc/button/button";
import { Input } from "@/components/arc/input/input";

/**
 * Single-field dialog (rename, quick-create, anything that asks for one value),
 * built on Arc's `dialog` and `input`.
 *
 * Validation shows a message through the input's own error slot rather than
 * silently no-opping on an empty submit. `onSubmit` may return a promise: the
 * submit button shows its loading state until it settles.
 */
const isThenable = (value) => Boolean(value) && typeof value.then === "function";

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
  const [isPending, setIsPending] = React.useState(false);
  const inputRef = React.useRef(null);

  // Reset whenever the dialog is reopened, so a previous edit doesn't leak in.
  React.useEffect(() => {
    if (open) {
      setValue(initialValue);
      setError(null);
      setTouched(false);
      setIsPending(false);
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

  const handleSubmit = async (event) => {
    event?.preventDefault();
    if (isPending) return;
    const problem = runValidation(value);
    setTouched(true);
    setError(problem);
    if (problem) return;
    try {
      const result = onSubmit?.(value.trim());
      if (isThenable(result)) {
        setIsPending(true);
        await result;
      }
      onClose?.();
    } catch (submitError) {
      console.error("PromptDialog: onSubmit failed", submitError);
      setError("Couldn't save. Try again.");
    } finally {
      setIsPending(false);
    }
  };

  // Radix would focus the close button first; the field is the point of this dialog.
  const focusInput = (event) => {
    event.preventDefault();
    inputRef.current?.focus();
  };

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      contentClassName="overflow-visible"
      onOpenAutoFocus={focusInput}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            {cancelLabel}
          </Button>
          <Button loading={isPending} onClick={handleSubmit}>
            {submitLabel}
          </Button>
        </>
      }
      {...props}
    >
      <form onSubmit={handleSubmit}>
        <Input
          ref={inputRef}
          label={label}
          value={value}
          placeholder={placeholder}
          onChange={handleChange}
          onBlur={() => {
            setTouched(true);
            setError(runValidation(value));
          }}
          error={error ?? undefined}
        />
      </form>
    </AppDialog>
  );
}

export { PromptDialog };
