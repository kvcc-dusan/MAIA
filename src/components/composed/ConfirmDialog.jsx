import * as React from "react";
import { Button } from "@/components/arc/button/button";
import { AppDialog } from "@/components/composed/AppDialog";
import styles from "./ConfirmDialog.module.css";

/**
 * The single confirmation surface, built on AppDialog and Arc's `button`.
 *
 * Follows Arc's destructive pattern: Cancel takes focus first, the danger button
 * repeats the verb and object (`confirmLabel`), Escape closes, focus returns to
 * whatever opened it. `onConfirm` may return a promise: the button shows its
 * loading state until it settles, and a rejection keeps the dialog open.
 *
 * `tone="danger"` is the default because every current caller is destructive.
 */
const isThenable = (value) => Boolean(value) && typeof value.then === "function";

function ConfirmDialog({
  open,
  onClose,
  onOpenChange,
  onConfirm,
  title = "Are you sure?",
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  tone = "danger",
  ...props
}) {
  const cancelRef = React.useRef(null);
  const [isPending, setIsPending] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  // Start every open clean, so a past failure doesn't greet the next confirmation.
  React.useEffect(() => {
    if (open) {
      setIsPending(false);
      setFailed(false);
    }
  }, [open]);

  const handleOpenChange = React.useCallback(
    (next) => {
      if (!next && isPending) return;
      onOpenChange?.(next);
      if (!next) onClose?.();
    },
    [onOpenChange, onClose, isPending]
  );

  const handleConfirm = React.useCallback(async () => {
    setFailed(false);
    try {
      const result = onConfirm?.();
      if (isThenable(result)) {
        setIsPending(true);
        await result;
      }
      onClose?.();
    } catch (error) {
      console.error("ConfirmDialog: onConfirm failed", error);
      setFailed(true);
    } finally {
      setIsPending(false);
    }
  }, [onConfirm, onClose]);

  // Radix would focus the close button first. Destructive dialogs open on Cancel.
  const focusCancel = (event) => {
    event.preventDefault();
    cancelRef.current?.focus();
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      description={description}
      onOpenAutoFocus={focusCancel}
      footer={
        <>
          <Button ref={cancelRef} variant="secondary" onClick={() => handleOpenChange(false)} disabled={isPending}>
            {cancelLabel}
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} loading={isPending} onClick={handleConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
      {...props}
    >
      {failed && (
        <p role="alert" className={styles.error}>
          That didn't go through. Try again.
        </p>
      )}
    </AppDialog>
  );
}

export { ConfirmDialog };
