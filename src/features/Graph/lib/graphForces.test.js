import { describe, expect, it } from "vitest";
import { createFolderForce } from "./graphForces.js";

const node = (id, folder, x, y = 0, z = 0) => ({ id, folder, x, y, z, vx: 0, vy: 0, vz: 0 });
const run = (nodes, k, alpha = 1) => {
  const force = createFolderForce(k);
  force.initialize(nodes);
  force(alpha);
  return nodes;
};

describe("folder force", () => {
  it("pulls a 3-note group toward its centroid", () => {
    const [a, b, c] = run([node("a", "f", 0), node("b", "f", 3), node("c", "f", 6)], 0.1);
    // centroid x = 3
    expect(a.vx).toBeCloseTo(0.3);
    expect(b.vx).toBeCloseTo(0);
    expect(c.vx).toBeCloseTo(-0.3);
  });

  it("pulls on y and z as well", () => {
    const [a] = run([node("a", "f", 0, 0, 0), node("b", "f", 0, 4, 8)], 0.5);
    expect(a.vy).toBeCloseTo(1);
    expect(a.vz).toBeCloseTo(2);
  });

  it("halves the pull for each ancestor folder", () => {
    // a/b/c: {0, 0}; a/b: {0, 0, 10}; a: {0, 0, 10, 40}
    const [n] = run([node("n", "a/b/c", 0), node("m", "a/b/c", 0), node("p", "a/b", 10), node("q", "a", 40)], 1, 1);
    // own folder: centroid 0 -> 0. a/b (k/2): centroid 10/3 -> 5/3. a (k/4): centroid 12.5 -> 3.125
    expect(n.vx).toBeCloseTo(0 + 10 / 3 / 2 + 12.5 / 4);
  });

  it("leaves root notes and single-note groups alone", () => {
    const nodes = run([node("r1", "", 0), node("r2", "", 50), node("solo", "lonely", 100), node("a", "f", 0), node("b", "f", 10)], 1);
    expect(nodes.slice(0, 3).map((n) => n.vx)).toEqual([0, 0, 0]);
    expect(nodes[3].vx).not.toBe(0);
  });

  it("scales with alpha and strength", () => {
    const at = (alpha, k) => run([node("a", "f", 0), node("b", "f", 10)], k, alpha)[0].vx;
    expect(at(0.5, 0.2)).toBeCloseTo(at(1, 0.2) / 2);
    expect(at(1, 0.4)).toBeCloseTo(at(1, 0.2) * 2);
    expect(at(0, 0.2)).toBe(0);
  });

  it("is neutral at strength 0 and reads back its strength", () => {
    const force = createFolderForce(0);
    const nodes = [node("a", "f", 0), node("b", "f", 10)];
    force.initialize(nodes);
    force(1);
    expect(nodes[0].vx).toBe(0);
    expect(force.strength(0.3)).toBe(force);
    expect(force.strength()).toBe(0.3);
  });

  it("follows the current positions on every tick", () => {
    const nodes = [node("a", "f", 0), node("b", "f", 10)];
    const force = createFolderForce(1);
    force.initialize(nodes);
    force(1);
    nodes[1].x = 20;
    nodes.forEach((n) => { n.vx = 0; });
    force(1);
    expect(nodes[0].vx).toBeCloseTo(10);
  });
});
