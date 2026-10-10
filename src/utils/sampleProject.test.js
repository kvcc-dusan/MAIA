import { describe, it, expect } from "vitest";
import { generateSampleProject } from "./dummyData.js";

describe("generateSampleProject", () => {
  it("returns one populated project whose tasks and activity point at it", () => {
    const { project, tasks, activity } = generateSampleProject();
    expect(project.name).toBe("Sample project");
    expect(project.workstreams.length).toBeGreaterThan(0);
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.every((t) => t.projectId === project.id)).toBe(true);
    expect(activity.every((a) => a.projectId === project.id)).toBe(true);
  });

  it("makes fresh ids on every call so it can be added twice", () => {
    expect(generateSampleProject().project.id).not.toBe(generateSampleProject().project.id);
  });
});
