// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// notify.js builds its AudioContext at import time; jsdom has none.
class FakeAudioContext {
  state = "running";
  currentTime = 0;
  destination = {};
  resume() {}
  createOscillator() {
    return { connect() {}, type: "", frequency: { setValueAtTime() {} }, start() {}, stop() {} };
  }
  createGain() {
    return { connect() {}, gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} } };
  }
}

const tauri = vi.hoisted(() => ({
  on: false,
  isPermissionGranted: vi.fn(async () => false),
  requestPermission: vi.fn(async () => "granted"),
  sendNotification: vi.fn(),
}));
vi.mock("../lib/vault.js", () => ({ isTauri: () => tauri.on }));
vi.mock("@tauri-apps/plugin-notification", () => tauri);

const HOUR = 60 * 60 * 1000;
const at = (offsetMs) => new Date(Date.now() + offsetMs).toISOString();

let notify;

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-17T12:00:00Z"));
  window.AudioContext = FakeAudioContext;
  window.Notification = vi.fn();
  window.Notification.permission = "granted";
  vi.resetModules();
  notify = await import("./notify.js");
});

afterEach(() => {
  vi.useRealTimers();
  tauri.on = false;
  vi.clearAllMocks();
});

describe("desktop (Tauri)", () => {
  it("asks macOS through the notification plugin, not the web API", async () => {
    tauri.on = true;
    await expect(notify.ensurePermission()).resolves.toBe(true);
    expect(tauri.requestPermission).toHaveBeenCalled();
  });

  it("sends a due reminder through the plugin", async () => {
    tauri.on = true;
    notify.rescheduleAll([{ id: "r1", title: "Stand up", scheduledAt: at(1000), delivered: false }], vi.fn());
    await vi.advanceTimersByTimeAsync(1000);
    expect(tauri.sendNotification).toHaveBeenCalledWith({ title: "Signal: Stand up" });
    expect(window.Notification).not.toHaveBeenCalled();
  });
});

describe("rescheduleAll", () => {
  it("fires a future reminder once and reports it delivered", () => {
    const onDelivered = vi.fn();
    notify.rescheduleAll([{ id: "r1", title: "Call", scheduledAt: at(60_000), delivered: false }], onDelivered);

    expect(window.Notification).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60_000);
    expect(window.Notification).toHaveBeenCalledTimes(1);
    expect(window.Notification).toHaveBeenCalledWith("Signal: Call", expect.any(Object));
    expect(onDelivered).toHaveBeenCalledWith("r1");
  });

  it("skips delivered reminders", () => {
    const onDelivered = vi.fn();
    notify.rescheduleAll([{ id: "r1", title: "Done", scheduledAt: at(-60_000), delivered: true }], onDelivered);
    vi.runAllTimers();
    expect(window.Notification).not.toHaveBeenCalled();
    expect(onDelivered).not.toHaveBeenCalled();
  });

  it("catches up a reminder missed within the last hour", () => {
    const onDelivered = vi.fn();
    notify.rescheduleAll([{ id: "r1", title: "Missed", scheduledAt: at(-10 * 60_000), delivered: false }], onDelivered);
    expect(window.Notification).toHaveBeenCalledTimes(1);
    expect(onDelivered).toHaveBeenCalledWith("r1");
  });

  it("marks an old backlog delivered without firing it", () => {
    const onDelivered = vi.fn();
    const old = Array.from({ length: 5 }, (_, i) => ({ id: `o${i}`, title: "Old", scheduledAt: at(-(i + 2) * HOUR), delivered: false }));
    notify.rescheduleAll(old, onDelivered);
    vi.runAllTimers();
    expect(window.Notification).not.toHaveBeenCalled();
    expect(onDelivered).toHaveBeenCalledTimes(5);
  });

  it("waits the full time for a reminder more than 7 days out", () => {
    const onDelivered = vi.fn();
    notify.rescheduleAll([{ id: "r1", title: "Far", scheduledAt: at(10 * 24 * HOUR), delivered: false }], onDelivered);

    vi.advanceTimersByTime(7 * 24 * HOUR + 1000);
    expect(window.Notification).not.toHaveBeenCalled();
    vi.advanceTimersByTime(3 * 24 * HOUR);
    expect(window.Notification).toHaveBeenCalledTimes(1);
    expect(onDelivered).toHaveBeenCalledWith("r1");
  });
});
