import { Check } from "lucide-react";
import { SESSION_COLORS } from "@/lib/sessionColors";
import { SESSION_COLOR_VARS } from "./sessionColorVars";
import styles from "./SessionColors.module.css";

/** Shared by the session form (ChronosModal) and the timeline's context menu. */
export function SessionColorSwatches({ value, onChange }) {
  // Radio-group keyboard model: one Tab stop, arrow keys move and select.
  const selectedIndex = Math.max(0, SESSION_COLORS.findIndex((c) => c.value === value));

  const handleKeyDown = (e) => {
    const last = SESSION_COLORS.length - 1;
    let target = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") target = selectedIndex === last ? 0 : selectedIndex + 1;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") target = selectedIndex === 0 ? last : selectedIndex - 1;
    else if (e.key === "Home") target = 0;
    else if (e.key === "End") target = last;
    if (target < 0) return;
    e.preventDefault();
    onChange(SESSION_COLORS[target].value);
    e.currentTarget.parentElement.children[target]?.focus();
  };

  return (
    <div className={styles.swatches} role="radiogroup" aria-label="Session colour">
      {SESSION_COLORS.map((c, i) => (
        <button
          key={c.value}
          type="button"
          role="radio"
          aria-checked={value === c.value}
          aria-label={c.label}
          title={c.label}
          tabIndex={i === selectedIndex ? 0 : -1}
          onClick={() => onChange(c.value)}
          onKeyDown={handleKeyDown}
          className={styles.swatch}
          style={{ "--swatch": SESSION_COLOR_VARS[c.value] ?? SESSION_COLOR_VARS.neutral }}
        >
          <span className={styles.dot}>
            <Check size={12} strokeWidth={2} className={styles.check} aria-hidden="true" />
          </span>
        </button>
      ))}
    </div>
  );
}
