// @maia:opusFiles - project <-> markdown (Opus/<project>/project.md)
// Body = description. Workstreams and milestones live in the frontmatter;
// milestones point at a workstream by NAME. Assets are NOT stored here (they
// stay in the asset store keyed by project id; base64 never goes into YAML).
import {
  normalizeMilestone, normalizeProject, MILESTONE_STATUSES,
} from "../../features/Opus/lib/projectModel.js";
import { compactFields } from "./yamlFrontmatter.js";
import {
  makeCodec, asString, optString, asBool, asNumber, asRecords, isRecord, pickOption, resolveRef, refName,
} from "./fileCodec.js";

export const PROJECT_STATUSES = ["Active", "Paused", "Done"];
const WORKSTREAM_STATUSES = ["active", "paused", "done"];

const KEYS = [
  "id", "name", "status", "phase", "icon", "iconColor", "headline", "focus", "startDate", "targetDate",
  "nextMeeting", "createdAt", "objective", "workstreams", "milestones", "successCriteria", "links",
  "pinnedNoteIds",
];

const slug = (s) => asString(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24);

// Entries that are not objects are skipped with a warning rather than failing the file.
const entriesOf = (value, label, warnings, fromString) =>
  asRecords(value).flatMap((entry, index) => {
    if (isRecord(entry)) return [[entry, index]];
    if (fromString && typeof entry === "string" && entry.trim()) return [[fromString(entry.trim()), index]];
    warnings.push(`Ignored ${label} entry ${index + 1}: not a key/value block`);
    return [];
  });

const parseWorkstreams = (value, warnings) =>
  entriesOf(value, "workstream", warnings, (name) => ({ name })).flatMap(([w, index]) => {
    const name = optString(w.name);
    if (!name) {
      warnings.push(`Ignored workstream entry ${index + 1}: no name`);
      return [];
    }
    return [{
      id: optString(w.id) ?? `ws-${slug(name) || index}`,
      name,
      owner: optString(w.owner) ?? "",
      status: pickOption(w.status, WORKSTREAM_STATUSES, "active", "workstream status", warnings),
      color: optString(w.color) ?? String((index % 4) + 1),
      order: asNumber(w.order) ?? index,
    }];
  });

const parseMilestones = (value, workstreams, warnings) =>
  entriesOf(value, "milestone", warnings, (title) => ({ title })).flatMap(([m, index]) => {
    const title = optString(m.title);
    if (!title) {
      warnings.push(`Ignored milestone entry ${index + 1}: no title`);
      return [];
    }
    return [normalizeMilestone({
      id: optString(m.id) ?? undefined,
      title,
      date: optString(m.date),
      start: optString(m.start),
      status: pickOption(m.status, MILESTONE_STATUSES, "planned", "milestone status", warnings),
      workstreamId: resolveRef(m.workstream, workstreams, "name", `Workstream (milestone "${title}")`, warnings),
    }, index)];
  });

const parseCriteria = (value, warnings) =>
  entriesOf(value, "success criterion", warnings, (text) => ({ text })).flatMap(([c, index]) => {
    const text = optString(c.text);
    return text ? [{ id: optString(c.id) ?? `sc-${index}`, text, done: asBool(c.done) }] : [];
  });

const parseLinks = (value, warnings) =>
  entriesOf(value, "link", warnings, (url) => ({ url })).flatMap(([l, index]) => {
    const url = optString(l.url);
    if (!url) return [];
    return [{ id: optString(l.id) ?? `ln-${index}`, title: optString(l.title) ?? url, url, type: optString(l.type) ?? "link" }];
  });

const parse = (data, body, { fallbackId, fallbackTitle, warnings }) => {
  const workstreams = parseWorkstreams(data.workstreams, warnings);
  return normalizeProject({
    id: optString(data.id) ?? fallbackId,
    name: optString(data.name) ?? fallbackTitle ?? "Untitled",
    status: pickOption(data.status, PROJECT_STATUSES, "Active", "project status", warnings),
    phase: optString(data.phase),
    icon: optString(data.icon) ?? undefined,
    iconColor: optString(data.iconColor) ?? undefined,
    headline: optString(data.headline) ?? "",
    focus: optString(data.focus) ?? "",
    startDate: optString(data.startDate),
    targetDate: optString(data.targetDate),
    nextMeeting: optString(data.nextMeeting),
    createdAt: optString(data.createdAt),
    objective: optString(data.objective) ?? "",
    description: body,
    workstreams,
    milestones: parseMilestones(data.milestones, workstreams, warnings),
    successCriteria: parseCriteria(data.successCriteria, warnings),
    links: parseLinks(data.links, warnings),
    pinnedNoteIds: asRecords(data.pinnedNoteIds).map(optString).filter(Boolean),
  });
};

const workstreamEntries = (list) =>
  asRecords(list).map((w) => compactFields({
    id: w.id, name: asString(w.name), owner: optString(w.owner), status: optString(w.status),
    color: optString(w.color), order: asNumber(w.order),
  }));

const milestoneEntries = (list, workstreams) =>
  asRecords(list).map((m) => compactFields({
    id: m.id, title: asString(m.title), date: optString(m.date ?? m.due), start: optString(m.start),
    status: optString(m.status), workstream: refName(m.workstreamId, workstreams, "name"),
  }));

const toFields = (p) => ({
  id: p.id,
  name: asString(p.name),
  status: PROJECT_STATUSES.includes(p.status) ? p.status : "Active",
  phase: optString(p.phase),
  icon: optString(p.icon),
  iconColor: optString(p.iconColor),
  headline: optString(p.headline),
  focus: optString(p.focus),
  startDate: optString(p.startDate),
  targetDate: optString(p.targetDate),
  nextMeeting: optString(p.nextMeeting),
  createdAt: optString(p.createdAt),
  objective: optString(p.objective),
  workstreams: workstreamEntries(p.workstreams),
  milestones: milestoneEntries(p.milestones, asRecords(p.workstreams)),
  successCriteria: asRecords(p.successCriteria).map((c) => ({ id: c.id, text: asString(c.text), done: c.done === true })),
  links: asRecords(p.links).map((l) => compactFields({ id: l.id, title: optString(l.title), url: asString(l.url), type: optString(l.type) })),
  pinnedNoteIds: asRecords(p.pinnedNoteIds).filter((id) => typeof id === "string" && id !== ""),
});

export const { fromFile, toFile } = makeCodec({
  knownKeys: KEYS,
  parse,
  toFields,
  bodyOf: (p) => p.description,
});

/** The slice of a project that task, decision and question files resolve names against. */
export const contextOf = (project) => ({
  workstreams: asRecords(project?.workstreams).map((w) => ({ id: w.id, name: w.name })),
  milestones: asRecords(project?.milestones).map((m) => ({ id: m.id, title: m.title })),
});
