import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Empty state.
 *
 * There were ~24 of these across the app, every one worded and styled
 * differently — two different italic greys and an uppercase tracked-out
 * variant all coexisted for the same idea.
 *
 * `size="inline"` is for the small in-panel cases (a widget with no items);
 * `size="page"` is for a whole empty route.
 */
const emptyVariants = cva("flex flex-col items-center justify-center text-center", {
  variants: {
    size: {
      inline: "gap-2 py-6",
      page: "gap-4 py-20",
    },
  },
  defaultVariants: { size: "inline" },
});

function EmptyState({ icon: Icon, title, description, action, size, className, ...props }) {
  return (
    <div className={cn(emptyVariants({ size }), className)} {...props}>
      {Icon && (
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-muted text-subtle-foreground",
            size === "page" ? "size-14" : "size-9"
          )}
          aria-hidden="true"
        >
          <Icon className={size === "page" ? "size-6" : "size-4"} />
        </div>
      )}
      {title && (
        <p
          className={cn(
            "text-muted-foreground",
            size === "page" ? "text-base font-medium text-foreground" : "text-sm"
          )}
        >
          {title}
        </p>
      )}
      {description && (
        <p className="max-w-sm text-xs text-subtle-foreground">{description}</p>
      )}
      {action}
    </div>
  );
}

export { EmptyState };
