// Data side of the notes mini-graph: a star with the project in the middle and
// one node per linked note. Pure, no D3, so layout inputs are testable.

export const GRAPH_FALLBACK_SIZE = { w: 300, h: 280 };
export const PROJECT_RADIUS = 9;
export const NOTE_RADIUS = 5;
// Invisible ring around each note node so a finger or a trackpad click lands.
export const NOTE_HIT_RADIUS = 16;
export const LABEL_LIMIT = 22;
const RING_RATIO = 0.26;

export const projectNodeId = (projectId) => `proj-${projectId}`;

export const truncate = (text, max) => (text.length > max ? `${text.slice(0, max)}…` : text);

/**
 * Changes only when a node appears, goes or is renamed. The graph rebuilds on
 * this key instead of on array identity, so an unrelated re-render (opening the
 * picker, a note body edit) doesn't reset the layout.
 */
export const graphSignature = (project, notes) =>
  [project.id, project.name, ...notes.map((n) => `${n.id}:${n.title || ""}`)].join("\u0001");

/**
 * Builds fresh node and link objects (D3 mutates both). `positions` is a
 * Map(id -> {x, y}) from an earlier build, so notes that survive a rebuild keep
 * their place; new notes are spread around a ring so they never start stacked.
 */
export const buildGraph = ({ project, notes, size, positions = new Map() }) => {
  const { w, h } = size;
  const ring = Math.min(w, h) * RING_RATIO;
  const centerId = projectNodeId(project.id);

  const center = { id: centerId, title: project.name, type: "project", ...(positions.get(centerId) ?? { x: w / 2, y: h / 2 }) };
  const noteNodes = notes.map((note, index) => {
    const angle = (index / notes.length) * 2 * Math.PI - Math.PI / 2;
    const fallback = { x: w / 2 + ring * Math.cos(angle), y: h / 2 + ring * Math.sin(angle) };
    return { id: note.id, title: note.title || "Untitled", type: "note", ...(positions.get(note.id) ?? fallback) };
  });

  return {
    nodes: [center, ...noteNodes],
    links: noteNodes.map((n) => ({ source: centerId, target: n.id })),
  };
};
