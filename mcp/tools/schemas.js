// Shared zod fragments for write tools.
import { z } from "zod";

// Every tool argument is bounded: the client is an LLM and a runaway call must not fill the disk
// or stall the server. Limits sit far above anything a person types.
export const short = z.string().max(300);
export const medium = z.string().max(5_000);
export const long = z.string().max(1_000_000);
export const list = (item) => z.array(item).max(100);

export const isoDate = z.string().max(40).regex(/^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/, "Use ISO format: YYYY-MM-DD");
export const taskStatus = z.enum(["todo", "doing", "blocked", "done"]);
export const priority = z.enum(["p1", "p2", "p3"]);
export const estimate = z.enum(["S", "M", "L"]);
export const projectStatus = z.enum(["Active", "Paused", "Done"]);
export const milestoneStatus = z.enum(["planned", "active", "at-risk", "done"]);
export const workstreamStatus = z.enum(["active", "paused", "done"]);

export const workstreamInput = z.object({
  name: short.min(1),
  owner: short.optional(),
  status: workstreamStatus.optional(),
  color: z.enum(["1", "2", "3", "4"]).optional(),
});

export const milestoneInput = z.object({
  title: short.min(1),
  date: isoDate.optional(),
  start: isoDate.optional(),
  status: milestoneStatus.optional(),
  workstream: short.optional().describe("Workstream name"),
});

// Stored links reach an <a href> and the OS opener. The app re-checks on render (isSafeHref); this
// keeps javascript:, data: and file: out of the files in the first place. Bare domains and
// host:port stay allowed, the app adds https:// itself.
const SCHEME = /^[a-z][a-z0-9+.-]*:(?!\d)/i;
const urlInput = z.string().min(1).max(2_000).refine((url) => {
  const text = url.trim();
  return !SCHEME.test(text) || /^(https?|mailto):/i.test(text);
}, "Only http, https and mailto links are allowed");

export const linkInput = z.object({
  title: short.optional(),
  url: urlInput,
  type: short.optional(),
});

/** Drops undefined values so spreading a patch never overwrites with undefined. */
export const defined = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
