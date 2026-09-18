import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * The modal shell every dialog in MAIA uses.
 *
 * Replaces ~23 hand-rolled `fixed inset-0` shells. Those had no focus trap, no
 * scroll lock, no `role="dialog"` and inconsistent Escape handling — Base UI
 * provides all of it. Written controlled (`open` / `onClose`) because that is
 * how MAIA's existing modal state works.
 */
const panelSizes = cva("", {
  variants: {
    size: {
      sm: "sm:max-w-sm",
      md: "sm:max-w-md",
      lg: "sm:max-w-2xl",
      xl: "sm:max-w-4xl",
      // "full" means full-bleed: the whole viewport minus a 1rem breathing
      // margin. It used to cap at 72rem — a large centered card, not full.
      full: "sm:max-w-[calc(100%-2rem)] h-[calc(100dvh-2rem)]",
    },
  },
  defaultVariants: { size: "md" },
});

function AppDialog({
  open,
  onClose,
  onOpenChange,
  title,
  description,
  size,
  footer,
  className,
  contentClassName,
  showCloseButton = true,
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

  // A dialog with no visible title still needs an accessible name.
  const hasHeader = Boolean(title || description);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} {...props}>
      <DialogContent
        showCloseButton={showCloseButton}
        className={cn(
          "flex flex-col gap-5",
          // Without a ceiling, a tall body (the 58-icon picker, a long form)
          // grows past the viewport and takes the title and footer with it.
          // The body scrolls instead — see contentClassName below.
          size !== "full" && "max-h-[min(85vh,calc(100dvh-4rem))]",
          panelSizes({ size }),
          className
        )}
      >
        {hasHeader && (
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}
        <div className={cn("min-h-0 flex-1 overflow-y-auto custom-scrollbar", contentClassName)}>
          {children}
        </div>
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}

export { AppDialog, DialogClose };
