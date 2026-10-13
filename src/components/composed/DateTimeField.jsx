import * as React from "react";
import { cn } from "@/lib/utils";
import { toLocalInputValue } from "@/lib/time";
import { DatePicker } from "@/components/arc/date-picker/date-picker";
import { TimePicker } from "@/components/arc/time-picker/time-picker";
import { useFitPopups } from "./fitPopup";
import styles from "./DateTimeField.module.css";

const MINUTE_STEP = 5;
const DATE_FORMAT = { month: "short", day: "numeric" };

const pad = (n) => String(n).padStart(2, "0");

const parseValue = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Date + time field, built from Arc's date-picker and time-picker.
 *
 * The value contract is unchanged from the old single-popover version:
 * `value` is a local `YYYY-MM-DDTHH:mm` string (or empty), and `onChange`
 * always receives that same format via `toLocalInputValue`. Picking a date
 * keeps the current time; picking a time keeps the current date. With no
 * value, the missing half starts from "now", as before.
 *
 * `dateOnly` renders just the date picker. `equal` gives date and time equal columns with the
 * form grid's column gap, so they line up with two-column fields above and below.
 */
function DateTimeField({ label, labelClassName, value, onChange, dateOnly = false, equal = false }) {
  const rootRef = React.useRef(null);
  useFitPopups(rootRef);
  const parsed = parseValue(value);
  const base = parsed ?? new Date();
  const hideLabels = !label || /(^|\s)sr-only(\s|$)/.test(labelClassName ?? "");

  const handleDate = (picked) => {
    // Arc's Clear button reports undefined. Date-only fields can be empty
    // (consumers pass ""); date+time values are always required Dates, so
    // clearing them is ignored rather than emitting an unparseable value.
    if (!picked) {
      if (dateOnly) onChange("");
      return;
    }
    const next = new Date(base);
    next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
    onChange(toLocalInputValue(next));
  };

  const handleTime = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    const next = new Date(base);
    next.setHours(h, m);
    onChange(toLocalInputValue(next));
  };

  const dateLabel = !label ? "Date" : dateOnly ? label : `${label} date`;
  const timeLabel = !label ? "Time" : `${label} time`;

  return (
    <div ref={rootRef} className={styles.root}>
      <div
        role="group"
        aria-label={label || undefined}
        className={cn(styles.group, !dateOnly && styles.withTime, equal && styles.equal, hideLabels && styles.hiddenLabels)}
      >
        <DatePicker
          label={dateLabel}
          value={parsed ?? undefined}
          onChange={handleDate}
          format={DATE_FORMAT}
          weekStartsOn={1}
        />
        {!dateOnly && (
          <TimePicker
            label={timeLabel}
            value={parsed ? `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}` : ""}
            onChange={handleTime}
            minuteStep={MINUTE_STEP}
          />
        )}
      </div>
    </div>
  );
}

export { DateTimeField };
