// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createNodeParts, createSharedAssets, disposeParts, stylePart } from "./nodeObjects3d.js";

describe("node parts", () => {
  const assets = createSharedAssets([6, 12, 24]);

  it("builds just a sphere for a normal node: no glow sprite, no ring", () => {
    const parts = createNodeParts({ id: "a" }, assets);
    expect(parts.group.children).toHaveLength(1);
    expect(parts.ring).toBeNull();
    expect(parts).not.toHaveProperty("glow");
  });

  it("adds the pulse ring only for hot nodes", () => {
    const parts = createNodeParts({ id: "a", isHot: true }, assets);
    expect(parts.group.children).toHaveLength(2);
    expect(parts.ring).not.toBeNull();
  });

  it("makes dimmed spheres transparent and full ones opaque", () => {
    const parts = createNodeParts({ id: "a" }, assets);
    stylePart(parts, { radius: 2, color: 0x888888, opacity: 0.12 });
    expect(parts.mesh.material.transparent).toBe(true);
    stylePart(parts, { radius: 2, color: 0x888888, opacity: 1 });
    expect(parts.mesh.material.transparent).toBe(false);
    expect(parts.mesh.scale.x).toBe(2);
  });

  it("shares the geometry between nodes and disposes its own materials", () => {
    const a = createNodeParts({ id: "a" }, assets);
    const b = createNodeParts({ id: "b" }, assets);
    expect(a.mesh.geometry).toBe(b.mesh.geometry);
    expect(a.mesh.material).not.toBe(b.mesh.material);
    expect(() => disposeParts(a)).not.toThrow();
  });
});
