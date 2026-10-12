import { describe, expect, it } from "vitest";
import {
  GROUP_PULL_DEFAULT, GROUP_PULL_MAX, GROUP_PULL_MIN, HOME_STRENGTH, chargeFor, createFolderForce, createHomeForce, folderStrengthFor, linkDistanceFor, linkDistanceFor3d,
} from "./graphForces.js";

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

describe("group pull mapping", () => {
  it("is zero at 0, 0.6 at 100 and about 0.12 at the default", () => {
    expect(folderStrengthFor(GROUP_PULL_MIN)).toBe(0);
    expect(folderStrengthFor(GROUP_PULL_MAX)).toBeCloseTo(0.6);
    expect(folderStrengthFor(GROUP_PULL_DEFAULT)).toBeCloseTo(0.12);
  });

  it("is monotonic and clamps out-of-range or bad input", () => {
    const values = [0, 10, 20, 50, 80, 100].map(folderStrengthFor);
    expect([...values].sort((a, b) => a - b)).toEqual(values);
    expect(folderStrengthFor(-5)).toBe(0);
    expect(folderStrengthFor(500)).toBeCloseTo(0.6);
    expect(folderStrengthFor(Number.NaN)).toBeCloseTo(0.12);
  });

  it("drives the force: strength 0 does nothing, higher pulls harder", () => {
    const pullAt = (pull) => run([node("a", "f", 0), node("b", "f", 10)], folderStrengthFor(pull))[0].vx;
    expect(pullAt(0)).toBe(0);
    expect(pullAt(100)).toBeGreaterThan(pullAt(20));
  });
});

describe("entanglement mappings", () => {
  const sliderValues = [10, 50, 100, 150, 250, 400, 500];

  it("leaves the 2D mapping as it was", () => {
    expect(linkDistanceFor(10)).toBeCloseTo(49);
    expect(linkDistanceFor(100)).toBeCloseTo(40);
    expect(linkDistanceFor(500)).toBe(8);
  });

  it("3D keeps the default at 40 and shrinks monotonically as the value rises", () => {
    expect(linkDistanceFor3d(100)).toBeCloseTo(40);
    const d = sliderValues.map(linkDistanceFor3d);
    for (let i = 1; i < d.length; i += 1) expect(d[i]).toBeLessThan(d[i - 1]);
  });

  it("3D spans far more than 2D and clamps outside the slider", () => {
    const span3d = linkDistanceFor3d(10) / linkDistanceFor3d(500);
    const span2d = linkDistanceFor(10) / linkDistanceFor(500);
    expect(span3d).toBeGreaterThan(100);
    expect(span3d).toBeGreaterThan(span2d * 10);
    expect(linkDistanceFor3d(-50)).toBe(linkDistanceFor3d(10));
    expect(linkDistanceFor3d(9000)).toBe(linkDistanceFor3d(500));
  });

  it("Entropy charge already scales 80x across its slider", () => {
    expect(chargeFor(800) / chargeFor(10)).toBe(80);
  });
});

describe("home force", () => {
  const setup = (...nodes) => {
    const force = createHomeForce(0.1);
    force.initialize(nodes);
    force.remember();
    return force;
  };

  it("does nothing until it is activated", () => {
    const a = node("a", "", 0);
    const force = setup(a);
    a.x = 10;
    force();
    expect(a.vx).toBe(0);
  });

  it("pulls a node that was moved back toward where it settled", () => {
    const a = node("a", "", 0, 0, 0);
    const force = setup(a);
    a.x = 10; a.y = -20; a.z = 30;
    force.activate(true);
    force();
    expect(a.vx).toBeCloseTo(-1);
    expect(a.vy).toBeCloseTo(2);
    expect(a.vz).toBeCloseTo(-3);
  });

  it("reports when every node is back home", () => {
    const a = node("a", "", 0);
    const force = setup(a);
    a.x = 10;
    expect(force.isSettled()).toBe(false);
    a.x = 0.1;
    expect(force.isSettled()).toBe(true);
  });

  it("leaves nodes it never saw alone", () => {
    const force = setup(node("a", "", 0));
    const late = node("late", "", 50);
    force.initialize([late]);
    force.activate(true);
    force();
    expect(late.vx).toBe(0);
  });

  it("has a default strength", () => {
    expect(HOME_STRENGTH).toBeGreaterThan(0);
  });
});
