// MCP v2: agenda, weekly report, trash, small edits. Real temp vault, in-memory client/server.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "./createServer.js";
import { resolveVault } from "./config.js";
import { loadSnapshot } from "./store.js";
import { buildReportSummary, reportMarkdown } from "../src/features/Opus/lib/report.js";
import { weekRange } from "../src/features/Opus/lib/metrics.js";

let vault;
let client;

const call = async (name, args = {}) => {
  const res = await client.callTool({ name, arguments: args });
  const text = res.content[0].text;
  return { isError: res.isError === true, text, data: res.isError ? null : JSON.parse(text) };
};
const lines = async (...p) => (await fs.readFile(path.join(vault, ...p), "utf8")).trim().split("\n").map((l) => JSON.parse(l));
const put = async (rel, text) => {
  await fs.mkdir(path.dirname(path.join(vault, rel)), { recursive: true });
  await fs.writeFile(path.join(vault, rel), text);
};
const taskFile = (project, name, fields) =>
  put(`Opus/${project}/tasks/${name}.md`, `---\nid: ${fields.id}\ntitle: ${name}\n${Object.entries(fields).filter(([k]) => k !== "id").map(([k, v]) => `${k}: ${v}`).join("\n")}\n---\n`);

beforeEach(async () => {
  vault = await fs.mkdtemp(path.join(os.tmpdir(), "maia-mcp2-"));
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

const seed = () => call("create_project", {
  name: "Alpha", targetDate: "2026-11-30",
  workstreams: [{ name: "Design", owner: "Ana" }, { name: "Build" }],
  milestones: [{ title: "Beta", date: "2026-10-12", workstream: "Build" }, { title: "Launch", date: "2026-12-01", status: "at-risk" }, { title: "Far", date: "2027-01-01" }],
});

const TODAY = "2026-10-08"; // a Thursday

describe("get_agenda", () => {
  beforeEach(async () => {
    await seed();
    await taskFile("Alpha", "Late 10d", { id: "t1", status: "todo", due: "2026-09-28", priority: "p2" });
    await taskFile("Alpha", "Late 2d", { id: "t2", status: "todo", due: "2026-10-06", priority: "p1", owner: "Dusan" });
    await taskFile("Alpha", "Today job", { id: "t3", status: "todo", due: "2026-10-08", workstream: "Design" });
    await taskFile("Alpha", "Soon job", { id: "t4", status: "todo", due: "2026-10-12" });
    await taskFile("Alpha", "Too far", { id: "t5", status: "todo", due: "2026-10-20" });
    await taskFile("Alpha", "Stuck", { id: "t6", status: "blocked", due: "2026-10-02" });
    await taskFile("Alpha", "Stuck no date", { id: "t7", status: "blocked" });
    await taskFile("Alpha", "Working", { id: "t8", status: "doing", isNextAction: true, owner: "Dusan" });
    await taskFile("Alpha", "Finished late", { id: "t9", status: "done", due: "2026-09-01" });
    await call("create_project", { name: "Paused one", status: "Paused" });
    await taskFile("Paused one", "Ignored", { id: "p1", status: "todo", due: "2026-09-01" });
    await call("create_task", { title: "Inbox late", due: "2026-10-07" });
    await call("add_question", { project: "Alpha", question: "Which vendor?", blocking: true, owner: "Dusan" });
    await call("add_question", { project: "Alpha", question: "Nice to know?" });
  });

  it("groups, counts and sorts by urgency with a fixed today", async () => {
    const { data } = await call("get_agenda", { today: TODAY });
    expect(data.counts).toMatchObject({ overdue: 4, dueToday: 1, dueSoon: 1, blocked: 1, doing: 1, nextActions: 1, blockingQuestions: 1 });
    expect(data.overdue.map((t) => t.title)).toEqual(["Late 10d", "Stuck", "Late 2d", "Inbox late"]);
    expect(data.overdue[0]).toMatchObject({ project: "Alpha", id: "t1", due: "2026-09-28", daysOverdue: 10, priority: "p2", status: "todo" });
    expect(data.overdue.find((t) => t.title === "Inbox late").project).toBeNull();
    expect(data.dueToday[0]).toMatchObject({ title: "Today job", workstream: "Design" });
    expect(data.dueSoon.map((t) => t.title)).toEqual(["Soon job"]);
    expect(data.blocked.map((t) => t.title)).toEqual(["Stuck no date"]); // "Stuck" is already in overdue
    expect(data.doing[0].title).toBe("Working");
    expect(data.nextActions[0]).toMatchObject({ title: "Working", isNextAction: true });
    expect(data.blockingQuestions[0]).toMatchObject({ title: "Which vendor?", owner: "Dusan", project: "Alpha" });
    expect(JSON.stringify(data)).not.toContain("Ignored");
    expect(JSON.stringify(data)).not.toContain("Finished late");
  });

  it("lists milestones due in the window or at risk, not far ones", async () => {
    const { data } = await call("get_agenda", { today: TODAY });
    expect(data.milestones.map((m) => [m.title, m.reason])).toEqual([["Beta", "due"], ["Launch", "at-risk"]]);
    expect(data.milestones[0]).toMatchObject({ daysUntil: 4, workstream: "Build" });
    const wide = await call("get_agenda", { today: TODAY, days: 120 });
    expect(wide.data.milestones.map((m) => m.title)).toContain("Far");
    expect(wide.data.dueSoon.map((t) => t.title)).toEqual(["Soon job", "Too far"]);
  });

  it("filters by project and owner and caps groups", async () => {
    const mine = (await call("get_agenda", { today: TODAY, owner: "dusan" })).data;
    expect(mine.overdue.map((t) => t.title)).toEqual(["Late 2d"]);
    expect(mine.counts.blockingQuestions).toBe(1);
    const one = (await call("get_agenda", { today: TODAY, project: "Alpha", limit: 1 })).data;
    expect(one.overdue).toHaveLength(1);
    expect(one.counts.overdue).toBe(3);
    expect(one.truncated).toBe(true);
    const paused = (await call("get_agenda", { today: TODAY, project: "Paused one" })).data;
    expect(paused.overdue.map((t) => t.title)).toEqual(["Ignored"]);
    expect((await call("get_agenda", { project: "Nope" })).isError).toBe(true);
  });
});

describe("weekly_report", () => {
  const seedWeek = async () => {
    await seed();
    await taskFile("Alpha", "Shipped", { id: "w1", status: "done", createdAt: "2026-09-20T09:00:00.000Z", startedAt: "2026-10-05T09:00:00.000Z", doneAt: "2026-10-06T10:00:00.000Z", workstream: "Design" });
    await taskFile("Alpha", "Slips", { id: "w2", status: "todo", createdAt: "2026-09-21T09:00:00.000Z", due: "2026-10-07", owner: "Ana" });
    await taskFile("Alpha", "Next up", { id: "w3", status: "todo", createdAt: "2026-09-21T09:00:00.000Z", due: "2026-10-13" });
    await call("add_decision", { project: "Alpha", title: "Go native", date: "2026-10-07" });
    await call("add_question", { project: "Alpha", question: "Budget?", blocking: true });
  };

  it("matches the app generator exactly and picks the week from any date", async () => {
    await seedWeek();
    const { data } = await call("weekly_report", { project: "Alpha", today: TODAY });
    const snap = await loadSnapshot(vault);
    const rec = snap.projects[0];
    const meta = { ...rec.item, decisions: rec.decisions.map((r) => r.item), questions: rec.questions.map((r) => r.item) };
    const range = weekRange(TODAY);
    const summary = buildReportSummary({ project: meta, tasks: rec.tasks.map((r) => r.item), range, today: TODAY });
    expect(data.markdown).toBe(reportMarkdown({ project: meta, summary, range }));
    expect(data.range).toEqual({ from: "2026-10-05", to: "2026-10-11" });
    expect(data.markdown).toContain("# Alpha: status, week of 5 Oct");
    expect(data.markdown).toContain("- Shipped (Design)");
    expect(data.markdown).toContain("- Slips (was due 7 Oct)");
    expect(data.markdown).toContain("- Go native (7 Oct)");
    expect(data.markdown).toContain("- Question: Budget?");
    const sameWeek = await call("weekly_report", { project: "Alpha", today: TODAY, week_start: "2026-10-10" });
    expect(sameWeek.data.markdown).toBe(data.markdown);
    expect((await call("weekly_report", { project: "Alpha", today: TODAY, week_start: "2026-09-28" })).data.range.from).toBe("2026-09-28");
  });

  it("saves one linked #report note and never twice", async () => {
    await seedWeek();
    const first = await call("weekly_report", { project: "Alpha", today: TODAY, save: true });
    expect(first.data.saved).toBe(true);
    const note = await call("read_note", { title: "Weekly report: Alpha, 2026-10-05" });
    expect(note.data.tags).toEqual(["report"]);
    expect(note.data.content).toBe(`${first.data.markdown.trimEnd()}\n\n#report\n`);
    expect((await call("list_notes", { project: "Alpha", tag: "report" })).data.total).toBe(1);
    const again = await call("weekly_report", { project: "Alpha", today: TODAY, save: true });
    expect(again.data).toMatchObject({ saved: false, file: first.data.file });
    expect(again.data.message).toMatch(/already exists/);
    expect((await call("list_notes", { tag: "report" })).data.total).toBe(1);
  });

  it("does not save a report for a project without tasks", async () => {
    await seed();
    const r = await call("weekly_report", { project: "Alpha", today: TODAY, save: true });
    expect(r.data.saved).toBe(false);
    expect((await call("list_notes", {})).data.total).toBe(0);
  });
});

describe("trash", () => {
  const trashed = async () => {
    const out = [];
    const walk = async (dir) => {
      for (const e of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
        if (e.isDirectory()) await walk(path.join(dir, e.name));
        else out.push(path.relative(path.join(vault, "Opus"), path.join(dir, e.name)));
      }
    };
    await walk(path.join(vault, "Opus", "_trash"));
    return out;
  };

  it("delete, list_trash, restore round trip for task, decision and question", async () => {
    await seed();
    const t = await call("create_task", { project: "Alpha", title: "Doomed", workstream: "Design", desc: "body text" });
    const inbox = await call("create_task", { title: "Loose" });
    const d = await call("add_decision", { project: "Alpha", title: "Old call" });
    const q = await call("add_question", { project: "Alpha", question: "Why though?" });
    const original = await fs.readFile(path.join(vault, "Opus", "Alpha", "tasks", "Doomed.md"), "utf8");

    const del = await call("delete_task", { id: t.data.id });
    expect(del.data.trashed).toBe(true);
    await call("delete_task", { id: inbox.data.id });
    await call("delete_decision", { id: d.data.id });
    await call("delete_question", { id: q.data.id });
    await expect(fs.access(path.join(vault, "Opus", "Alpha", "tasks", "Doomed.md"))).rejects.toThrow();
    expect((await call("list_tasks", {})).data.total).toBe(0);

    const date = new Date().toISOString().slice(0, 10);
    expect((await trashed()).sort()).toEqual([
      `_trash/${date}/Alpha/decisions/Old call.md`, `_trash/${date}/Alpha/questions/Why though.md`,
      `_trash/${date}/Alpha/tasks/Doomed.md`, `_trash/${date}/_inbox/tasks/Loose.md`,
    ]);
    // trashed items stay out of the project data
    expect((await call("list_projects")).data.warnings).toEqual([]);
    expect((await call("list_decisions", { project: "Alpha" })).data).toEqual([]);

    const listed = (await call("list_trash")).data;
    expect(listed.total).toBe(4);
    const task = listed.items.find((i) => i.kind === "task" && i.project === "Alpha");
    expect(task).toMatchObject({ id: t.data.id, title: "Doomed", deleted: date, trashPath: `_trash/${date}/Alpha/tasks/Doomed.md` });
    expect(listed.items.find((i) => i.title === "Loose").project).toBeNull();
    expect(listed.items.find((i) => i.kind === "question").title).toBe("Why though?");
    expect((await call("list_trash", { project: "inbox" })).data.total).toBe(1);

    expect((await call("restore_from_trash", { path: task.trashPath })).data.file).toBe("Alpha/tasks/Doomed.md");
    expect(await fs.readFile(path.join(vault, "Opus", "Alpha", "tasks", "Doomed.md"), "utf8")).toBe(original);
    for (const i of (await call("list_trash")).data.items) await call("restore_from_trash", { path: i.trashPath });
    expect((await call("list_tasks", {})).data.total).toBe(2);
    expect((await call("list_questions", { project: "Alpha" })).data).toHaveLength(1);
    expect((await call("get_task", { id: t.data.id })).data.workstream).toBe("Design");
    expect((await call("list_trash")).data.total).toBe(0);

    const kinds = (await lines("Opus", "Alpha", "activity.jsonl")).filter((e) => e.kind === "deleted");
    expect(kinds.map((e) => e.collection).sort()).toEqual(["decisions", "questions", "tasks"]);
    expect(kinds[0].actor).toBe("claude-mcp");
  });

  it("never overwrites in the trash: same name twice gets a suffix", async () => {
    await seed();
    const a = await call("create_task", { project: "Alpha", title: "Twin" });
    await call("delete_task", { id: a.data.id });
    const b = await call("create_task", { project: "Alpha", title: "Twin" });
    await call("delete_task", { id: b.data.id });
    expect((await trashed()).map((p) => path.basename(p)).sort()).toEqual(["Twin 2.md", "Twin.md"]);
  });

  it("detects a conflict on delete and keeps the file", async () => {
    await seed();
    const t = await call("create_task", { project: "Alpha", title: "Race" });
    const { moveGuarded, ConflictError } = await import("./fsx.js");
    const file = path.join(vault, "Opus", "Alpha", "tasks", "Race.md");
    const read = await fs.readFile(file, "utf8");
    await fs.writeFile(file, `${read}\nedited elsewhere\n`);
    await expect(moveGuarded(file, path.join(vault, "Opus", "_trash", "x.md"), read)).rejects.toBeInstanceOf(ConflictError);
    expect(await fs.readFile(file, "utf8")).toContain("edited elsewhere");
    await expect(fs.access(path.join(vault, "Opus", "_trash", "x.md"))).rejects.toThrow();
    expect(t.data.id).toBeTruthy();
  });

  it("refuses bad restores with clear errors", async () => {
    await seed();
    const t = await call("create_task", { project: "Alpha", title: "Back" });
    await call("delete_task", { id: t.data.id });
    const { trashPath } = (await call("list_trash")).data.items[0];

    await call("create_task", { project: "Alpha", title: "Back" }); // name taken
    const taken = await call("restore_from_trash", { path: trashPath });
    expect(taken.isError).toBe(true);
    expect(taken.text).toMatch(/already exists/);
    expect((await call("list_trash")).data.total).toBe(1);

    expect((await call("restore_from_trash", { path: "../Alpha/tasks/Back.md" })).text).toMatch(/not a trash path/);
    expect((await call("restore_from_trash", { path: trashPath.replace("Back.md", "Nope.md") })).text).toMatch(/Nothing in the trash/);

    const date = trashPath.split("/")[1];
    await put(`Opus/_trash/${date}/Ghost/tasks/Orphan.md`, "---\nid: g1\ntitle: Orphan\n---\n");
    const noProject = await call("restore_from_trash", { path: `_trash/${date}/Ghost/tasks/Orphan.md` });
    expect(noProject.text).toMatch(/Project folder "Ghost" no longer exists/);

    await put(`Opus/_trash/${date}/Alpha/tasks/Broken.md`, "---\ntitle: [unclosed\n  : :\n---\nbody");
    const broken = await call("restore_from_trash", { path: `_trash/${date}/Alpha/tasks/Broken.md` });
    expect(broken.isError).toBe(true);
    expect(broken.text).toMatch(/does not parse/);
    await expect(fs.access(path.join(vault, "Opus", "Alpha", "tasks", "Broken.md"))).rejects.toThrow();

    await put(`Opus/_trash/${date}/_inbox/decisions/Odd.md`, "---\nid: d9\ntitle: Odd\n---\n");
    expect((await call("restore_from_trash", { path: `_trash/${date}/_inbox/decisions/Odd.md` })).isError).toBe(true);
  });

  it("the snapshot ignores _trash and _backups, and a project can't be named _trash", async () => {
    await seed();
    await put("Opus/_trash/2026-10-01/Alpha/project.md", "---\nid: ghost\nname: Ghost\n---\n");
    await put("Opus/_backups/backup-1.json", "{}");
    expect((await call("list_projects")).data.projects.map((p) => p.name)).toEqual(["Alpha"]);
    expect((await call("list_projects")).data.warnings).toEqual([]);
    const p = await call("create_project", { name: "_trash" });
    expect(p.data.folder).toBe("_trash 2");
  });
});

describe("small edits", () => {
  it("update_decision and update_question keep file names and log activity", async () => {
    await seed();
    const d = await call("add_decision", { project: "Alpha", title: "Pick A" });
    await call("update_decision", { id: d.data.id, patch: { title: "Pick B", detail: "why", workstream: "Build" } });
    const listed = (await call("list_decisions", { project: "Alpha" })).data[0];
    expect(listed).toMatchObject({ title: "Pick B", detail: "why", workstream: "Build" });
    await fs.access(path.join(vault, "Opus", "Alpha", "decisions", "Pick A.md"));
    expect((await call("update_decision", { id: d.data.id, patch: { workstream: "Nope" } })).isError).toBe(true);
    expect((await call("update_decision", { id: d.data.id, patch: { title: "Pick B" } })).data.unchanged).toBe(true);

    const q = await call("add_question", { project: "Alpha", question: "Ready?" });
    await call("answer_question", { id: q.data.id, answer: "Yes" });
    const reopened = await call("update_question", { id: q.data.id, patch: { status: "open", blocking: true } });
    expect(reopened.data.status).toBe("open");
    const row = (await call("list_questions", { project: "Alpha" })).data[0];
    expect(row).toMatchObject({ status: "open", blocking: true, answer: "Yes" });
    const log = await lines("Opus", "Alpha", "activity.jsonl");
    expect(log.filter((e) => e.collection === "questions" && e.kind === "status").map((e) => e.to)).toEqual(["answered", "open"]);
    expect(log.at(-1).actor).toBe("claude-mcp");
  });

  it("add_workstream and add_milestone append without renaming", async () => {
    await seed();
    const ws = await call("add_workstream", { project: "Alpha", name: "Research", owner: "Ana" });
    expect(ws.data.workstream.name).toBe("Research");
    expect((await call("add_workstream", { project: "Alpha", name: "research" })).isError).toBe(true);
    const ms = await call("add_milestone", { project: "Alpha", title: "Alpha cut", date: "2026-10-20", workstream: "Research" });
    expect(ms.data.milestone.date).toBe("2026-10-20");
    expect((await call("add_milestone", { project: "Alpha", title: "Alpha cut", date: "2026-10-21" })).isError).toBe(true);
    expect((await call("add_milestone", { project: "Alpha", title: "X", date: "2026-10-21", workstream: "Nope" })).isError).toBe(true);
    const p = (await call("get_project", { project: "Alpha" })).data;
    expect(p.workstreams.map((w) => w.name)).toEqual(["Design", "Build", "Research"]);
    expect(p.milestones.find((m) => m.title === "Alpha cut").workstream).toBe("Research");
    expect(p.milestones.find((m) => m.title === "Beta").workstream).toBe("Build");
    expect(p.folder).toBe("Alpha");
  });
});
