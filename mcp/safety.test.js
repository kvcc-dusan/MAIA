// Adversarial cases: hostile names, files and inputs. Real temp vault, real server, no fs mocks
// (except spies that force a race or a filesystem without hard links).
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "./createServer.js";
import { MAX_TEXT_BYTES, safeWrite, ConflictError } from "./fsx.js";
import { loadSnapshot } from "./store.js";
import { moveTaskFile } from "./writer.js";

let vault;
let client;

const call = async (name, args = {}) => {
  const res = await client.callTool({ name, arguments: args });
  const text = res.content[0].text;
  return { isError: res.isError === true, text, data: res.isError ? null : JSON.parse(text) };
};
const opus = (...p) => path.join(vault, "Opus", ...p);
const listAll = async (dir) => (await fs.readdir(dir, { recursive: true })).map(String);

beforeEach(async () => {
  vault = await fs.mkdtemp(path.join(os.tmpdir(), "maia-mcp-safety-"));
  await fs.mkdir(opus(), { recursive: true });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await createServer(vault).connect(a);
  client = new Client({ name: "test", version: "1" });
  await client.connect(b);
});
afterEach(async () => {
  vi.restoreAllMocks();
  await client.close();
  await fs.rm(vault, { recursive: true, force: true });
});

describe("file names", () => {
  it("creates tasks whose titles are long in bytes (emoji, CJK) and leaves no temp files", async () => {
    await call("create_project", { name: "Alpha" });
    for (const title of ["😀".repeat(80), "日".repeat(80)]) {
      const res = await call("create_task", { project: "Alpha", title });
      expect(res.isError, res.text).toBe(false);
    }
    const names = await fs.readdir(opus("Alpha", "tasks"));
    expect(names).toHaveLength(2);
    names.forEach((n) => expect(Buffer.byteLength(n)).toBeLessThanOrEqual(255));
  });

  it("never lets a title escape the project folder or claim a reserved name", async () => {
    await call("create_project", { name: "Alpha" });
    const evil = ["../../escape", "..\\..\\escape", "/etc/passwd", "..", ".", "_trash", "project"];
    for (const title of evil) await call("create_task", { project: "Alpha", title });
    const created = await listAll(vault);
    expect(created.every((p) => p.startsWith("Opus"))).toBe(true);
    expect((await fs.readdir(opus("Alpha", "tasks"))).every((n) => /^[^/\\]+\.md$/.test(n) && !n.startsWith("."))).toBe(true);
    const proj = await call("create_project", { name: "_Trash" });
    expect(proj.data.folder).toBe("_Trash 2");
    expect((await call("create_project", { name: ".." })).data.folder).toMatch(/^Project /);
  });
});

describe("writes", () => {
  it("fails the write instead of replacing a file that appears during the no-hard-link fallback", async () => {
    const target = opus("race.md");
    await fs.writeFile(target, "mine");
    // exists() says no (race), link is unsupported: the old fallback renamed over the file.
    vi.spyOn(fs, "access").mockRejectedValue(Object.assign(new Error("nope"), { code: "ENOENT" }));
    vi.spyOn(fs, "link").mockRejectedValue(Object.assign(new Error("no links"), { code: "EPERM" }));
    await expect(safeWrite(target, "theirs", null)).rejects.toBeInstanceOf(ConflictError);
    expect(await fs.readFile(target, "utf8")).toBe("mine");
  });

  it("creates a new file on a filesystem without hard links and cleans up", async () => {
    vi.spyOn(fs, "link").mockRejectedValue(Object.assign(new Error("no links"), { code: "EPERM" }));
    const target = opus("fresh.md");
    await safeWrite(target, "hello", null);
    expect(await fs.readFile(target, "utf8")).toBe("hello");
    expect(await fs.readdir(opus())).toEqual(["fresh.md"]);
  });

  it("rolls the copy back when the source changes during a task move", async () => {
    await call("create_project", { name: "Alpha" });
    await call("create_project", { name: "Beta" });
    const { data } = await call("create_task", { project: "Alpha", title: "Move me" });
    const snap = await loadSnapshot(vault);
    const rec = snap.projects[0].tasks.find((t) => t.item.id === data.id);
    const to = snap.projects[1];
    const realLink = fs.link.bind(fs);
    vi.spyOn(fs, "link").mockImplementation(async (a, b) => {
      await realLink(a, b);
      await fs.appendFile(rec.path, "\nedited in Obsidian during the move\n");
    });
    await expect(moveTaskFile(snap, rec, { ...rec.item, title: "Move me" }, to)).rejects.toBeInstanceOf(ConflictError);
    expect(await fs.readdir(opus("Beta", "tasks"))).toEqual([]);
    expect(await fs.readFile(rec.path, "utf8")).toContain("edited in Obsidian");
  });
});

