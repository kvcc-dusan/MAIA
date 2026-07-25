import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Icon-only button with a mandatory accessible name.
 *
 * Only ~14% of MAIA's 154 buttons currently have an `aria-label`, and the
 * icon-only ones are the worst offenders. `label` is required here and feeds
 * both the accessible name and the optional tooltip, so the gap can't reopen.
 */
function IconButton({
  label,
  icon: Icon,
  children,
  size = "icon-sm",
  variant = "ghost",
  tooltip = true,
  side = "top",
  className,
  ...props
}) {
  if (!label) {
    throw new Error("IconButton requires a `label` for its accessible name.");
  }

  const button = (
    <Button
      type="button"
      variant={variant}
      size={size}
      aria-label={label}
      className={cn(className)}
      {...props}
    >
      {Icon ? <Icon aria-hidden="true" /> : children}
    </Button>
  );

  if (!tooltip) return button;

  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}

export { IconButton };
