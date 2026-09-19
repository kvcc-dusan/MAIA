import { cn } from "@/lib/utils";
import { SESSION_COLORS, getSessionSwatchClass } from "@/lib/sessionColors";

/** Shared by the session form (ChronosModal) and the timeline's context menu. */
export function SessionColorSwatches({ value, onChange }) {
  return (
    <div className="flex items-center gap-2" role="radiogroup" aria-label="Session colour">
      {SESSION_COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          role="radio"
          aria-checked={value === c.value}
          aria-label={c.label}
          title={c.label}
          onClick={() => onChange(c.value)}
          // Selection is an inset stroke: the swatch keeps its exact size and
          // position, so the rhythm of the row never shifts (the old outer
          // ring + scale made the selected swatch collide with its neighbour).
          className={cn(
            "size-6 rounded-full ring-2 ring-inset transition-opacity",
            value === c.value
              ? "opacity-100 ring-foreground"
              : "opacity-60 ring-transparent hover:opacity-100",
            getSessionSwatchClass(c.value)
          )}
        />
      ))}
    </div>
  );
}
