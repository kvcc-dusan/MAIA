import * as React from "react";
import { cn } from "@/lib/utils";
import { Alert } from "@/components/arc/alert/alert";
import { Button } from "@/components/arc/button/button";
import styles from "./ErrorState.module.css";

/**
 * Error fallback: what broke (`title`), what happened (`message`) and how to
 * fix it (`onRetry` renders a retry button).
 *
 * `title` is a prop because this is also the app-level boundary: the caller
 * says what actually broke instead of a hardcoded "widget" string.
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
    <div className={cn(styles.root, className)} {...props}>
      <Alert tone="danger" title={title} className={styles.alert}>
        {message}
      </Alert>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

export { ErrorState };
