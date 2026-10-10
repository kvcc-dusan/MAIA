// Runs one queued operation against the Opus files. The S1 adapter is loaded
// lazily so the web bundle never pulls in the YAML codecs or Tauri code.
import { toast } from "sonner";

let apiPromise = null;
export const getOpusApi = () => {
  apiPromise ??= import("../../lib/opusFiles/index.js");
  return apiPromise;
};

const runDelete = async (api, vaultPath, o) => {
  const result = await api.deleteItem(vaultPath, o.kind, o.id);
  if (result?.skipped?.length > 0) {
    toast.error(`"${o.label}" was deleted, but ${result.skipped.length} file(s) in its folder were edited outside MAIA and kept.`);
  }
};

export const runOp = async (api, vaultPath, o) => {
  if (o.action === "delete") return runDelete(api, vaultPath, o);
  switch (o.kind) {
    case "project": {
      const { warnings = [] } = (await api.saveProject(vaultPath, o.item)) ?? {};
      warnings.forEach((w) => console.warn("[MAIA] Opus rename not applied:", w.path, w.message));
      return;
    }
    case "task":
      await api.saveTask(vaultPath, o.item);
      return;
    case "decision":
      await api.saveDecision(vaultPath, o.projectId, o.item);
      return;
    default:
      await api.saveQuestion(vaultPath, o.projectId, o.item);
  }
};
