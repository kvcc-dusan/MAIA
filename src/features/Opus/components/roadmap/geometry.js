// Pure geometry for the roadmap Gantt. Days are integer UTC day numbers
// (days since 1970-01-01) so no date maths ever touches a time zone; a
// "YYYY-MM-DD" string (or a longer local datetime string, from milestones that
// were saved by the old date picker) maps to one calendar day.

const DAY_MS = 86_400_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONDAY_OFFSET = 3; // 1970-01-01 was a Thursday

export const RANGE_PAD_DAYS = 7;
export const DEFAULT_FUTURE_DAYS = 56;
// Past this span, week ticks would crowd the axis, so only months are drawn.
export const WEEK_TICKS_MAX_DAYS = 140;
// The Gantt never gets tighter than this, it scrolls instead.
export const MIN_PX_PER_DAY = 10;
export const MARKER_HIT_PX = 36;

const LABEL_GAP_PX = 6;
const BAR_PAD_PX = 16;
const ROW_GAP_PX = 8;
const INSIDE_MIN_PX = 160;
const TITLE_CHAR_PX = 7.4;
const TAG_CHAR_PX = 6.4;
const TAG_EXTRA_PX = 22; // dot plus the gaps around it and the status text

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/;

/** Calendar day of a "YYYY-MM-DD..." string, or null when it isn't a real date. */
export const dayNumber = (value) => {
  if (typeof value !== "string") return null;
  const match = DATE_RE.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const ms = Date.UTC(year, month - 1, day);
  const check = new Date(ms);
  // Rejects 2026-02-31, which Date.UTC would silently roll into March.
  if (check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  return Math.round(ms / DAY_MS);
};

export const dayString = (day) => new Date(day * DAY_MS).toISOString().slice(0, 10);

/** The viewer's local calendar day, as a day number. */
export const todayDay = (now = new Date()) =>
  Math.round(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / DAY_MS);

/** "Oct 3", or "Oct 3, 2027" when the day is outside `referenceYear`. */
export const formatDay = (day, referenceYear = null) => {
  const date = new Date(day * DAY_MS);
  const base = `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
  const year = date.getUTCFullYear();
  return referenceYear !== null && year !== referenceYear ? `${base}, ${year}` : base;
};

const makeRange = (start, end) => ({ start, end, days: end - start + 1 });

/**
 * The visible window: every dated thing (project start and target, milestone
 * starts and due dates) padded by a week on both sides. Null when nothing has
 * a date, so the caller can pick its own fallback.
 */
export const computeRange = ({ startDate = null, targetDate = null, milestones = [] } = {}) => {
  const days = [dayNumber(startDate), dayNumber(targetDate)];
  milestones.forEach((m) => {
    days.push(m.startDay ?? null, m.dueDay ?? null);
  });
  const known = days.filter((d) => d !== null && d !== undefined);
  if (known.length === 0) return null;
  return makeRange(Math.min(...known) - RANGE_PAD_DAYS, Math.max(...known) + RANGE_PAD_DAYS);
};

/** An empty chart still needs an axis: a week behind today and eight ahead. */
export const defaultRange = (today) => makeRange(today - RANGE_PAD_DAYS, today + DEFAULT_FUTURE_DAYS);

export const containsDay = (range, day) => day !== null && day >= range.start && day <= range.end;

export const dayLeftPercent = (day, range) => ((day - range.start) / range.days) * 100;
export const dayCenterPercent = (day, range) => ((day - range.start + 0.5) / range.days) * 100;

/** A bar from `a` to `b` inclusive, either way round, clamped to the window. */
export const barSpan = (a, b, range) => {
  const lo = Math.max(Math.min(a, b), range.start);
  const hi = Math.min(Math.max(a, b), range.end);
  const days = Math.max(hi - lo + 1, 1);
  return { left: dayLeftPercent(lo, range), width: (days / range.days) * 100, days };
};

const weekdayIndex = (day) => (((day + MONDAY_OFFSET) % 7) + 7) % 7; // 0 is Monday

/**
 * Month segments for the axis header, week ticks (only on short spans) and
 * the gridline days. Labels are sentence case ("Oct"); the year is added to the
 * first month and to every January when the window crosses a year boundary.
 */
export const buildTicks = (range) => {
  const first = new Date(range.start * DAY_MS);
  const spansYears = first.getUTCFullYear() !== new Date(range.end * DAY_MS).getUTCFullYear();
  const months = [];
  let year = first.getUTCFullYear();
  let month = first.getUTCMonth();
  for (;;) {
    const monthStart = Math.round(Date.UTC(year, month, 1) / DAY_MS);
    if (monthStart > range.end) break;
    const nextStart = Math.round(Date.UTC(year, month + 1, 1) / DAY_MS);
    const showYear = spansYears && (months.length === 0 || month === 0);
    months.push({
      key: `${year}-${String(month + 1).padStart(2, "0")}`,
      monthStart,
      startDay: Math.max(monthStart, range.start),
      endDay: Math.min(nextStart - 1, range.end),
      label: showYear ? `${MONTHS[month]} ${year}` : MONTHS[month],
    });
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }

  const showWeeks = range.days <= WEEK_TICKS_MAX_DAYS;
  const weeks = [];
  if (showWeeks) {
    for (let day = range.start; day <= range.end; day += 1) {
      if (weekdayIndex(day) === 0) weeks.push({ day, label: String(new Date(day * DAY_MS).getUTCDate()) });
    }
  }

  const monthLines = months.filter((m) => m.monthStart > range.start).map((m) => ({ day: m.monthStart, kind: "month" }));
  const monthDays = new Set(monthLines.map((l) => l.day));
  const weekLines = weeks.filter((w) => !monthDays.has(w.day) && w.day > range.start).map((w) => ({ day: w.day, kind: "week" }));

  return { months, weeks, showWeeks, lines: [...monthLines, ...weekLines] };
};

const estimateLabelPx = (title, statusText) =>
  String(title ?? "").length * TITLE_CHAR_PX + (statusText ? statusText.length * TAG_CHAR_PX + TAG_EXTRA_PX : 0);

/**
 * Places one lane's milestones and stacks overlapping ones on sub-rows.
 *
 * `items`: `{ id, title, statusText, startDay, dueDay }`. A milestone with no
 * start (or a start equal to its due day) is a marker: a diamond on its due day
 * with the label beside it. Otherwise it is a bar from start to due, with the
 * label inside when it fits and beside the bar when it doesn't. Whatever the
 * label takes up beside the shape counts when deciding what overlaps, so text
 * never runs under the next milestone.
 *
 * Positions come back as percentages of the track. `pxPerDay` only feeds the
 * overlap estimate, so a stale value costs a row of spacing, not a wrong bar.
 */
export const layoutLane = (items, range, pxPerDay) => {
  const totalPx = range.days * pxPerDay;
  const placed = items.map((item) => {
    const labelPx = estimateLabelPx(item.title, item.statusText);
    const isMarker = item.startDay == null || item.startDay === item.dueDay;

    if (isMarker) {
      const center = dayCenterPercent(item.dueDay, range);
      const leftPx = (center / 100) * totalPx - MARKER_HIT_PX / 2;
      return {
        ...item,
        kind: "marker",
        placement: "marker",
        center,
        mid: center,
        leftPx,
        endPx: leftPx + MARKER_HIT_PX + LABEL_GAP_PX + labelPx,
      };
    }

    const span = barSpan(item.startDay, item.dueDay, range);
    const barPx = span.days * pxPerDay;
    const fits = barPx >= labelPx + BAR_PAD_PX;
    const placement = fits || barPx >= INSIDE_MIN_PX ? "inside" : "outside";
    const leftPx = (span.left / 100) * totalPx;
    return {
      ...item,
      kind: "bar",
      placement,
      left: span.left,
      width: span.width,
      mid: span.left + span.width / 2,
      leftPx,
      endPx: placement === "inside" ? leftPx + barPx : leftPx + barPx + LABEL_GAP_PX + labelPx + BAR_PAD_PX,
    };
  });

  placed.sort((a, b) => a.leftPx - b.leftPx || String(a.id).localeCompare(String(b.id)));

  const rowEnds = [];
  const withRows = placed.map((item) => {
    let row = rowEnds.findIndex((end) => end + ROW_GAP_PX <= item.leftPx);
    if (row < 0) {
      row = rowEnds.length;
      rowEnds.push(0);
    }
    rowEnds[row] = item.endPx;
    return { ...item, row };
  });

  return { items: withRows, rowCount: Math.max(rowEnds.length, 1) };
};
