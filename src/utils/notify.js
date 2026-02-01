let timers = new Map();

/**
 * Request notification permission from the user if not already granted.
 * @returns {Promise<boolean>} True if permission is granted.
 */
export async function ensurePermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const p = await Notification.requestPermission();
  return p === "granted";
}

async function show(title, options) {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg && reg.showNotification) {
      await reg.showNotification(title, options);
    } else if ("Notification" in window) {
      new Notification(title, options);
    }
  } catch { /* ignore */ }
}

/**
 * Schedule a local notification to be shown at a specific time.
 * @param {string} id - Unique identifier for the notification.
 * @param {string} title - Title of the notification.
 * @param {string} whenISO - ISO 8601 date string for when the notification should be shown.
 */
export function scheduleLocalNotification(id, title, whenISO) {
  const when = new Date(whenISO).getTime();
  const delay = when - Date.now();
  clearScheduled(id);
  if (delay <= 0) { show(title, { body: "Reminder", tag: id }); return; }
  // cap to ~7 days to avoid absurd setTimeouts
  const capped = Math.min(delay, 7 * 24 * 60 * 60 * 1000);
  const t = setTimeout(() => show(title, { body: "Reminder", tag: id }), capped);
  timers.set(id, t);
}

/**
 * Cancel a scheduled notification.
 * @param {string} id - Unique identifier for the notification to cancel.
 */
export function clearScheduled(id) {
  const t = timers.get(id);
  if (t) { clearTimeout(t); timers.delete(id); }
}

/**
 * Reschedule all undelivered reminders.
 * @param {Array<{id: string, title: string, scheduledAt: string, delivered?: boolean}>} reminders - List of reminder objects.
 */
export function rescheduleAll(reminders) {
  reminders.forEach(r => {
    if (!r.delivered) scheduleLocalNotification(r.id, r.title, r.scheduledAt);
  });
}
