export const TASK_PRIORITIES = [
  { value: 'p1', label: 'High priority',   color: 'var(--priority-1)' },
  { value: 'p2', label: 'Medium priority', color: 'var(--priority-2)' },
  { value: 'p3', label: 'Normal priority', color: 'var(--priority-3)' },
];

// Identical to TASK_PRIORITIES today; kept as a separate export because tasks
// and signals are separate domains and may diverge.
export const SIGNAL_PRIORITIES = TASK_PRIORITIES;

export const SCHEDULES = [
  { value: 'today', label: 'Today' },
  { value: 'soon', label: 'Soon' },
  { value: 'future', label: 'Future' },
];

export const IN_PRESETS = [
  { value: 5, label: '5 m' },
  { value: 10, label: '10 m' },
  { value: 15, label: '15 m' },
  { value: 30, label: '30 m' },
  { value: 60, label: '1 h' },
  { value: 240, label: 'Later today (4h)' },
  { value: 'tonight', label: 'Tonight (9pm)' },
  { value: 'tm_morning', label: 'Tomorrow Morning (9am)' },
  { value: 'tm_noon', label: 'Tomorrow (12pm)' }
];

export const STORAGE_KEYS = {
  NOTES: 'maia.notes',
  PROJECTS: 'maia.projects',
  LEDGER: 'maia.ledger',
  TASKS: 'maia.tasks',
  REMINDERS: 'maia.reminders',
  SESSIONS: 'maia.sessions',
  TODAY_LAYOUT: 'maia.today.layout',
  // Last-good geolocation fix, so a denied/absent location provider doesn't
  // strand the Today weather widget on "Locating…" forever.
  WEATHER_COORDS: 'maia.weather.coords',
};

/** Single source for the greeting name; it was hardcoded inside HomePage. */
export const USER_NAME = 'Dušan';

/**
 * @deprecated Use <Field> + <Input> / <Textarea> instead. Retained only until
 * Sprint 5 migrates the remaining callers (ChronosModal, CustomSelect,
 * DateTimePicker). Now token-based, so existing consumers pick up the theme
 * without needing to be edited first.
 */
export const INPUT_CLASS = "bg-input/50 border border-transparent rounded-xl text-foreground text-sm outline-hidden transition-all placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30";

/** @deprecated Use the Menu / Popover components instead. */
export const POPOVER_CLASS = "bg-popover border border-border shadow-overlay rounded-2xl";

// getPriorityColor lives in lib/utils.js. It was defined here as well (and a
// third time inline in FocusTaskItem), all returning divergent raw hex.
export { getPriorityColor } from "./utils.js";
