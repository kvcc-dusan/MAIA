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
          className={cn(
            "size-6 rounded-full ring-offset-2 ring-offset-popover transition-all",
            getSessionSwatchClass(c.value),
            value === c.value ? "scale-110 ring-2 ring-foreground" : "opacity-60 hover:opacity-100"
          )}
        />
      ))}
    </div>
  );
}
