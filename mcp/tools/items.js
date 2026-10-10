// Write tools: add_decision, add_question, answer_question.
import { z } from "zod";
import { createProjectDecision, createQuestion, applyQuestionPatch } from "../../src/features/Opus/lib/projectModel.js";
import { findProject, findRecord, projectRecordOf } from "../store.js";
import { createItemFile, updateItemFile, logActivity } from "../writer.js";
import { handler, snapshotOf, rel, resolveWorkstream } from "./util.js";
import { isoDate, defined, short, medium, long } from "./schemas.js";

export const registerItemWrites = (server, vault) => {
  server.registerTool("add_decision", {
    description: "Record a decision in a project (decisions/<title>.md).",
    inputSchema: {
      project: short,
      title: short.min(1),
      detail: long.optional(),
      date: isoDate.optional().describe("Defaults to today"),
      by: short.optional().describe("Defaults to Claude"),
      workstream: short.optional(),
    },
  }, handler(async (a) => {
    const snap = await snapshotOf(vault);
    const rec = findProject(snap, a.project);
    const decision = createProjectDecision(defined({
      title: a.title.trim(), detail: a.detail, date: a.date, by: a.by ?? "Claude",
      workstreamId: resolveWorkstream(rec, a.workstream),
    }));
    const file = await createItemFile(snap, "decision", decision, rec);
    const warning = await logActivity(snap, {
      projectId: rec.item.id, kind: "created", collection: "decisions", itemId: decision.id, title: decision.title,
    });
    return { id: decision.id, file: rel(snap, file), ...(warning ? { warning } : {}) };
  }));

  server.registerTool("add_question", {
    description: "Add an open question to a project (questions/<question>.md).",
    inputSchema: {
      project: short,
      question: medium.min(1),
      owner: short.optional(),
      blocking: z.boolean().optional(),
      workstream: short.optional(),
    },
  }, handler(async (a) => {
    const snap = await snapshotOf(vault);
    const rec = findProject(snap, a.project);
    const question = createQuestion(defined({
      question: a.question.trim(), owner: a.owner, blocking: a.blocking, workstreamId: resolveWorkstream(rec, a.workstream),
    }));
    const file = await createItemFile(snap, "question", question, rec);
    const warning = await logActivity(snap, {
      projectId: rec.item.id, kind: "created", collection: "questions", itemId: question.id, title: question.question,
    });
    return { id: question.id, file: rel(snap, file), ...(warning ? { warning } : {}) };
  }));

  server.registerTool("answer_question", {
    description: "Answer a question by id and mark it answered.",
    inputSchema: { id: short, answer: long.min(1) },
  }, handler(async ({ id, answer }) => {
    const snap = await snapshotOf(vault);
    const rec = findRecord(snap, "question", id);
    const proj = projectRecordOf(snap, rec.projectId);
    const next = applyQuestionPatch(rec.item, { answer, status: "answered" });
    const result = await updateItemFile(rec, next, proj?.ctx);
    if (!result.written) return { id, unchanged: true };
    const warning = await logActivity(snap, {
      projectId: rec.projectId, kind: "status", collection: "questions", itemId: id, title: next.question,
      from: rec.item.status, to: "answered",
    });
    return { id, status: "answered", file: rel(snap, rec.path), ...(warning ? { warning } : {}) };
  }));
};
