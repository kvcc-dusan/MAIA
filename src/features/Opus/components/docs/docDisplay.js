// Pure helpers for the Documents page: filtering, row text, form drafts.
import { DOC_KINDS, docKindLabel, docMeta, docStatusLabel } from "../../lib/docModel";
import { humanDate } from "../../kit/format";

export const DOC_FILTERS = [
  { value: "all", label: "All" },
  { value: "current", label: "Current" },
  { value: "draft", label: "Draft" },
  { value: "notStarted", label: "Not started" },
  { value: "superseded", label: "Superseded" },
];

export const docTitle = (note) => note.title?.trim() || "Untitled";

/** "Sara Vidmar · Launch · Updated 8 Oct"; parts that are unknown are left out. */
export const docSubtitle = (note, project) => {
  const meta = docMeta(note, project);
  const updated = humanDate(meta.updatedAt);
  return [meta.ownerName, meta.workstreamName, updated ? `Updated ${updated}` : ""].filter(Boolean).join(" · ");
};

export const filterDocuments = (docs, { status = "all", query = "", project } = {}) => {
  const needle = query.trim().toLowerCase();
  return docs.filter((note) => {
    if (status !== "all" && note.status !== status) return false;
    if (!needle) return true;
    const { ownerName = "", workstreamName = "" } = docMeta(note, project);
    return [docTitle(note), docKindLabel(note.kind), docStatusLabel(note.status), ownerName, workstreamName]
      .some((text) => text.toLowerCase().includes(needle));
  });
};

export const statusCounts = (docs) =>
  DOC_FILTERS.reduce((acc, { value }) => ({
    ...acc,
    [value]: value === "all" ? docs.length : docs.filter((d) => d.status === value).length,
  }), {});

export const emptyDocDraft = () => ({ title: "", kind: "plan", status: "draft", workstreamId: null, owner: "" });

export const noteToDocDraft = (note) => ({
  title: note.title ?? "",
  kind: note.kind || "other",
  status: note.status || "draft",
  workstreamId: note.workstreamId ?? null,
  owner: note.owner ?? "",
});

export const validateDocDraft = (draft) => (draft.title.trim() ? {} : { title: "Give the document a title." });

/** Note fields for a draft. Empty optional fields are cleared, not stored as blanks. */
export const docDraftToFields = (draft) => ({
  title: draft.title.trim(),
  kind: draft.kind,
  status: draft.status,
  workstreamId: draft.workstreamId || null,
  owner: draft.owner.trim(),
});

export const kindOptions = DOC_KINDS;
