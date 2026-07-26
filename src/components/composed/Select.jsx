import * as React from "react";
import {
  Select as SelectRoot,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

/**
 * The one select control.
 *
 * Replaces both ui/CustomSelect (plain dropdown) and ui/PillSelect (optional
 * "linked project" picker with its own clear-button affordance) — each had a
 * hand-rolled `useLayoutEffect` positioning calculation, duplicated between
 * them almost verbatim. Base UI's Select owns positioning, collision and
 * keyboard nav; "unset" is just another item rather than a bespoke pill.
 *
 * `options` may carry numbers (IN_PRESETS uses minute counts) — Base UI's
 * Select values are always strings, so this coerces back to the option's
 * original type on change.
 */
function Select({ label, value, options, onChange, placeholder = "Select…", clearLabel, icon: Icon }) {
  const stringValue = value != null ? String(value) : undefined;

  const handleChange = (next) => {
    if (clearLabel && next === "__clear__") {
      onChange(null);
      return;
    }
    const match = options.find((o) => String(o.value) === next);
    onChange(match ? match.value : next);
  };

  // Base UI's Select.Value only auto-resolves a selected item's label once
  // that item has actually mounted inside the (portalled, closed-by-default)
  // popup — until then it falls back to showing the raw value. An explicit
  // render function looks the label up from `options` directly, so the
  // trigger shows "Normal Priority" rather than "p3" before it's ever opened.
  const renderValue = (val) => {
    if (val == null || val === "") return placeholder;
    const match = options.find((o) => String(o.value) === String(val));
    return match?.label ?? val;
  };

  const control = (
    <SelectRoot value={stringValue} onValueChange={handleChange}>
      <SelectTrigger className="w-full">
        {Icon ? (
          <span className="flex min-w-0 items-center gap-2">
            <Icon size={14} className="shrink-0 text-muted-foreground" />
            <SelectValue placeholder={placeholder}>{renderValue}</SelectValue>
          </span>
        ) : (
          <SelectValue placeholder={placeholder}>{renderValue}</SelectValue>
        )}
      </SelectTrigger>
      <SelectContent>
        {clearLabel && (
          <SelectItem value="__clear__" className="text-muted-foreground">
            {clearLabel}
          </SelectItem>
        )}
        {options.map((opt) => (
          <SelectItem key={opt.value} value={String(opt.value)}>
            <span className="flex items-center gap-2">
              {opt.color && (
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: opt.color }}
                  aria-hidden="true"
                />
              )}
              {opt.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </SelectRoot>
  );

  if (!label) return control;

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {control}
    </div>
  );
}

export { Select };
