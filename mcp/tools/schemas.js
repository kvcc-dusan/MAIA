// Shared zod fragments for write tools.
import { z } from "zod";

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/, "Use ISO format: YYYY-MM-DD");
export const taskStatus = z.enum(["todo", "doing", "blocked", "done"]);
export const priority = z.enum(["p1", "p2", "p3"]);
export const estimate = z.enum(["S", "M", "L"]);
export const projectStatus = z.enum(["Active", "Paused", "Done"]);
export const milestoneStatus = z.enum(["planned", "active", "at-risk", "done"]);
export const workstreamStatus = z.enum(["active", "paused", "done"]);

export const workstreamInput = z.object({
  name: z.string().min(1),
  owner: z.string().optional(),
  status: workstreamStatus.optional(),
  color: z.enum(["1", "2", "3", "4"]).optional(),
});

export const milestoneInput = z.object({
  title: z.string().min(1),
  date: isoDate.optional(),
  start: isoDate.optional(),
  status: milestoneStatus.optional(),
  workstream: z.string().optional().describe("Workstream name"),
});

export const linkInput = z.object({
  title: z.string().optional(),
  url: z.string().min(1),
  type: z.string().optional(),
});

/** Drops undefined values so spreading a patch never overwrites with undefined. */
export const defined = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