describe("hostile files on disk", () => {
  beforeEach(async () => {
    await call("create_project", { name: "Alpha" });
  });

  it("skips invalid UTF-8 and oversized files with a warning and never rewrites them", async () => {
    await fs.mkdir(opus("Alpha", "tasks"), { recursive: true });
    const bad = opus("Alpha", "tasks", "latin1.md");
    await fs.writeFile(bad, Buffer.concat([Buffer.from("---\nid: bad1\ntitle: Caf"), Buffer.from([0xe9]), Buffer.from("\n---\n")]));
    const huge = opus("Alpha", "tasks", "huge.md");
    await fs.writeFile(huge, Buffer.alloc(MAX_TEXT_BYTES + 1, "a"));
    const before = await fs.readFile(bad);
    const list = await call("list_projects");
    expect(list.isError, list.text).toBe(false);
    expect(list.data.warnings.map((w) => w.path).sort()).toEqual([path.join("Alpha", "tasks", "huge.md"), path.join("Alpha", "tasks", "latin1.md")]);
    expect((await call("list_tasks", { project: "Alpha" })).data.total).toBe(0);
    expect(await fs.readFile(bad)).toEqual(before);
  });

  it("survives a folder named project.md and a binary note", async () => {
    await fs.mkdir(opus("Weird", "project.md"), { recursive: true });
    await fs.writeFile(path.join(vault, "scan.md"), Buffer.from([0x25, 0x50, 0x44, 0x46, 0x00, 0x01, 0xff]));
    const list = await call("list_projects");
    expect(list.isError, list.text).toBe(false);
    expect(list.data.projects.map((p) => p.name)).toEqual(["Alpha"]);
    const notes = await call("list_notes");
    expect(notes.isError, notes.text).toBe(false);
  });

  it("keeps absolute paths out of tool output", async () => {
    await fs.mkdir(opus("Alpha", "tasks"), { recursive: true });
    await fs.writeFile(opus("Alpha", "tasks", "binary.md"), Buffer.from([0, 1, 2]));
    const warnings = JSON.stringify((await call("list_projects")).data.warnings);
    expect(warnings).not.toContain(vault);
    vi.spyOn(fs, "link").mockRejectedValue(Object.assign(new Error("exists"), { code: "EEXIST" }));
    const failed = await call("create_task", { project: "Alpha", title: "Conflict" });
    expect(failed.isError).toBe(true);
    expect(failed.text).not.toContain(vault);
  });
});

describe("input limits", () => {
  it("rejects oversized strings and arrays", async () => {
    await call("create_project", { name: "Alpha" });
    expect((await call("create_task", { project: "Alpha", title: "x".repeat(5000) })).isError).toBe(true);
    expect((await call("create_task", { project: "Alpha", title: "ok", desc: "x".repeat(2_000_000) })).isError).toBe(true);
    const many = Array.from({ length: 500 }, (_, i) => ({ name: `ws${i}` }));
    expect((await call("create_project", { name: "Big", workstreams: many })).isError).toBe(true);
    expect((await call("create_note", { title: "t", content: "x".repeat(2_000_000) })).isError).toBe(true);
  });

  it("only stores http, https and mailto project links", async () => {
    for (const url of ["javascript:alert(1)", "data:text/html,x", "file:///etc/passwd", " JavaScript:alert(1)"]) {
      const res = await call("create_project", { name: `P ${url.length}`, links: [{ url }] });
      expect(res.isError, url).toBe(true);
    }
    const ok = await call("create_project", { name: "Fine", links: [{ url: "https://figma.com/x" }, { url: "figma.com/y" }, { url: "mailto:a@b.co" }] });
    expect(ok.isError, ok.text).toBe(false);
  });
});
