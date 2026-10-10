// Real temp vault on disk, real server over an in-memory transport. No fs mocks.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "./createServer.js";
import { resolveVault } from "./config.js";

let vault;
let client;

const call = async (name, args = {}) => {
  const res = await client.callTool({ name, arguments: args });
  const text = res.content[0].text;
  return { isError: res.isError === true, text, data: res.isError ? null : JSON.parse(text) };
};
const read = (...p) => fs.readFile(path.join(vault, ...p), "utf8");
const lines = async (...p) => (await read(...p)).trim().split("\n").map((l) => JSON.parse(l));

beforeEach(async () => {
  vault = await fs.mkdtemp(path.join(os.tmpdir(), "maia-mcp-"));
  await resolveVault({ MAIA_VAULT: vault });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await createServer(vault).connect(a);
  client = new Client({ name: "test", version: "1" });
  await client.connect(b);
});
afterEach(async () => {
  await client.close();
  await fs.rm(vault, { recursive: true, force: true });
});

const seedProject = () =>
  call("create_project", { name: "Alpha", workstreams: [{ name: "Design" }, { name: "Build" }], milestones: [{ title: "Beta", workstream: "Build" }] });

describe("config", () => {
  it("fails fast on missing or bad vault", async () => {
    await expect(resolveVault({})).rejects.toThrow(/MAIA_VAULT is not set/);
    await expect(resolveVault({ MAIA_VAULT: path.join(vault, "nope") })).rejects.toThrow(/does not exist/);
    await expect(resolveVault({ MAIA_VAULT: vault })).resolves.toBe(vault);
  });
});

