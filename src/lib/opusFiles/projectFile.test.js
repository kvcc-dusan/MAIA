import { describe, it, expect } from "vitest";
import { fromFile, toFile, contextOf } from "./projectFile.js";

const PROJECT = `---
id: p1
name: Atlas
status: Active
phase: Build
icon: rocket
iconColor: blue
headline: Ship it
focus: Auth
startDate: 2026-09-01
targetDate: 2026-12-01
nextMeeting: 2026-10-15
createdAt: 2026-09-01T08:00:00.000Z
objective: Launch v1
workstreams:
  - id: w1
    name: Design
    owner: Ana
    status: active
    color: "1"
    order: 0
  - id: w2
    name: Build
    status: active
    color: "2"
    order: 1
milestones:
  - id: m1
    title: Beta
    date: 2026-11-01
    status: active
    workstream: Build
successCriteria:
  - id: s1
    text: 100 users
    done: false
links:
  - id: l1
    title: Repo
    url: https://example.com
    type: repo
pinnedNoteIds: [n1, n2]
---

The project description.
`;

describe("projectFile", () => {
  it("reads the full model including embedded collections", () => {
    const { ok, item, warnings } = fromFile(PROJECT, { fallbackId: "fb" });
    expect(ok).toBe(true);
    expect(warnings).toEqual([]);
    expect(item).toMatchObject({
      id: "p1", name: "Atlas", status: "Active", phase: "Build", icon: "rocket", iconColor: "blue",
      objective: "Launch v1", description: "The project description.", pinnedNoteIds: ["n1", "n2"],
      decisions: [], questions: [],
    });
    expect(item.workstreams.map((w) => w.id)).toEqual(["w1", "w2"]);
    expect(item.milestones[0]).toMatchObject({ id: "m1", title: "Beta", workstreamId: "w2", status: "active", done: false });
    expect(item.successCriteria).toEqual([{ id: "s1", text: "100 users", done: false }]);
    expect(item.links[0]).toMatchObject({ id: "l1", url: "https://example.com", type: "repo" });
  });

  it("round-trips an untouched file byte for byte", () => {
    const { item } = fromFile(PROJECT, { fallbackId: "fb" });
    expect(toFile(item, contextOf(item), { source: PROJECT })).toBe(PROJECT);
  });

  it("round-trips CRLF and Obsidian-style extras", () => {
    const text = "---\r\n# mine\r\nid: p2\r\nname: B\r\ncssclasses: wide\r\n---\r\nbody\r\n";
    const { item } = fromFile(text, { fallbackId: "fb" });
    expect(item.extra).toEqual({ cssclasses: "wide" });
    expect(toFile(item, contextOf(item), { source: text })).toBe(text.replace(/\r\n/g, "\n"));
  });

  it("falls back to the folder name and defaults when keys are missing", () => {
    const { item } = fromFile("---\nid: p3\n---\n", { fallbackId: "fb", fallbackTitle: "Folder name" });
    expect(item).toMatchObject({ name: "Folder name", status: "Active", workstreams: [], milestones: [], startDate: null });
  });

  it("warns about unknown status and bad entries without throwing", () => {
    const text = "---\nid: p4\nname: X\nstatus: Archived\nworkstreams: [Design, {nope: 1}, 5]\nmilestones:\n  - title: M\n    workstream: Missing\n---\n";
    const { ok, item, warnings } = fromFile(text, { fallbackId: "fb" });
    expect(ok).toBe(true);
    expect(item.status).toBe("Active");
    expect(item.workstreams.map((w) => w.name)).toEqual(["Design"]);
    expect(item.milestones[0].workstreamId).toBeNull();
    expect(warnings.length).toBeGreaterThanOrEqual(4);
  });

  it("gives entries without ids stable generated ids", () => {
    const text = "---\nid: p5\nname: X\nworkstreams:\n  - name: Design\nmilestones:\n  - title: Alpha\n---\n";
    const a = fromFile(text, { fallbackId: "fb" }).item;
    const b = fromFile(text, { fallbackId: "fb" }).item;
    expect(a.workstreams[0].id).toBe(b.workstreams[0].id);
    expect(a.milestones[0].id).toBe(b.milestones[0].id);
  });

  it("writes a new file with names for workstream references and no assets", () => {
    const item = {
      id: "p6", name: "New", status: "Paused", description: "Hi", assets: [{ id: "a", dataUrl: "data:..." }],
      workstreams: [{ id: "w1", name: "Design", owner: "", status: "active", color: "1", order: 0 }],
      milestones: [{ id: "m1", title: "Beta", date: "2026-11-01", status: "planned", workstreamId: "w1" }],
    };
    const out = toFile(item, contextOf(item));
    expect(out).toContain("workstream: Design");
    expect(out).not.toContain("assets");
    expect(out).not.toContain("data:");
    expect(out.endsWith("---\n\nHi\n")).toBe(true);
    const back = fromFile(out, { fallbackId: "x" }).item;
    expect(back.milestones[0].workstreamId).toBe("w1");
  });

  it("returns ok:false for bad YAML", () => {
    expect(fromFile("---\nname: [a\n---\n", {})).toMatchObject({ ok: false });
  });
});
