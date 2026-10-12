import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { Dialog, DialogClose, DialogContent } from "@/components/arc/dialog/dialog";
import styles from "./AppDialog.module.css";

/**
 * The modal shell every dialog in MAIA uses, built on Arc's `dialog`.
 *
 * Written controlled (`open` / `onClose`) because that is how MAIA's existing
 * modal state works. Arc owns the chrome (header, close button, motion, focus
 * trap, Escape); this adds size steps, and a body that scrolls under a sticky footer.
 *
 * `showCloseButton={false}` means a headerless working surface (Chronos). Arc's
 * dialog always draws a header and close button, so that case is a Radix shell.
 */
const SIZE_CLASS = {
  sm: styles.sm,
  md: undefined, // Arc's default width
  form: styles.form,
  lg: styles.lg,
  xl: styles.xl,
  full: styles.full,
};

const hasContent = (node) => node !== null && node !== undefined && node !== false;

function BareDialog({ title, description, footer, className, contentClassName, children, ...contentProps }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={styles.overlay} />
      <DialogPrimitive.Content {...contentProps} className={cn(styles.bare, className)}>
        <DialogPrimitive.Title className={styles.srOnly}>{title}</DialogPrimitive.Title>
        <DialogPrimitive.Description className={styles.srOnly}>{description}</DialogPrimitive.Description>
        <div className={cn(styles.bareBody, contentClassName)}>{children}</div>
        {hasContent(footer) && <div className={styles.bareFooter}>{footer}</div>}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function AppDialog({
  open,
  onClose,
  onOpenChange,
  title,
  description,
  size = "md",
  footer,
  className,
  contentClassName,
  showCloseButton = true,
  onOpenAutoFocus,
  onCloseAutoFocus,
  children,
  ...props
}) {
  const handleOpenChange = React.useCallback(
    (next) => {
      onOpenChange?.(next);
      if (!next) onClose?.();
    },
    [onOpenChange, onClose]
  );

  // Radix only restores focus to a <Trigger>, and MAIA opens dialogs from plain
  // state, so remember what had focus at open and hand it back on close.
  const returnFocusRef = React.useRef(null);
  React.useLayoutEffect(() => {
    if (open) returnFocusRef.current = document.activeElement;
  }, [open]);
  const handleCloseAutoFocus = React.useCallback(
    (event) => {
      onCloseAutoFocus?.(event);
      const target = returnFocusRef.current;
      if (target instanceof HTMLElement && target.isConnected) target.focus();
    },
    [onCloseAutoFocus]
  );

  const focusProps = { onOpenAutoFocus, onCloseAutoFocus: handleCloseAutoFocus };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} {...props}>
      {showCloseButton ? (
        <DialogContent
          {...focusProps}
          title={title}
          description={description}
          className={cn(styles.dialog, SIZE_CLASS[size], className)}
        >
          {hasContent(children) && <div className={contentClassName}>{children}</div>}
          {hasContent(footer) && <div className={styles.footer}>{footer}</div>}
        </DialogContent>
      ) : (
        <BareDialog
          {...focusProps}
          title={title}
          description={description}
          footer={footer}
          className={className}
          contentClassName={contentClassName}
        >
          {children}
        </BareDialog>
      )}
    </Dialog>
  );
}

export { AppDialog, DialogClose };
