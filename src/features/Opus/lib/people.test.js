import { describe, it, expect } from "vitest";
import { projectPeople, showOwners, initials, priorityLabel } from "./people.js";

const project = {
  id: "p1",
  workstreams: [{ owner: "Marko Novak" }, { owner: "" }],
  questions: [{ owner: "Sara Vidmar" }],
  decisions: [{ by: "Lea Horvat" }],
};

describe("projectPeople", () => {
  it("collects sorted unique names from every source", () => {
    const tasks = [
      { projectId: "p1", owner: "Lea Horvat" },
      { projectId: "p1", owner: " Ana Kovac " },
      { projectId: "p2", owner: "Outsider" },
      { projectId: "p1", owner: null },
    ];
    expect(projectPeople(project, tasks)).toEqual(["Ana Kovac", "Lea Horvat", "Marko Novak", "Sara Vidmar"]);
  });
  it("survives a missing project or empty collections", () => {
    expect(projectPeople(null, [])).toEqual([]);
    expect(projectPeople({ id: "x" }, [])).toEqual([]);
  });
});

describe("showOwners", () => {
  it("needs more than one distinct person", () => {
    expect(showOwners({ id: "x", workstreams: [{ owner: "A" }] }, [{ projectId: "x", owner: "A" }])).toBe(false);
    expect(showOwners(project, [])).toBe(true);
    expect(showOwners({ id: "x" }, [])).toBe(false);
  });
});

describe("initials", () => {
  it("handles one, two, many and no words", () => {
    expect(initials("Lea Horvat")).toBe("LH");
    expect(initials("Ana")).toBe("AN");
    expect(initials("Mary Jane Watson")).toBe("MW");
    expect(initials("  ")).toBe("");
    expect(initials(null)).toBe("");
  });
});

describe("priorityLabel", () => {
  it("only High and Medium get a badge", () => {
    expect(priorityLabel({ priority: "p1" })).toBe("High");
    expect(priorityLabel({ priority: "p2" })).toBe("Medium");
    expect(priorityLabel({ priority: "p3" })).toBeNull();
    expect(priorityLabel({})).toBeNull();
    expect(priorityLabel(undefined)).toBeNull();
  });
});
