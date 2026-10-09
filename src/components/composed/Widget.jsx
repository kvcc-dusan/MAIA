import * as React from "react";
import { cn } from "@/lib/utils";
import { GlassErrorBoundary } from "@/components/GlassErrorBoundary";
import { IconButton } from "@/components/composed/IconButton";
import { GripVertical, Maximize2, Minimize2, X } from "lucide-react";
import styles from "./Widget.module.css";

/**
 * The one dashboard widget chrome: bordered panel, title row, body inside an
 * error boundary, optional footer.
 *
 * Edit-mode controls live here rather than in each widget: drag handle, a
 * 1 to 2 column span toggle, and remove. `dragHandleProps` is spread on the
 * handle so dnd-kit's listeners and attributes land on it.
 */
function Widget({
  title,
  trailing,
  footer,
  isEditing = false,
  span = 1,
  canGrow = true,
  onToggleSpan,
  onRemove,
  dragHandleProps,
  isDragging = false,
  className,
  bodyClassName,
  children,
  ...props
}) {
  return (
    <section
      aria-label={title}
      className={cn("group/widget", styles.widget, isDragging && styles.dragging, className)}
      {...props}
    >
      <header className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <div className={styles.controls}>
          {!isEditing && trailing}
          {isEditing && (
            <>
              {canGrow && (
                <IconButton
                  label={span === 1 ? `Make ${title} wider` : `Make ${title} narrower`}
                  icon={span === 1 ? Maximize2 : Minimize2}
                  size="icon-xs"
                  onClick={onToggleSpan}
                />
              )}
              <IconButton
                label={`Remove ${title}`}
                icon={X}
                size="icon-xs"
                variant="destructive"
                onClick={onRemove}
              />
              <button
                type="button"
                aria-label={`Reorder ${title}`}
                className={styles.handle}
                {...dragHandleProps}
              >
                <GripVertical size={16} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </header>

      <div className={cn(styles.body, bodyClassName)}>
        <GlassErrorBoundary title={`${title} unavailable`}>{children}</GlassErrorBoundary>
      </div>

      {footer && <footer className={styles.footer}>{footer}</footer>}
    </section>
  );
}

export { Widget };
