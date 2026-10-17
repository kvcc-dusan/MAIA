// Keeps a recomputed graph's identity when its structure did not change. GraphPage rebuilds
// nodes and links on every notes change (an Obsidian edit, a watcher reload), and a new array
// restarted the force simulation from scratch, throwing every node back into a fresh layout.

// Fields D3 writes onto node objects; carried over so a changed node stays where it was.
const SIM_KEYS = ["x", "y", "vx", "vy", "fx", "fy"];

const nodeSignature = (n) =>
  JSON.stringify([n.title, n.type, n.group ?? null, !!n.isHot, n.folder ?? "", n.val, n.realId ?? null, n.tags ?? [], n.projectIds ?? []]);

// forceLink swaps link ends for node objects, so compare by id either way.
const endId = (end) => (end && typeof end === "object" ? end.id : end);
const linkSignature = (links) => links.map((l) => `${endId(l.source)}\u0000${endId(l.target)}`).join("\u0001");

/**
 * `prev` and `next` are { nodes, links }. Returns `prev` itself when nothing structural changed.
 * Otherwise unchanged nodes are the previous objects (positions and all), changed ones are new
 * objects that keep the previous position, and new ones come in as built.
 */
export const keepGraphIdentity = (prev, next) => {
  if (!prev) return next;
  const prevById = new Map(prev.nodes.map((n) => [n.id, n]));
  let same = prev.nodes.length === next.nodes.length;

  const nodes = next.nodes.map((node, i) => {
    const old = prevById.get(node.id);
    if (!old) {
      same = false;
      return node;
    }
    if (nodeSignature(old) === nodeSignature(node)) {
      if (prev.nodes[i] !== old) same = false; // same nodes, new order
      return old;
    }
    same = false;
    const carried = { ...node };
    SIM_KEYS.forEach((key) => {
      if (old[key] !== undefined) carried[key] = old[key];
    });
    return carried;
  });

  if (same && linkSignature(prev.links) === linkSignature(next.links)) return prev;
  return { nodes, links: next.links };
};
