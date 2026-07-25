import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * The single confirmation surface.
 *
 * Replaces three competing mechanisms — `window.confirm`, LedgerPage's local
 * ConfirmModal, and NotesPage's one-off modal — plus the deletes that had no
 * confirmation at all (single note, task, signal, asset).
 *
 * `tone="danger"` is the default because every current caller is destructive.
 */
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
  const handleOpenChange = React.useCallback(
    (next) => {
      onOpenChange?.(next);
      if (!next) onClose?.();
    },
    [onOpenChange, onClose]
  );

  const handleConfirm = React.useCallback(() => {
    onConfirm?.();
    onClose?.();
  }, [onConfirm, onClose]);

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange} {...props}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={tone === "danger" ? "destructive" : "default"}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export { ConfirmDialog };
