// Shared link materials. Links are given these through 3d-force-graph's
// `linkMaterial` accessor, so a hover can swap a pointer per link instead of
// making the library re-parse a colour string and rebuild a material for each of them.
import { LineBasicMaterial, MeshLambertMaterial } from "three";

/** One material per (colour, alpha); cylinders (thick links) are lit, lines are not. */
export const createLinkMaterials = () => {
  let cache = new Map();
  let cylinder = true;
  const build = (color, alpha) => {
    const options = { color, transparent: true, opacity: alpha, depthWrite: false };
    return cylinder ? new MeshLambertMaterial(options) : new LineBasicMaterial(options);
  };
  return {
    get(color, alpha) {
      const key = `${color}|${alpha}`;
      let material = cache.get(key);
      if (!material) {
        material = build(color, alpha);
        cache.set(key, material);
      }
      return material;
    },
    /** Switches between lit cylinders and plain lines. @returns {object[]} the materials to retire */
    reset(nextCylinder) {
      const old = [...cache.values()];
      cache = new Map();
      cylinder = nextCylinder;
      return old;
    },
    dispose() {
      cache.forEach((m) => m.dispose());
      cache = new Map();
    },
  };
};
