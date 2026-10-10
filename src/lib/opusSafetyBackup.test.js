import { describe, it, expect, vi } from "vitest";

const fs = vi.hoisted(() => ({ mkdir: vi.fn(), writeTextFile: vi.fn() }));
vi.mock("@tauri-apps/plugin-fs", () => fs);

import { writeOpusSafetyBackup } from "./opusSafetyBackup.js";
import { registerCloseFlush, hasPendingCloseFlush, runCloseFlush } from "./closeFlush.js";

describe("writeOpusSafetyBackup", () => {
  it("writes a timestamped JSON in Opus/_backups, with no dot path", async () => {
    const path = await writeOpusSafetyBackup("/vault/", { projects: [{ id: "p" }] }, new Date("2026-10-10T12:30:00.000Z"));
    expect(path).toBe("/vault/Opus/_backups/backup-2026-10-10T12-30-00.json");
    expect(fs.mkdir).toHaveBeenCalledWith("/vault/Opus/_backups", { recursive: true });
    expect(JSON.parse(fs.writeTextFile.mock.calls[0][1]).data.projects).toEqual([{ id: "p" }]);
  });

  it("rejects when the file cannot be written", async () => {
    fs.writeTextFile.mockRejectedValueOnce(new Error("read-only"));
    await expect(writeOpusSafetyBackup("/vault", {})).rejects.toThrow("read-only");
  });
});

describe("closeFlush", () => {
  it("only runs flushers that have something pending", async () => {
    const idle = { hasPending: () => false, flush: vi.fn(async () => {}) };
    const busy = { hasPending: () => true, flush: vi.fn(async () => {}) };
    const off = [registerCloseFlush(idle), registerCloseFlush(busy)];
    expect(hasPendingCloseFlush()).toBe(true);
    await runCloseFlush();
    expect(idle.flush).not.toHaveBeenCalled();
    expect(busy.flush).toHaveBeenCalledTimes(1);
    off.forEach((fn) => fn());
    expect(hasPendingCloseFlush()).toBe(false);
  });
});
