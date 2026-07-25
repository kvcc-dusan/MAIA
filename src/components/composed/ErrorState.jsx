import * as React from "react";
import { cn } from "@/lib/utils";
import { Surface } from "@/components/composed/Surface";
import { Button } from "@/components/ui/button";
import { TriangleAlertIcon } from "lucide-react";

/**
 * Error fallback.
 *
 * The old boundary hardcoded the copy "Widget Unavailable" but was also mounted
 * as the app-level boundary in App.jsx, so a crashed *page* told you a widget
 * had failed. `title` is a prop now, and the caller says what actually broke.
 */
function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  retryLabel = "Try again",
  className,
  ...props
}) {
  return (
    <Surface
      variant="panel"
      inset="lg"
      className={cn("flex h-full min-h-[150px] w-full flex-col items-center justify-center gap-3 text-center", className)}
      {...props}
    >
      <div className="flex size-10 items-center justify-center rounded-full bg-destructive/15 text-destructive" aria-hidden="true">
        <TriangleAlertIcon className="size-5" />
      </div>
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      {message && (
        <p className="max-w-[240px] wrap-break-word text-xs text-muted-foreground">{message}</p>
      )}
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </Surface>
  );
}

export { ErrorState };
