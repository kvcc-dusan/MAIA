import * as React from "react";
import { cn } from "@/lib/utils";
import styles from "./FormGrid.module.css";

/**
 * The one layout every modal form uses: two columns for short fields, `FormSpan`
 * for long ones (titles, descriptions, notices). `as="form"` renders the form itself.
 */
function FormGrid({ as: Tag = "div", className, ...props }) {
  return React.createElement(Tag, { className: cn(styles.grid, className), ...props });
}

/** A child that takes the full row. */
function FormSpan({ className, ...props }) {
  return <div className={cn(styles.span, className)} {...props} />;
}

export { FormGrid, FormSpan };
