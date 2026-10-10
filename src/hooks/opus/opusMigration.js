// One-time move of projects and tasks from localStorage into <vault>/Opus/.
// Never overwrites, never deletes, never touches the localStorage copy (it is
// the backup). The flag is set only after a reload from disk shows every item.
import { toast } from "sonner";
import { uid } from "../../lib/ids.js";
import { STORAGE_KEYS } from "../../lib/constants.js";
import { normalizeProjects } from "../../features/Opus/lib/projectModel.js";
import { normalizeTasks } from "../../features/Opus/lib/taskModel.js";
import { seedAssets } from "./opusAssets.js";

export const OPUS_MIGRATED_KEY = "maia.opusMigrated";
// Set after a failed attempt so the next launch finishes the job (adds only what is missing).
export const OPUS_PARTIAL_KEY = "maia.opusMigrationPartial";

const asList = (v) => (Array.isArray(v) ? v : []);
const isRecord = (v) => v != null && typeof v === "object" && !Array.isArray(v);
const readList = (key) => {
  try {
    return asList(JSON.parse(localStorage.getItem(key) ?? "[]")).filter(isRecord);
  } catch {
    return [];
  }
};
const withId = (item) => (item.id != null && item.id !== "" ? item : { ...item, id: uid() });
const uniqueById = (list) => {
  const seen = new Set();
  return list.map(withId).filter((i) => !seen.has(i.id) && seen.add(i.id));
};

const flagOf = (key) => {
  try {
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
};

/** What to migrate, or null. `loaded` is the first loadOpus result. */
export const planMigration = (loaded) => {
  if (flagOf(OPUS_MIGRATED_KEY)) return null;
  const projects = uniqueById(normalizeProjects(readList(STORAGE_KEYS.PROJECTS))).map((p) => ({
    ...p,
    decisions: uniqueById(asList(p.decisions).filter(isRecord)),
    questions: uniqueById(asList(p.questions).filter(isRecord)),
  }));
  const tasks = uniqueById(normalizeTasks(readList(STORAGE_KEYS.TASKS)));
  if (projects.length === 0 && tasks.length === 0) return null;
  if (!loaded.exists) return { mode: "full", projects, tasks };
  if (flagOf(OPUS_PARTIAL_KEY)) return { mode: "resume", projects, tasks };
  console.info("[MAIA] Opus folder already exists in the vault, so the vault wins. Projects and tasks in browser storage were not migrated.");
  return null;
};

const idsOf = (loaded) => ({
  project: new Set(loaded.projects.map((p) => p.id)),
  task: new Set(loaded.tasks.map((t) => t.id)),
  decision: new Set(loaded.projects.flatMap((p) => asList(p.decisions).map((d) => d.id))),
  question: new Set(loaded.projects.flatMap((p) => asList(p.questions).map((q) => q.id))),
});

const messageOf = (e) => (e instanceof Error ? e.message : String(e));

/** Writes whatever is not on disk yet. Returns the failure messages (empty = all written). */
export const writePlan = async (api, vaultPath, plan, loaded) => {
  const have = idsOf(loaded);
  const failures = [];
  const attempt = async (label, fn) => {
    try {
      await fn();
      return true;
    } catch (e) {
      failures.push(`${label}: ${messageOf(e)}`);
      return false;
    }
  };

  const placed = new Set(have.project); // projects whose folder exists, so children can go in
  for (const project of plan.projects) {
    if (!have.project.has(project.id) && (await attempt(`Project "${project.name}"`, () => api.saveProject(vaultPath, project)))) {
      placed.add(project.id);
    }
    if (!placed.has(project.id)) continue;
    for (const d of project.decisions.filter((x) => !have.decision.has(x.id))) {
      await attempt(`Decision "${d.title}"`, () => api.saveDecision(vaultPath, project.id, d));
    }
    for (const q of project.questions.filter((x) => !have.question.has(x.id))) {
      await attempt(`Question "${q.question}"`, () => api.saveQuestion(vaultPath, project.id, q));
    }
  }
  for (const task of plan.tasks.filter((t) => !have.task.has(t.id))) {
    const projectId = placed.has(task.projectId) ? task.projectId : null;
    await attempt(`Task "${task.title}"`, () => api.saveTask(vaultPath, { ...task, projectId }));
  }
  return failures;
};

/** Source items that did not come back from disk. */
export const findMissing = (plan, reloaded) => {
  const have = idsOf(reloaded);
  return [
    ...plan.projects.filter((p) => !have.project.has(p.id)).map((p) => `Project "${p.name}"`),
    ...plan.projects.flatMap((p) => p.decisions.filter((d) => !have.decision.has(d.id)).map((d) => `Decision "${d.title}"`)),
    ...plan.projects.flatMap((p) => p.questions.filter((q) => !have.question.has(q.id)).map((q) => `Question "${q.question}"`)),
    ...plan.tasks.filter((t) => !have.task.has(t.id)).map((t) => `Task "${t.title}"`),
  ];
};

/**
 * @returns {Promise<{ loaded: object, status: "skipped" | "done" | "failed" }>}
 * `loaded` is what is on disk afterwards, so the caller shows the truth.
 */
export const runMigration = async (api, vaultPath, loaded) => {
  const plan = planMigration(loaded);
  if (!plan) return { loaded, status: "skipped" };
  try {
    try {
      seedAssets(plan.projects);
    } catch (e) {
      console.error("[MAIA] Could not carry project assets over", e);
    }
    const failures = await writePlan(api, vaultPath, plan, loaded);
    const reloaded = await api.loadOpus(vaultPath);
    const missing = findMissing(plan, reloaded);
    if (failures.length > 0 || missing.length > 0) {
      throw new Error([...failures, ...missing.map((m) => `${m} was not found after writing`)].slice(0, 3).join("; "));
    }
    localStorage.setItem(OPUS_MIGRATED_KEY, "true");
    localStorage.removeItem(OPUS_PARTIAL_KEY);
    toast.success(`Moved ${plan.projects.length} projects and ${plan.tasks.length} tasks into the vault's Opus folder.`);
    return { loaded: reloaded, status: "done" };
  } catch (e) {
    console.error("[MAIA] Opus migration failed", e);
    try {
      localStorage.setItem(OPUS_PARTIAL_KEY, "true");
    } catch { /* storage blocked: next launch starts from scratch, which is still safe */ }
    toast.error(`Moving your projects and tasks into the vault failed (${messageOf(e)}). Your data is still safe in this app and MAIA will finish the move next time it opens.`);
    let onDisk = loaded;
    try {
      onDisk = await api.loadOpus(vaultPath);
    } catch { /* keep the earlier read */ }
    return { loaded: onDisk, status: "failed" };
  }
};
