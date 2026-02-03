let timers = new Map();

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

export function clearScheduled(id) {
  const t = timers.get(id);
  if (t) { clearTimeout(t); timers.delete(id); }
}

export function rescheduleAll(reminders) {
  reminders.forEach(r => {
    if (!r.delivered) scheduleLocalNotification(r.id, r.title, r.scheduledAt);
  });
}
