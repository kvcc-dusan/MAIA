import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The two smallest atoms of the Opus vocabulary, extracted verbatim from
 * KnowledgePanel.jsx (the design reference). They live together because they
 * only ever appear as a pair under SectionCard's header.
 *
 * SectionLabel — the one eyebrow style for every section label. Wide tracking,
 * uppercase, muted; optionally preceded by a 12px icon (that part is
 * SectionCard's job).
 *
 * CountPill — counts are pills, not parentheses.
 */

const LABEL_CLASS =
  "text-xs uppercase tracking-[0.15em] text-muted-foreground font-bold";
const PILL_CLASS =
  "text-xs text-subtle-foreground bg-overlay-subtle px-1.5 py-0.5 rounded-full";

/**
 * @param {object} props
 * @param {keyof React.JSX.IntrinsicElements} [props.as] element to render;
 *   headings should pass as="h3" (KnowledgePanel precedent), inline eyebrows
 *   keep the default span.
 */
function SectionLabel({ as = "span", className, children, ...props }) {
  // `const Tag = as` rather than destructuring `as: Tag`: the JSX-only usage
  // isn't tracked by no-unused-vars without eslint-plugin-react, and a
  // lowercase destructured param trips it. Capitalized vars are exempt.
  const Tag = as;
  return (
    <Tag className={cn(LABEL_CLASS, className)} {...props}>
      {children}
    </Tag>
  );
}

function CountPill({ className, children, ...props }) {
  return (
    <span className={cn(PILL_CLASS, className)} {...props}>
      {children}
    </span>
  );
}

export { SectionLabel, CountPill };
