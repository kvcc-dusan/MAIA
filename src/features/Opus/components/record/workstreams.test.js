import { describe, it, expect } from "vitest";
import { workstreamColorVar, indexWorkstreams, findWorkstream, workstreamOptions } from "./workstreams.js";

const ws = [
  { id: "w2", name: "Design", color: "2", order: 1 },
  { id: "w1", name: "Build", color: "1", order: 0 },
  { id: "w3", name: "", color: "9", order: 2 },
];

describe("workstreams", () => {
  it("maps colors 1 to 4 to series tokens", () => {
    expect(workstreamColorVar("3")).toBe("var(--series-3)");
    expect(workstreamColorVar(4)).toBe("var(--series-4)");
    expect(workstreamColorVar("9")).toBeNull();
    expect(workstreamColorVar(undefined)).toBeNull();
  });

  it("finds a workstream and treats a dangling or empty id as none", () => {
    const byId = indexWorkstreams(ws);
    expect(findWorkstream(byId, "w1").name).toBe("Build");
    expect(findWorkstream(byId, "gone")).toBeNull();
    expect(findWorkstream(byId, null)).toBeNull();
  });

  it("builds select options in workstream order with a fallback name", () => {
    const options = workstreamOptions(ws);
    expect(options.map((o) => o.value)).toEqual(["w1", "w2", "w3"]);
    expect(options[0].color).toBe("var(--series-1)");
    expect(options[2].label).toBe("Untitled workstream");
    expect(options[2].color).toBeUndefined();
  });

  it("tolerates a missing list", () => {
    expect(workstreamOptions(undefined)).toEqual([]);
    expect(indexWorkstreams(null).size).toBe(0);
  });
});
