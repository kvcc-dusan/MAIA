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

export async function ensurePermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const p = await Notification.requestPermission();
  return p === "granted";
}

async function show(title, options) {
  try {
    playSound(); // Play sound!

    // Check for service worker registration for richer notifications if available
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg && reg.showNotification) {
      await reg.showNotification(title, options);
    } else if ("Notification" in window) {
      new Notification(title, options);
    }
  } catch (e) {
    console.error("Notification failed", e);
  }
}

export function scheduleLocalNotification(id, title, whenISO) {
  const when = new Date(whenISO).getTime();
  const delay = when - Date.now();
  clearScheduled(id);

  const payload = {
    tag: id,
    icon: window.location.origin + "/maianewlogo.svg", // Use absolute path
    silent: false
  };

  const notificationTitle = `Signal: ${title}`;

  if (delay <= 0) {
    show(notificationTitle, payload);
    return;
  }

  // cap to ~7 days to avoid absurd setTimeouts
  const capped = Math.min(delay, 7 * 24 * 60 * 60 * 1000);
  const t = setTimeout(() => show(notificationTitle, payload), capped);
  timers.set(id, t);
}

export function clearScheduled(id) {
  const t = timers.get(id);
  if (t) { clearTimeout(t); timers.delete(id); }
}

export function rescheduleAll(reminders) {
  if (!reminders) return;
  reminders.forEach(r => {
    // Only schedule if not delivered and in the future (or very recent past to catch up)
    if (!r.delivered) {
      scheduleLocalNotification(r.id, r.title, r.scheduledAt);
    }
  });
}