describe("tasks", () => {
  it("create / update / move round trip with the status rule", async () => {
    await seedProject();
    await call("create_project", { name: "Beta project" });
    const created = await call("create_task", { project: "Alpha", title: "Wire it", workstream: "build", milestone: "beta", priority: "p1" });
    expect(created.data.file).toBe("Alpha/tasks/Wire it.md");
    const id = created.data.id;

    const doing = await call("update_task", { id, patch: { status: "doing" } });
    expect(doing.data.status).toBe("doing");
    const text = await read("Opus", "Alpha", "tasks", "Wire it.md");
    expect(text).toMatch(/status: doing/);
    expect(text).toMatch(/startedAt:/);
    expect(text).toMatch(/workstream: Build/);
    expect(text).not.toMatch(/^done:/m);

    await call("update_task", { id, patch: { status: "done" } });
    expect((await read("Opus", "Alpha", "tasks", "Wire it.md"))).toMatch(/doneAt:/);
    await call("update_task", { id, patch: { status: "todo" } });
    expect((await read("Opus", "Alpha", "tasks", "Wire it.md"))).not.toMatch(/doneAt:/);

    const moved = await call("update_task", { id, patch: { project: "Beta project" } });
    expect(moved.data.project).toBe("Beta project");
    expect(moved.data.dropped).toMatch(/workstream/);
    await expect(fs.access(path.join(vault, "Opus", "Alpha", "tasks", "Wire it.md"))).rejects.toThrow();
    expect(await read("Opus", "Beta project", "tasks", "Wire it.md")).toMatch(/title: Wire it/);

    const toInbox = await call("update_task", { id, patch: { project: "inbox" } });
    expect(toInbox.data.project).toBeNull();
    expect((await call("get_task", { id })).data.file).toBe("_inbox/tasks/Wire it.md");
  });

  it("inbox tasks and listing filters", async () => {
    await seedProject();
    await call("create_task", { title: "Loose end" });
    await call("create_task", { project: "Alpha", title: "A", status: "done", owner: "Dusan" });
    expect(await read("Opus", "_inbox", "tasks", "Loose end.md")).toMatch(/title: Loose end/);
    expect((await call("list_tasks", { project: "inbox" })).data.total).toBe(1);
    expect((await call("list_tasks", { status: "done" })).data.tasks.map((t) => t.title)).toEqual(["A"]);
    expect((await call("list_tasks", { owner: "dusan", project: "Alpha" })).data.total).toBe(1);
    const proj = await call("get_project", { project: "Alpha" });
    expect(proj.data.tasks.done).toBe(1);
    expect(proj.data.milestones[0].workstream).toBe("Build");
  });

  it("never overwrites an existing name", async () => {
    await seedProject();
    await call("create_task", { project: "Alpha", title: "Same" });
    await call("create_task", { project: "Alpha", title: "Same" });
    const files = await fs.readdir(path.join(vault, "Opus", "Alpha", "tasks"));
    expect(files.sort()).toEqual(["Same 2.md", "Same.md"]);
  });

  it("does not rewrite an untouched file or leave temp files", async () => {
    await seedProject();
    const { data } = await call("create_task", { project: "Alpha", title: "Calm" });
    const file = path.join(vault, "Opus", "Alpha", "tasks", "Calm.md");
    const before = await fs.stat(file);
    await new Promise((r) => setTimeout(r, 20));
    const res = await call("update_task", { id: data.id, patch: { title: "Calm", status: "todo" } });
    expect(res.data.unchanged).toBe(true);
    expect((await fs.stat(file)).mtimeMs).toBe(before.mtimeMs);
    expect((await fs.readdir(path.dirname(file))).filter((f) => f.endsWith(".tmp"))).toEqual([]);
  });

  it("leaves an unparsable file untouched and reports it", async () => {
    await seedProject();
    const bad = path.join(vault, "Opus", "Alpha", "tasks", "Broken.md");
    await fs.mkdir(path.dirname(bad), { recursive: true });
    const junk = "---\ntitle: [unclosed\n  : :\n---\nbody";
    await fs.writeFile(bad, junk);
    await call("create_task", { project: "Alpha", title: "Broken" });
    expect(await fs.readFile(bad, "utf8")).toBe(junk);
    expect(await read("Opus", "Alpha", "tasks", "Broken 2.md")).toMatch(/title: Broken/);
    const list = await call("list_projects");
    expect(list.data.warnings.some((w) => w.path.endsWith("Broken.md"))).toBe(true);
  });

  it("detects a file changed between read and write", async () => {
    await seedProject();
    const { data } = await call("create_task", { project: "Alpha", title: "Race" });
    const file = path.join(vault, "Opus", "Alpha", "tasks", "Race.md");
    const { safeWrite, ConflictError } = await import("./fsx.js");
    const readText = await fs.readFile(file, "utf8");
    await fs.writeFile(file, `${readText}\nedited elsewhere\n`);
    await expect(safeWrite(file, "new text", readText)).rejects.toBeInstanceOf(ConflictError);
    expect(await fs.readFile(file, "utf8")).toContain("edited elsewhere");
    await expect(safeWrite(file, "x", null)).rejects.toBeInstanceOf(ConflictError); // existing file, "create" mode
    expect(data.id).toBeTruthy();
  });

  it("returns errors instead of throwing", async () => {
    const r = await call("get_task", { id: "nope" });
    expect(r.isError).toBe(true);
    expect(r.text).toMatch(/No task/);
    expect((await call("create_task", { project: "Ghost", title: "x" })).isError).toBe(true);
  });
});

describe("decisions, questions, projects", () => {
  it("adds and answers", async () => {
    await seedProject();
    await call("add_decision", { project: "Alpha", title: "Use Tauri", detail: "Because.", workstream: "Build" });
    const q = await call("add_question", { project: "Alpha", question: "Which vendor?", blocking: true });
    expect((await call("list_decisions", { project: "Alpha" })).data[0].workstream).toBe("Build");
    expect((await call("list_questions", { project: "Alpha", status: "open" })).data).toHaveLength(1);
    await call("answer_question", { id: q.data.id, answer: "Acme" });
    const answered = (await call("list_questions", { project: "Alpha", status: "answered" })).data;
    expect(answered[0].answer).toBe("Acme");
  });

  it("updates a project without renaming the folder", async () => {
    await seedProject();
    await call("update_project", { project: "Alpha", fields: { phase: "Build", addSuccessCriteria: ["Ships"], milestonePatches: [{ title: "Beta", status: "done" }] } });
    const p = (await call("get_project", { project: "Alpha" })).data;
    expect(p.phase).toBe("Build");
    expect(p.milestones[0].status).toBe("done");
    expect(p.successCriteria[0].text).toBe("Ships");
    expect(p.folder).toBe("Alpha");
    expect((await call("create_project", { name: "alpha" })).isError).toBe(true);
  });
});

