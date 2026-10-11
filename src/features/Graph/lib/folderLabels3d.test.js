// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from "vitest";
import { Group, PerspectiveCamera } from "three";
import { FOLDER_LABEL_DIMMED_OPACITY, FOLDER_LABEL_OPACITY, createFolderLabels, folderLabelOpacity } from "./folderLabels3d.js";

// jsdom has no 2D canvas; SpriteText only needs measureText and a few setters to size its texture.
beforeAll(() => {
  const ctx = { measureText: () => ({ width: 40 }), fillText() {}, translate() {}, fillRect() {}, clearRect() {}, strokeText() {}, strokeRect() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arcTo() {}, fill() {}, stroke() {} };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx);
});

const setup = () => {
  const parent = new Group();
  const labels = createFolderLabels(parent);
  const nodes = ["a", "b", "c", "d"].map((id, i) => ({ id, x: i * 10, y: 0, z: 0 }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  labels.setGroups([{ path: "x/Specs", name: "Specs", ids: nodes.map((n) => n.id) }]);
  const camera = new PerspectiveCamera(50, 1, 0.1, 5000);
  camera.position.set(0, 0, 200);
  const ctx = (extra = {}) => ({ byId, camera, dimmed: false, dt: 16, frontOf: () => 1, worldHeightFor: () => 3.2, ...extra });
  return { parent, labels, nodes, ctx };
};

describe("folderLabelOpacity", () => {
  it("rests at 45%, dims to 15%, and follows the depth weight", () => {
    expect(folderLabelOpacity(1, 0)).toBeCloseTo(FOLDER_LABEL_OPACITY);
    expect(folderLabelOpacity(1, 1)).toBeCloseTo(FOLDER_LABEL_DIMMED_OPACITY);
    expect(folderLabelOpacity(0.5, 0)).toBeCloseTo(FOLDER_LABEL_OPACITY / 2);
    expect(folderLabelOpacity(0, 0)).toBe(0);
  });
});

describe("folder labels", () => {
  it("parks one sprite at the group's centroid, behind node labels, not pickable", () => {
    const { parent, labels, ctx } = setup();
    labels.update(ctx());
    expect(parent.children).toHaveLength(1);
    const sprite = parent.children[0];
    expect(sprite.position.x).toBeCloseTo(15);
    expect(sprite.renderOrder).toBeLessThan(30);
    expect(sprite.material.depthTest).toBe(false);
    expect(sprite.material.opacity).toBeCloseTo(FOLDER_LABEL_OPACITY);
    const hits = [];
    sprite.raycast({}, hits);
    expect(hits).toEqual([]);
  });

  it("follows the nodes as they move", () => {
    const { parent, labels, nodes, ctx } = setup();
    labels.update(ctx());
    nodes.forEach((n) => { n.x += 100; });
    labels.update(ctx());
    expect(parent.children[0].position.x).toBeCloseTo(115);
  });

  it("is built lazily and hides on the far side without being created for it", () => {
    const { parent, labels, ctx } = setup();
    labels.update(ctx({ frontOf: () => 0 }));
    expect(parent.children).toHaveLength(0);
    labels.update(ctx());
    labels.update(ctx({ frontOf: () => 0 }));
    expect(parent.children[0].visible).toBe(false);
  });

  it("fades toward 15% while a node is hovered or searched", () => {
    const { parent, labels, ctx } = setup();
    labels.update(ctx({ dimmed: true, dt: 1000 }));
    expect(parent.children[0].material.opacity).toBeCloseTo(FOLDER_LABEL_DIMMED_OPACITY);
  });

  it("frees sprites when disabled, when a group goes away, and on dispose", () => {
    const { parent, labels, ctx } = setup();
    labels.update(ctx());
    labels.setEnabled(false);
    expect(parent.children).toHaveLength(0);
    labels.update(ctx());
    expect(parent.children).toHaveLength(0);
    labels.setEnabled(true);
    labels.update(ctx());
    expect(labels.count()).toBe(1);
    labels.setGroups([]);
    expect(parent.children).toHaveLength(0);
    labels.setGroups([{ path: "x/Specs", name: "Specs", ids: ["a", "b", "c", "d"] }]);
    labels.update(ctx());
    labels.dispose();
    expect(parent.children).toHaveLength(0);
    expect(labels.count()).toBe(0);
  });
});
