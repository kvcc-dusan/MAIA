import React, { useRef } from "react";
import { Check } from "@/components/icons";
import { WORKSTREAM_COLORS } from "../../lib/projectModel.js";
import styles from "./panels.module.css";

const KEY_STEP = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/** Four series colours as a radiogroup: one Tab stop, arrows move and select. */
export default function ColorRadioGroup({ label, value, onChange }) {
  const refs = useRef([]);
  const checkedIndex = Math.max(WORKSTREAM_COLORS.indexOf(String(value)), 0);

  const handleKeyDown = (event) => {
    const step = KEY_STEP[event.key];
    if (!step) return;
    event.preventDefault();
    const next = (checkedIndex + step + WORKSTREAM_COLORS.length) % WORKSTREAM_COLORS.length;
    onChange(WORKSTREAM_COLORS[next]);
    refs.current[next]?.focus();
  };

  return (
    <div className={styles.field}>
      <span id="roadmap-color-label" className={styles.legend}>{label}</span>
      <div role="radiogroup" aria-labelledby="roadmap-color-label" className={styles.swatches} onKeyDown={handleKeyDown}>
        {WORKSTREAM_COLORS.map((color, index) => {
          const isChecked = index === checkedIndex;
          return (
            <button
              key={color}
              ref={(node) => { refs.current[index] = node; }}
              type="button"
              role="radio"
              aria-checked={isChecked}
              aria-label={`Color ${color}`}
              tabIndex={isChecked ? 0 : -1}
              className={styles.swatch}
              onClick={() => onChange(color)}
            >
              <span className={styles.chip} style={{ background: `var(--series-${color})` }} aria-hidden="true" />
              <span className={styles.swatchNumber}>{color}</span>
              {isChecked && <Check size={16} strokeWidth={1.75} aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
