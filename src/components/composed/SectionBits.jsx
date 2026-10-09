import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/arc/badge/badge";
import styles from "./SectionBits.module.css";

/**
 * The two smallest atoms of the Opus vocabulary. They live together because
 * they only ever appear as a pair under SectionCard's header.
 *
 * SectionLabel: a plain sentence-case label. It used to be an uppercase,
 * tracked-out eyebrow; Arc bans eyebrows, so the API stays and the styling
 * changed.
 *
 * CountPill: counts are pills, not parentheses. Arc badge, neutral tone.
 */

/**
 * @param {object} props
 * @param {keyof React.JSX.IntrinsicElements} [props.as] element to render;
 *   headings should pass as="h3", inline labels keep the default span.
 */
function SectionLabel({ as = "span", className, children, ...props }) {
  // `const Tag = as` rather than destructuring `as: Tag`: the JSX-only usage
  // isn't tracked by no-unused-vars without eslint-plugin-react.
  const Tag = as;
  return (
    <Tag className={cn(styles.label, className)} {...props}>
      {children}
    </Tag>
  );
}

function CountPill({ className, children, ...props }) {
  return (
    <Badge tone="neutral" className={cn("tabular-nums", className)} {...props}>
      {children}
    </Badge>
  );
}

export { SectionLabel, CountPill };
