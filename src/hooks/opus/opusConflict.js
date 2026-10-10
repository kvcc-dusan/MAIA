// Same stance as the notes store: a file that changed on disk while an edit
// was waiting is never overwritten. The edit is kept as "(conflict copy)" and
// the original shows the disk version.
import { uid } from "../../lib/ids.js";

const SUFFIX = " (conflict copy)";

const copyOf = (o) => {
  const { item } = o;
  switch (o.kind) {
    case "project":
      return { ...item, id: uid(), name: `${item.name}${SUFFIX}`, decisions: [], questions: [], assets: [] };
    case "task":
      return { ...item, id: uid(), title: `${item.title}${SUFFIX}`, isNextAction: false };
    case "decision":
      return { ...item, id: uid(), title: `${item.title}${SUFFIX}` };
    default:
      return { ...item, id: uid(), question: `${item.question}${SUFFIX}` };
  }
};

/**
 * @param {{ op: object }[]} conflicts failed ops that raised VaultConflictError
 * @returns {{ extras: object[], revertKeys: Set<string>, messages: string[] }}
 */
export const planConflicts = (conflicts) => {
  const extras = [];
  const revertKeys = new Set();
  const messages = [];
  conflicts.forEach(({ op }) => {
    revertKeys.add(op.key);
    if (op.action === "delete") {
      messages.push(`"${op.label}" changed outside MAIA, so it was not deleted.`);
      return;
    }
    const copy = copyOf(op);
    extras.push({ kind: op.kind, item: copy, projectId: op.projectId });
    messages.push(`"${op.label}" changed outside MAIA. Your edit is kept as "${op.label}${SUFFIX}" for you to merge by hand.`);
  });
  return { extras, revertKeys, messages };
};
