export const NEON_BLUE = '#3b82f6';
export const NEON_ORANGE = '#FF5930';
export const NEON_GREEN = '#ABFA54';

export const TASK_PRIORITIES = [
  { value: 'p1', label: 'High Priority', color: NEON_BLUE },
  { value: 'p2', label: 'Medium Priority', color: NEON_ORANGE },
  { value: 'p3', label: 'Normal Priority', color: NEON_GREEN }
];

export const SIGNAL_PRIORITIES = [
  { value: 'p1', label: 'High Priority', color: NEON_BLUE },
  { value: 'p2', label: 'Medium Priority', color: NEON_ORANGE },
  { value: 'p3', label: 'Normal Priority', color: NEON_GREEN }
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
};

export const INPUT_CLASS = "bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none ring-0 focus:outline-none focus:ring-0 focus:border-white/10 focus-visible:ring-2 focus-visible:ring-white/20 transition-all placeholder:text-zinc-600";
export const POPOVER_CLASS = "bg-[#09090b] border border-white/10 shadow-2xl rounded-2xl";

export const getPriorityColor = (p) => {
  switch (p) {
    case 'p1': return NEON_BLUE;
    case 'p2': return NEON_ORANGE;
    case 'p3': return NEON_GREEN;
    default: return NEON_GREEN;
  }
};
