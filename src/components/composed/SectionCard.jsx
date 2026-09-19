import * as React from "react";
import { cn } from "@/lib/utils";
import { SectionLabel, CountPill } from "@/components/composed/SectionBits";

/**
 * The Opus section card — the single most important pattern in the app.
 *
 * Extracted class-for-class from KnowledgePanel.jsx (the design reference);
 * the identical shell also lives in AssetsPanel.jsx and ResourcesPanel.jsx.
 * The premium feel comes from all four layers together — bg-card/40
 * translucency, backdrop blur, hairline border, deep shadow — floating over
 * the near-black ground. Never a flat fill, and never just two of the four.
 *
 * Anatomy (from KnowledgePanel.jsx, the origin):
 *
 *   rounded-2xl bg-card/40 backdrop-blur-xl border border-border shadow-2xl
 *     header: flex items-center justify-between px-5 py-4 border-b border-border-subtle
 *       icon slot   @12px, text-subtle-foreground
 *       title       SectionLabel (the eyebrow)
 *       count       CountPill, optional
 *       action      right-aligned slot, typically a 6x6 ghost icon button
 *     body: unopinionated — size it with bodyClassName / bodyStyle
 *
 * Consume this instead of re-deriving the classes; if the card you are writing
 * would need a different shell, that is a design question, not a variant.
 */
function SectionCard({
  icon: Icon,
  title,
  count,
  action,
  className,
  bodyClassName,
  bodyStyle,
  children,
  ...props
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl bg-card/40 backdrop-blur-xl border border-border shadow-2xl overflow-hidden",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          {Icon ? <Icon size={12} className="text-subtle-foreground" /> : null}
          {title != null && <SectionLabel as="h3">{title}</SectionLabel>}
          {count != null && <CountPill>{count}</CountPill>}
        </div>
        {action}
      </div>
      <div className={bodyClassName} style={bodyStyle}>
        {children}
      </div>
    </div>
  );
}

export { SectionCard };
