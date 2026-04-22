export const TASK_PRIORITIES = [
  { value: 'p1', label: 'High Priority',   color: '#6366f1' },
  { value: 'p2', label: 'Medium Priority', color: '#f97316' },
  { value: 'p3', label: 'Normal Priority', color: '#10b981' },
];

export const SIGNAL_PRIORITIES = [
  { value: 'p1', label: 'High Priority',   color: '#6366f1' },
  { value: 'p2', label: 'Medium Priority', color: '#f97316' },
  { value: 'p3', label: 'Normal Priority', color: '#10b981' },
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

export const INPUT_CLASS = "bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:outline-none focus:border-white/25 transition-all placeholder:text-zinc-600 font-mono";
export const POPOVER_CLASS = "bg-[#09090b] border border-white/10 shadow-2xl rounded-2xl";

export const getPriorityColor = (p) => {
  switch (p) {
    case 'p1': return '#6366f1';
    case 'p2': return '#f97316';
    case 'p3': return '#10b981';
    default:   return '#10b981';
  }
};
