import * as React from "react";
import { cn } from "@/lib/utils";
import styles from "./Surface.module.css";

/**
 * The one panel primitive. Cards rest on a 1px border with no shadow, blur or
 * gradient. `elevation="overlay"` is the only step that casts a shadow
 * (Arc reserves shadows for floating layers); `ambient` and `raised` are
 * accepted for compatibility and render flat.
 */
function Surface({
  className,
  variant = "panel",
  radius = "lg",
  elevation = "none",
  inset = "none",
  render,
  ...props
}) {
  const Comp = render ?? "div";
  return (
    <Comp
      data-slot="surface"
      className={cn(
        styles.surface,
        styles[variant],
        styles[`radius-${radius}`],
        styles[`elevation-${elevation}`],
        styles[`inset-${inset}`],
        className
      )}
      {...props}
    />
  );
}

export { Surface };
