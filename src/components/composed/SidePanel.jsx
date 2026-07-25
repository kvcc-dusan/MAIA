import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * Slide-in panel for secondary controls.
 *
 * Replaces the hand-rolled GraphControls drawer (which had its own
 * translate-x transition and a `fixed inset-0` click-away layer) and gives
 * ChronosModal's right column somewhere to go on narrow windows.
 */
function SidePanel({
  open,
  onClose,
  onOpenChange,
  side = "right",
  title,
  description,
  footer,
  className,
  contentClassName,
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

  return (
    <Sheet open={open} onOpenChange={handleOpenChange} {...props}>
      <SheetContent side={side} className={cn("flex flex-col gap-0", className)}>
        {(title || description) && (
          <SheetHeader>
            {title && <SheetTitle>{title}</SheetTitle>}
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
        )}
        <div className={cn("min-h-0 flex-1 overflow-y-auto custom-scrollbar p-4", contentClassName)}>
          {children}
        </div>
        {footer && <SheetFooter>{footer}</SheetFooter>}
      </SheetContent>
    </Sheet>
  );
}

export { SidePanel };
