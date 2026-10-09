import WorldMapWidget from "@/components/WorldMapWidget.jsx";
import FocusWidget from "@/components/FocusWidget.jsx";
import QuickCaptureWidget from "@/components/QuickCaptureWidget.jsx";

/**
 * Widget registry — the extension point for the Today page.
 *
 * Adding a widget is one entry here plus a component that renders <Widget>.
 * Nothing else on the page needs to know about it: the grid reads this to
 * render, and the "Add widget" menu reads it to offer what isn't placed yet.
 *
 *   id          stable key, persisted in the layout — never rename in place
 *   defaultSpan how many of the 5 columns it occupies when first added
 *   canGrow     whether the 1<->2 span toggle applies
 *   minHeight   a FLOOR, not a target — the grid rows are content-sized, so
 *               this only binds when a widget would otherwise be shorter
 *   select      picks this widget's props out of the page's shared bag
 *
 * `select` is not optional bookkeeping: each widget spreads its unrecognised
 * props onto the DOM as shell props, so handing every widget the whole bag
 * leaks other widgets' props (todayEntries, onCapture…) onto a <section> and
 * React warns about each one.
 */
export const WIDGETS = [
  {
    id: "clock-map",
    title: "Today",
    Component: WorldMapWidget,
    defaultSpan: 2,
    canGrow: true,
    minHeight: "min-h-72",
    select: ({ weather, weatherLoading, weatherError, retryWeather, now }) =>
      ({ weather, weatherLoading, weatherError, retryWeather, now }),
  },
  {
    id: "focus",
    title: "Today's Focus",
    Component: FocusWidget,
    defaultSpan: 2,
    canGrow: true,
    minHeight: "min-h-52",
    select: ({ todayTasks, sessions, signals, onOpenPulse, onTaskClick }) =>
      ({ todayTasks, sessions, signals, onOpenPulse, onTaskClick }),
  },
  {
    id: "capture",
    title: "Quick Capture",
    Component: QuickCaptureWidget,
    defaultSpan: 1,
    canGrow: true,
    minHeight: "min-h-44",
    select: ({ captureContent, setCaptureContent, onCapture, todayEntries, onOpenNote }) =>
      ({ captureContent, setCaptureContent, onCapture, todayEntries, onOpenNote }),
  },
];

export const WIDGETS_BY_ID = Object.fromEntries(WIDGETS.map((w) => [w.id, w]));

/** Layout shape persisted to localStorage: ordered [{ id, span }]. */
export const DEFAULT_LAYOUT = WIDGETS.map((w) => ({ id: w.id, span: w.defaultSpan }));

/**
 * Drops entries whose widget no longer exists and clamps spans, so a stale
 * layout in localStorage can't blank the page after a registry change.
 */
export function reconcileLayout(stored) {
  if (!Array.isArray(stored)) return DEFAULT_LAYOUT;
  const clean = stored
    .filter((item) => item && WIDGETS_BY_ID[item.id])
    .map((item) => ({
      id: item.id,
      span: item.span === 2 ? 2 : 1,
    }));
  return clean.length ? clean : DEFAULT_LAYOUT;
}
