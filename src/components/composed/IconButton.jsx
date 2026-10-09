import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/arc/button/button";
import { Tooltip } from "@/components/arc/tooltip/tooltip";
import styles from "./IconButton.module.css";

/** Existing size names mapped onto Arc's three button sizes. */
const SIZE_MAP = {
  "icon-xs": "sm",
  "icon-sm": "sm",
  icon: "md",
  "icon-md": "md",
  "icon-lg": "lg",
};

/** Existing variant names mapped onto Arc's four button variants. */
const VARIANT_MAP = {
  default: "primary",
  secondary: "secondary",
  outline: "secondary",
  ghost: "ghost",
  link: "ghost",
  destructive: "danger",
  primary: "primary",
  danger: "danger",
};

/**
 * Icon-only button with a mandatory accessible name.
 *
 * The name comes from `label`, falling back to `aria-label` or `title`; it
 * feeds both the accessible name and the optional tooltip. With none of them
 * the button still renders but warns in development.
 */
function IconButton({
  label,
  icon: Icon,
  children,
  size = "icon-sm",
  variant = "ghost",
  tooltip = true,
  side = "top",
  title,
  className,
  "aria-label": ariaLabel,
  ...props
}) {
  const name = label ?? ariaLabel ?? title;
  if (!name && import.meta.env.DEV) {
    console.warn("IconButton needs a `label` (or aria-label) for its accessible name.");
  }

  const arcSize = SIZE_MAP[size] ?? "sm";
  const button = (
    <Button
      type="button"
      variant={VARIANT_MAP[variant] ?? "ghost"}
      size={arcSize}
      aria-label={name}
      className={cn(styles[arcSize], className)}
      {...props}
    >
      {Icon ? <Icon size={16} strokeWidth={1.75} aria-hidden="true" /> : children}
    </Button>
  );

  if (!tooltip || !name) return button;

  return (
    <Tooltip content={name} side={side}>
      {button}
    </Tooltip>
  );
}

export { IconButton };
