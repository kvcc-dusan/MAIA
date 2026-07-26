import * as React from "react";
import { cn } from "@/lib/utils";
import { GlassErrorBoundary } from "@/components/GlassErrorBoundary";
import { IconButton } from "@/components/composed/IconButton";
import { GripVertical, Maximize2, Minimize2, X } from "lucide-react";

/**
 * The one dashboard widget chrome.
 *
 * The three Today cards each hand-copied the same
 * `rounded-2xl border border-border bg-card/40 shadow-lg backdrop-blur-xl`
 * string, with diverging header/footer padding and — worse — inconsistent
 * error-boundary placement (WorldMap was wrapped by the page, the other two
 * wrapped themselves). The shell owns all of it, so a new widget is just
 * content.
 *
 * Edit-mode controls live here rather than in each widget: drag handle, a
 * 1↔2 column span toggle, and remove.
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
      className={cn(
        "group/widget relative flex min-h-0 flex-col overflow-hidden rounded-2xl",
        "border border-border bg-card/40 supports-backdrop-filter:backdrop-blur-xl shadow-raised",
        isDragging && "opacity-60 ring-2 ring-ring",
        className
      )}
      {...props}
    >
      <header className="flex flex-none items-center justify-between gap-2 px-5 pt-5 pb-0">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </h2>
        <div className="flex items-center gap-1">
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
                className="cursor-grab touch-none rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground active:cursor-grabbing"
                {...dragHandleProps}
              >
                <GripVertical className="size-4" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </header>

      <div className={cn("min-h-0 flex-1 px-5 pt-3 pb-5", bodyClassName)}>
        <GlassErrorBoundary title={`${title} unavailable`}>{children}</GlassErrorBoundary>
      </div>

      {footer && (
        <footer className="flex flex-none items-center justify-between border-t border-border-subtle bg-muted/20 px-5 py-3">
          {footer}
        </footer>
      )}
    </section>
  );
}

export { Widget };
