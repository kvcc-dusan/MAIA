// Floating folder names for the 3D graph: one non-interactive sprite per big folder group, parked at the
// group's live centroid. Sprites are built lazily (a canvas texture each) and everything is released in dispose().
import SpriteText from "three-spritetext";
import { stepToward } from "./labelLayout.js";

export const FOLDER_LABEL_OPACITY = 0.45;
export const FOLDER_LABEL_DIMMED_OPACITY = 0.15; // while a node is hovered or searched
export const FOLDER_LABEL_SIZE = 1.25; // relative to node labels
const FOLDER_LABEL_RENDER_ORDER = 20; // node labels are 30, so they draw on top
const FOLDER_LABEL_TEXT_HEIGHT = 3.2;
const NEW_PER_FRAME = 4; // building a SpriteText canvas is the expensive part
const DIM_FADE_MS = 160;
const MIN_VISIBLE_OPACITY = 0.01;
const noRaycast = () => {};

/** Final label opacity: the depth weight (0..1) scales the resting opacity, `dim` (0..1) blends toward the dimmed one. */
export const folderLabelOpacity = (front, dim) =>
  front * (FOLDER_LABEL_OPACITY + (FOLDER_LABEL_DIMMED_OPACITY - FOLDER_LABEL_OPACITY) * dim);

/**
 * @param {{ add: (o: object) => void, remove: (o: object) => void }} parent the three.js scene
 */
export const createFolderLabels = (parent) => {
  let groups = []; // { path, name, ids }
  let enabled = true;
  let dim = 0;
  let color = "white";
  let fontFace = "sans-serif";
  const sprites = new Map(); // path -> { sprite, base: {x, y} }
  const centroid = { x: 0, y: 0, z: 0 };

  const release = (entry) => {
    parent.remove(entry.sprite);
    entry.sprite.material.map?.dispose();
    entry.sprite.material.dispose();
  };

  const releaseAll = () => {
    sprites.forEach(release);
    sprites.clear();
  };

  const build = (group) => {
    const sprite = new SpriteText(group.name, FOLDER_LABEL_TEXT_HEIGHT, color);
    sprite.fontFace = fontFace;
    sprite.fontWeight = "500";
    sprite.material.depthTest = false;
    sprite.material.depthWrite = false;
    sprite.material.opacity = 0;
    sprite.renderOrder = FOLDER_LABEL_RENDER_ORDER;
    sprite.raycast = noRaycast;
    sprite.visible = false;
    parent.add(sprite);
    const entry = { sprite, base: { x: sprite.scale.x, y: sprite.scale.y } };
    sprites.set(group.path, entry);
    return entry;
  };

  const computeCentroid = (ids, byId) => {
    let n = 0;
    centroid.x = 0;
    centroid.y = 0;
    centroid.z = 0;
    for (let i = 0; i < ids.length; i += 1) {
      const node = byId.get(ids[i]);
      if (!node || node.x === undefined) continue;
      centroid.x += node.x;
      centroid.y += node.y;
      centroid.z += node.z || 0;
      n += 1;
    }
    if (n === 0) return false;
    centroid.x /= n;
    centroid.y /= n;
    centroid.z /= n;
    return true;
  };

  return {
    /** Replaces the groups (see labelGroups); sprites of groups that went away are freed. */
    setGroups(next) {
      groups = next;
      const keep = new Set(next.map((g) => g.path));
      sprites.forEach((entry, path) => {
        if (keep.has(path)) return;
        release(entry);
        sprites.delete(path);
      });
    },

    setEnabled(value) {
      enabled = value;
      if (!value) releaseAll();
    },

    setLook(nextColor, nextFontFace) {
      const colorChanged = nextColor !== color;
      const fontChanged = nextFontFace !== fontFace;
      color = nextColor;
      fontFace = nextFontFace;
      if (!colorChanged && !fontChanged) return;
      sprites.forEach((entry) => {
        const { sprite } = entry;
        const scale = sprite.scale.x / entry.base.x;
        // Each setter regenerates the canvas and resets the scale, so the base size is re-read afterwards.
        if (colorChanged) sprite.color = color;
        if (fontChanged) sprite.fontFace = fontFace;
        entry.base = { x: sprite.scale.x, y: sprite.scale.y };
        sprite.scale.set(entry.base.x * scale, entry.base.y * scale, 0);
      });
    },

    /**
     * Once per frame.
     * @param {{ byId: Map<string, object>, camera: object, dimmed: boolean, dt: number,
     *   frontOf: (dist: number) => number, worldHeightFor: (dist: number) => number }} ctx
     */
    update({ byId, camera, dimmed, dt, frontOf, worldHeightFor }) {
      if (!enabled) return;
      dim = stepToward(dim, dimmed ? 1 : 0, dt / DIM_FADE_MS);
      let created = 0;
      for (let i = 0; i < groups.length; i += 1) {
        const group = groups[i];
        let entry = sprites.get(group.path);
        if (!computeCentroid(group.ids, byId)) {
          if (entry) entry.sprite.visible = false;
          continue;
        }
        const dist = Math.max(1e-3, Math.hypot(camera.position.x - centroid.x, camera.position.y - centroid.y, camera.position.z - centroid.z));
        const opacity = folderLabelOpacity(frontOf(dist), dim);
        if (opacity < MIN_VISIBLE_OPACITY) {
          if (entry) entry.sprite.visible = false;
          continue;
        }
        if (!entry) {
          if (created >= NEW_PER_FRAME) continue;
          entry = build(group);
          created += 1;
        }
        const scale = worldHeightFor(dist) / FOLDER_LABEL_TEXT_HEIGHT;
        const { sprite, base } = entry;
        sprite.position.set(centroid.x, centroid.y, centroid.z);
        sprite.scale.set(base.x * scale, base.y * scale, 0);
        sprite.material.opacity = opacity;
        sprite.visible = true;
      }
    },

    /** How many sprites exist right now (dev stats and tests). */
    count: () => sprites.size,

    dispose() {
      releaseAll();
      groups = [];
    },
  };
};
