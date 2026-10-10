import { describe, it, expect } from "vitest";
import { fromFile, toFile } from "./taskFile.js";

const ctx = {
  workstreams: [{ id: "w1", name: "Design" }, { id: "w2", name: "Build" }],
  milestones: [{ id: "m1", title: "Beta" }],
};
const read = (text, over = {}) => fromFile(text, { fallbackId: "fb", fallbackTitle: "From name", projectContext: ctx, ...over });

const TASK = `---
id: t1
title: Ship the thing
status: doing
priority: p1
owner: Dusan
estimate: M
due: 2026-10-20
workstream: Design
milestone: Beta
order: 2
schedule: soon
isNextAction: true
createdAt: 2026-10-01T09:00:00.000Z
startedAt: 2026-10-02T09:00:00.000Z
---

Write the description here.

- [ ] sub item
`;

describe("taskFile", () => {
  it("reads every documented key and resolves names to ids", () => {
    const { ok, item, warnings } = read(TASK);
    expect(ok).toBe(true);
    expect(warnings).toEqual([]);
    expect(item).toMatchObject({
      id: "t1", title: "Ship the thing", status: "doing", done: false, priority: "p1", owner: "Dusan",
      estimate: "M", due: "2026-10-20", workstreamId: "w1", milestoneId: "m1", order: 2,
      schedule: "soon", isNextAction: true, startedAt: "2026-10-02T09:00:00.000Z",
    });
    expect(item.desc).toBe("Write the description here.\n\n- [ ] sub item");
  });

  it("round-trips an untouched file byte for byte", () => {
    const { item } = read(TASK);
    expect(toFile(item, ctx, { source: TASK })).toBe(TASK);
  });

  it("round-trips Obsidian-style files with extra keys and comments", () => {
    const text = `---
# managed by Obsidian
id: t2
title: "Quoted: title"
status: todo
cssclasses: [wide]   # plugin key
tags:
  - a
  - b
---
Body with <!-- a comment --> inside.
`;
    const { item } = read(text);
    expect(item.extra).toEqual({ cssclasses: ["wide"], tags: ["a", "b"] });
    expect(toFile(item, ctx, { source: text })).toBe(text);
  });

  it("keeps extra keys and comments when one field changes", () => {
    const text = "---\n# keep\nid: t2\ntitle: A\nstatus: todo\nmy-key: 7\n---\nBody\n";
    const { item } = read(text);
    const out = toFile({ ...item, status: "blocked" }, ctx, { source: text });
    expect(out).toContain("# keep");
    expect(out).toContain("my-key: 7");
    expect(out).toContain("status: blocked");
    expect(out.endsWith("---\nBody\n")).toBe(true);
    expect(read(out).item.status).toBe("blocked");
  });

  it("normalizes CRLF to LF and nothing else", () => {
    const crlf = TASK.replace(/\n/g, "\r\n");
    const { item } = read(crlf);
    expect(toFile(item, ctx, { source: crlf })).toBe(TASK);
  });

  it("fills missing optional keys without writing them back", () => {
    const text = "---\nid: t3\ntitle: Minimal\n---\n";
    const { item, warnings } = read(text);
    expect(warnings).toEqual([]);
    expect(item).toMatchObject({ status: "todo", done: false, workstreamId: null, milestoneId: null, estimate: null, schedule: "today" });
    expect(toFile(item, ctx, { source: text })).toBe(text);
  });

  it("reads a file with no frontmatter using the fallbacks and keeps it as is", () => {
    const text = "just a note\n";
    const { ok, item } = read(text);
    expect(ok).toBe(true);
    expect(item).toMatchObject({ id: "fb", title: "From name", desc: "just a note" });
    expect(toFile(item, ctx, { source: text })).toBe(text);
  });

  it("writes the id when it first has to edit a frontmatter-less file", () => {
    const { item } = read("just a note\n");
    const out = toFile({ ...item, status: "done" }, ctx, { source: "just a note\n" });
    expect(out).toContain("id: fb");
    expect(out).toContain("status: done");
    expect(out).toContain("just a note");
  });

  it("warns on an unknown workstream, leaves the reference empty and keeps the typo on disk", () => {
    const text = "---\nid: t4\ntitle: X\nworkstream: Desgin\nmilestone: Beta\n---\n";
    const { item, warnings } = read(text);
    expect(item.workstreamId).toBeNull();
    expect(item.milestoneId).toBe("m1");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/Desgin/);
    const out = toFile({ ...item, owner: "Me" }, ctx, { source: text });
    expect(out).toContain("workstream: Desgin");
  });

  it("matches names trimmed and case-insensitively", () => {
    const { item, warnings } = read("---\nid: t5\ntitle: X\nworkstream: '  bUILD '\n---\n");
    expect(item.workstreamId).toBe("w2");
    expect(warnings).toEqual([]);
  });

  it("falls back and warns on invalid enum values instead of throwing", () => {
    const { item, warnings } = read("---\nid: t6\ntitle: X\nstatus: nope\npriority: urgent\nestimate: XL\nschedule: never\n---\n");
    expect(item.status).toBe("todo");
    expect(item.priority).toBeUndefined();
    expect(item.estimate).toBeNull();
    expect(item.schedule).toBe("today");
    expect(warnings).toHaveLength(4);
  });

  it("reads legacy completedAt as doneAt and never writes it", () => {
    const text = "---\nid: t7\ntitle: X\nstatus: done\ncompletedAt: 2026-09-01T00:00:00.000Z\n---\n";
    const { item } = read(text);
    expect(item.doneAt).toBe("2026-09-01T00:00:00.000Z");
    expect(item).not.toHaveProperty("completedAt");
    const fresh = toFile(item, ctx);
    expect(fresh).toContain("doneAt: 2026-09-01T00:00:00.000Z");
    expect(fresh).not.toContain("completedAt");
    expect(fresh).not.toMatch(/^done:/m);
  });

  it("writes workstream and milestone as names for a new file", () => {
    const out = toFile({ id: "n1", title: "New", desc: "d", workstreamId: "w2", milestoneId: "m1", status: "todo" }, ctx);
    expect(out).toContain("workstream: Build");
    expect(out).toContain("milestone: Beta");
    expect(out).not.toContain("w2");
  });

  it("does not throw on bad YAML or hostile input", () => {
    expect(fromFile("---\nid: [oops\n---\n", {})).toMatchObject({ ok: false });
    expect(fromFile(null, { fallbackId: "x" }).ok).toBe(true);
    expect(read("---\nid: 5\ntitle: [1, 2]\norder: abc\n---\n").ok).toBe(true);
  });
});
