import { describe, expect, it } from "vitest";
import { HISTORY_PAGE_SIZE, savedReports } from "./reportHistory";

const PROJECT = "p1";
const note = (overrides) => ({
  id: "n",
  title: "Weekly report",
  content: "",
  tags: [],
  projectIds: [PROJECT],
  createdAt: "2026-10-05T09:00:00.000Z",
  ...overrides,
});

describe("savedReports", () => {
  it("matches notes tagged report", () => {
    const notes = [note({ id: "a", tags: ["report"] })];
    expect(savedReports(notes, PROJECT).map((n) => n.id)).toEqual(["a"]);
  });

  it("matches notes whose content contains #report", () => {
    const notes = [note({ id: "a", content: "Body\n\n#report\n" })];
    expect(savedReports(notes, PROJECT).map((n) => n.id)).toEqual(["a"]);
  });

  it("does not match #reports or #report-old as a report tag", () => {
    const notes = [note({ id: "a", content: "#reports and #report-old" })];
    expect(savedReports(notes, PROJECT)).toEqual([]);
  });

  it("excludes notes linked to another project", () => {
    const notes = [note({ id: "a", tags: ["report"], projectIds: ["other"] })];
    expect(savedReports(notes, PROJECT)).toEqual([]);
  });

  it("excludes notes that are not reports", () => {
    const notes = [note({ id: "a", tags: ["journal"], content: "plain text" })];
    expect(savedReports(notes, PROJECT)).toEqual([]);
  });

  it("sorts newest first", () => {
    const notes = [
      note({ id: "old", tags: ["report"], createdAt: "2026-09-28T09:00:00.000Z" }),
      note({ id: "new", tags: ["report"], createdAt: "2026-10-05T09:00:00.000Z" }),
      note({ id: "mid", tags: ["report"], createdAt: "2026-10-01T09:00:00.000Z" }),
    ];
    expect(savedReports(notes, PROJECT).map((n) => n.id)).toEqual(["new", "mid", "old"]);
  });

  it("puts notes without createdAt last", () => {
    const notes = [
      note({ id: "none", tags: ["report"], createdAt: undefined }),
      note({ id: "dated", tags: ["report"], createdAt: "2026-10-05T09:00:00.000Z" }),
    ];
    expect(savedReports(notes, PROJECT).map((n) => n.id)).toEqual(["dated", "none"]);
  });

  it("tolerates notes without projectIds or tags", () => {
    const notes = [{ id: "a", content: "#report" }, note({ id: "b", tags: ["report"] })];
    expect(savedReports(notes, PROJECT).map((n) => n.id)).toEqual(["b"]);
  });

  it("exposes a page size of 8", () => {
    expect(HISTORY_PAGE_SIZE).toBe(8);
  });
});