describe("notes", () => {
  it("create, list, read; Opus is not a note", async () => {
    await seedProject();
    const n = await call("create_note", { title: "Idea: x", content: "hello **world**", tags: ["#spark"], project: "Alpha", kind: "idea" });
    expect(n.data.file).toBe("idea-x.md");
    const again = await call("create_note", { title: "Idea: x", content: "dupe" });
    expect(again.data.file).toBe("idea-x-2.md");
    const listed = await call("list_notes", { tag: "spark" });
    expect(listed.data.total).toBe(1);
    expect((await call("list_notes", { query: "WORLD" })).data.total).toBe(1);
    expect((await call("list_notes", { project: "Alpha" })).data.total).toBe(1);
    expect((await call("read_note", { title: "idea: x" })).isError).toBe(true); // two notes share the title
    const full = await call("read_note", { id: n.data.id });
    expect(full.data.content).toBe("hello **world**");
    expect(full.data.kind).toBe("idea");
    expect((await call("read_note", { id: "missing" })).isError).toBe(true);
  });
});

describe("nested notes", () => {
  it("lists notes in subfolders, skips Opus/dot/node_modules, creates inside a folder", async () => {
    await seedProject();
    const put = async (rel, text) => {
      await fs.mkdir(path.dirname(path.join(vault, rel)), { recursive: true });
      await fs.writeFile(path.join(vault, rel), text);
    };
    await put("Areas/Design/System.md", "---\ntitle: System\n---\nbody a");
    await put("Omnis/PROJECTS/Plan.md", "plan body");
    await put(".obsidian/hidden.md", "no");
    await put("node_modules/pkg/readme.md", "no");
    await put("Areas/.trash/gone.md", "no");

    const listed = await call("list_notes", {});
    expect(listed.data.notes.map((n) => n.file).sort()).toEqual(["Areas/Design/System.md", "Omnis/PROJECTS/Plan.md"]);
    expect(listed.data.notes.find((n) => n.title === "Plan").folder).toBe("Omnis/PROJECTS");
    expect((await call("list_notes", { folder: "Areas" })).data.total).toBe(1);

    const a = await call("create_note", { title: "Plan", content: "x", folder: "Omnis/PROJECTS" });
    expect(a.data).toMatchObject({ file: "Omnis/PROJECTS/plan-2.md", folder: "Omnis/PROJECTS" });
    const b = await call("create_note", { title: "Plan", content: "y", folder: "Omnis/PROJECTS" });
    expect(b.data.file).toBe("Omnis/PROJECTS/plan-3.md");
    expect((await call("create_note", { title: "Bad", content: "x", folder: "../out" })).isError).toBe(true);
    expect((await call("create_note", { title: "Bad", content: "x", folder: "Opus/x" })).isError).toBe(true);
    const read1 = await call("read_note", { id: a.data.id });
    expect(read1.data.folder).toBe("Omnis/PROJECTS");
  });
});

describe("activity", () => {
  it("appends per project and to the inbox", async () => {
    await seedProject();
    const { data } = await call("create_task", { project: "Alpha", title: "Log me" });
    await call("update_task", { id: data.id, patch: { status: "doing" } });
    await call("create_task", { title: "Inbox thing" });
    const entries = await lines("Opus", "Alpha", "activity.jsonl");
    expect(entries.map((e) => e.kind)).toEqual(["created", "created", "status"]);
    expect(entries[2]).toMatchObject({ collection: "tasks", from: "todo", to: "doing", actor: "claude-mcp" });
    const inbox = await lines("Opus", "_inbox", "activity.jsonl");
    expect(inbox[0]).toMatchObject({ title: "Inbox thing", projectId: null });
    const listed = await call("list_activity", { project: "Alpha", limit: 2 });
    expect(listed.data).toHaveLength(2);
    expect(listed.data[0].kind).toBe("status");
  });
});
