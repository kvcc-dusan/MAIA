import * as React from "react";
import { cn } from "@/lib/utils";
import { CountPill } from "@/components/composed/SectionBits";
import styles from "./PageHeader.module.css";

/**
 * Sticky page header: section name, count, right-aligned actions.
 *
 * `eyebrow` keeps its name for compatibility but renders as a plain
 * sentence-case label (Arc has no eyebrows). The page title is PageTitle,
 * passed as children.
 */
function PageHeader({ eyebrow, count, actions, className, children, ...props }) {
  return (
    <div className={cn("z-sticky", styles.header, className)} {...props}>
      <div className={styles.lead}>
        {eyebrow && <span className={styles.name}>{eyebrow}</span>}
        {count != null && <CountPill>{count}</CountPill>}
        {children}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}

/** The one page-title style, Geist at 36px. An h2: the app shell's top bar owns the page's h1. */
function PageTitle({ className, children, ...props }) {
  return (
    <h2 className={cn(styles.title, className)} {...props}>
      {children}
    </h2>
  );
}

export { PageHeader, PageTitle };
