import { isTauri } from "../lib/vault.js";

let timers = new Map();

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;

  // "Classic" Short Ping (clean sine, Apple-like "Glass" vibe)
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.type = 'sine'; // Cleanest sound
  osc.frequency.setValueAtTime(1000, now); // Higher pitch (~C6) for clarity

  // Short envelope: Instant attack, quick decay (typical notification)
  // Total duration: ~0.4s
  const duration = 0.4;

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.15, now + 0.01); // Instant attack
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration); // Quick fail-off

  osc.start(now);
  osc.stop(now + duration);
}

// The desktop webview (WKWebView) has no Notification API: Tauri's plugin talks to macOS instead.
// Dynamic import, like every Tauri module, so tests and the jsdom path never load it.
const tauriNotification = () => import("@tauri-apps/plugin-notification");

export async function ensurePermission() {
  try {
    if (isTauri()) {
      const { isPermissionGranted, requestPermission } = await tauriNotification();
      if (await isPermissionGranted()) return true;
      return (await requestPermission()) === "granted";
    }
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    return (await Notification.requestPermission()) === "granted";
  } catch (e) {
    console.error("[MAIA] Notification permission check failed", e);
    return false;
  }
}

async function show(title, options) {
  try {
    playSound(); // Play sound!

    if (isTauri()) {
      const { sendNotification } = await tauriNotification();
      sendNotification({ title });
    } else if ("Notification" in window) {
      new Notification(title, options);
    }
  } catch (e) {
    console.error("Notification failed", e);
  }
}

// setTimeout overflows past ~24.8 days, so long waits are split into hops.
const MAX_TIMER_MS = 7 * 24 * 60 * 60 * 1000;
// A reminder missed while the app was closed still fires on launch, but only if it is this recent.
// Older ones are marked delivered quietly, so a backlog never fires all at once.
export const CATCH_UP_MS = 60 * 60 * 1000;

/** `onFire` runs once the notification has been shown (used to mark the reminder delivered). */
export function scheduleLocalNotification(id, title, whenISO, onFire) {
  const when = new Date(whenISO).getTime();
  const delay = when - Date.now();
  clearScheduled(id);

  const payload = {
    tag: id,
    icon: window.location.origin + "/maianewlogo.svg", // Use absolute path
    silent: false
  };

  const notificationTitle = `Signal: ${title}`;
  const fire = () => {
    timers.delete(id);
    show(notificationTitle, payload);
    onFire?.(id);
  };

  if (delay <= 0) {
    fire();
    return;
  }

  // The old code fired at the cap, so a reminder 10 days out went off after 7. Hop instead.
  const t = delay > MAX_TIMER_MS
    ? setTimeout(() => scheduleLocalNotification(id, title, whenISO, onFire), MAX_TIMER_MS)
    : setTimeout(fire, delay);
  timers.set(id, t);
}

export function clearScheduled(id) {
  const t = timers.get(id);
  if (t) { clearTimeout(t); timers.delete(id); }
}

/**
 * Schedules every undelivered reminder. `onDelivered(id)` must mark the reminder delivered;
 * without it a due reminder fired again on every launch and every reminders change.
 */
export function rescheduleAll(reminders, onDelivered) {
  if (!reminders) return;
  const now = Date.now();
  reminders.forEach((r) => {
    if (r.delivered) return;
    const when = new Date(r.scheduledAt).getTime();
    if (!Number.isFinite(when) || when < now - CATCH_UP_MS) {
      clearScheduled(r.id);
      onDelivered?.(r.id);
      return;
    }
    scheduleLocalNotification(r.id, r.title, r.scheduledAt, onDelivered);
  });
}
