import * as React from "react";
import { Select as ArcSelect } from "@/components/arc/select/select";
import styles from "./Select.module.css";

const CLEAR_VALUE = "__clear__";

/**
 * The one select control, on Arc's select.
 *
 * `options` may carry numbers (IN_PRESETS uses minute counts), Arc's Select
 * values are strings, so this coerces to strings going in and back to the
 * option's original type on change.
 *
 * Arc options are label-only, so the per-option colour dot and the leading
 * `icon` are folded into the label node (Arc renders `label` as-is). The
 * optional "unset" entry (`clearLabel`) is just another item that reports
 * `null`.
 */
function Select({ label, labelClassName, value, options, onChange, placeholder = "Select…", clearLabel, icon: Icon }) {
  const renderLabel = (text, color) => (
    <span className={styles.option}>
      {Icon && <Icon size={16} strokeWidth={1.75} className={styles.icon} aria-hidden="true" />}
      {color && <span className={styles.dot} style={{ backgroundColor: color }} aria-hidden="true" />}
      <span className={styles.optionText}>{text}</span>
    </span>
  );

  const arcOptions = [
    ...(clearLabel ? [{ value: CLEAR_VALUE, label: renderLabel(clearLabel) }] : []),
    ...options.map((opt) => ({ value: String(opt.value), label: renderLabel(opt.label, opt.color) })),
  ];

  const handleChange = (next) => {
    if (clearLabel && next === CLEAR_VALUE) {
      onChange(null);
      return;
    }
    const match = options.find((o) => String(o.value) === next);
    onChange(match ? match.value : next);
  };

  // Arc needs a label to name the trigger. Without a visible one, fall back to
  // the placeholder text and hide it visually.
  const isHidden = !label || /(^|\s)sr-only(\s|$)/.test(labelClassName ?? "");
  const accessibleLabel = label ?? (typeof placeholder === "string" ? placeholder : "Select");

  return (
    <div className={isHidden ? styles.hiddenLabel : undefined}>
      <ArcSelect
        label={accessibleLabel}
        // "" (not undefined) keeps Arc controlled, so clearing shows the placeholder.
        value={value != null ? String(value) : ""}
        options={arcOptions}
        onValueChange={handleChange}
        placeholder={Icon ? renderLabel(placeholder) : placeholder}
      />
    </div>
  );
}

export { Select };
