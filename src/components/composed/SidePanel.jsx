import * as React from "react";
import { cn } from "@/lib/utils";
import { Drawer, DrawerContent } from "@/components/arc/drawer/drawer";
import styles from "./SidePanel.module.css";

/**
 * Slide-in panel for secondary controls, built on Arc's `drawer`.
 *
 * Replaces the hand-rolled GraphControls drawer and gives ChronosModal's right
 * column somewhere to go on narrow windows. Arc supplies the header, close
 * button, drag-to-dismiss and motion; this adds the sticky footer.
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

  // Radix only restores focus to a <Trigger>, and MAIA opens panels from plain
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

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} {...props}>
      {/* Arc requires a title; a panel without one still needs an accessible name. */}
      <DrawerContent
        side={side}
        title={title ?? "Panel"}
        description={description}
        className={className}
        onCloseAutoFocus={handleCloseAutoFocus}
      >
        <div className={cn(styles.content, contentClassName)}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </DrawerContent>
    </Drawer>
  );
}

export { SidePanel };
