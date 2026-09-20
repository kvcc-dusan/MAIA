import * as React from "react"
import { Slider as SliderPrimitive } from "@base-ui/react/slider"

import { cn } from "@/lib/utils"

/**
 * The one slider control.
 *
 * Replaces the raw `<input type="range">` elements that the graph controls
 * used, which were styled only by `accent-white` — so they rendered as the
 * browser's native track and thumb, ignoring every token in the system and
 * offering no hover, focus-visible or disabled treatment.
 *
 * Track is `bg-overlay`, the filled portion is `bg-primary`, and the thumb is
 * a `size-4` circle with a focus ring matching `button.jsx`'s idiom.
 *
 * Base UI reports values as an array even in single-thumb mode; `onChange`
 * here hands back a plain number so call sites don't have to unwrap it.
 *
 * `label` is required in spirit: Base UI renders a real `<input type="range">`
 * inside the thumb (which is what gives keyboard and screen-reader support),
 * but it carries no accessible name of its own, so a screen reader would
 * otherwise announce nothing but the number. The visible caption beside the
 * slider is a sibling, not a `<label>`, so it can't supply one implicitly.
 */
function Slider({ className, value, onChange, label, min = 0, max = 100, step = 1, ...props }) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      value={value}
      onValueChange={(next) => onChange?.(Array.isArray(next) ? next[0] : next)}
      min={min}
      max={max}
      step={step}
      className={cn("w-full", className)}
      {...props}
    >
      <SliderPrimitive.Control className="flex w-full touch-none items-center py-2 select-none">
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="h-1 w-full rounded-full bg-overlay select-none"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-indicator"
            className="h-full rounded-full bg-primary select-none"
          />
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            getAriaLabel={label ? () => label : undefined}
            className="size-4 rounded-full bg-primary shadow-ambient transition-colors outline-none select-none hover:bg-foreground focus-visible:ring-3 focus-visible:ring-ring/30 data-disabled:pointer-events-none data-disabled:opacity-50"
          />
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider }
