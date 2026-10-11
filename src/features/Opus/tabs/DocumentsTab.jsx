import React, { useMemo, useState } from "react";
import { FileText, SearchX } from "@/components/icons";
import { Button } from "@/components/arc/button/button";
import { ConfirmDialog } from "@/components/composed/ConfirmDialog";
import { EmptyState } from "@/components/composed/EmptyState";
import { SidePanel } from "@/components/composed/SidePanel";
import { useData } from "@/context/DataContext";
import { FilterChips, PageBar, SearchBox } from "../kit";
import { projectDocuments } from "../lib/docModel";
import DocumentForm from "../components/docs/DocumentForm";
import DocumentReader from "../components/docs/DocumentReader";
import DocumentRow from "../components/docs/DocumentRow";
import { DOC_FILTERS, docTitle, filterDocuments, statusCounts } from "../components/docs/docDisplay";
import styles from "./DocumentsTab.module.css";

// Form state: null (closed), { note: null } (adding) or { note } (editing).
export default function DocumentsTab({ project, selectNote }) {
  const { notes, createNote, updateNote } = useData();
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(null);
  const [readingId, setReadingId] = useState(null);
  const [removing, setRemoving] = useState(null);

  const docs = useMemo(() => projectDocuments(notes, project.id), [notes, project.id]);
  const counts = useMemo(() => statusCounts(docs), [docs]);
  const shown = useMemo(() => filterDocuments(docs, { status, query, project }), [docs, status, query, project]);
  const reading = docs.find((d) => d.id === readingId) ?? null;

  const handleSave = (fields) => {
    if (form?.note) {
      updateNote({ id: form.note.id, ...fields, updatedAt: new Date().toISOString() });
      setForm(null);
      return;
    }
    const id = createNote({ ...fields, projectIds: [project.id] });
    setForm(null);
    selectNote?.(id);
  };

  const handleRemove = () => {
    // Unlink only: the note stays in Codex.
    updateNote({ id: removing.id, projectIds: (removing.projectIds ?? []).filter((id) => id !== project.id) });
  };

  const panels = (
    <>
      <SidePanel open={Boolean(form)} onClose={() => setForm(null)} title={form?.note ? "Edit document" : "Add document"}>
        {form && (
          <DocumentForm
            key={form.note?.id ?? "new"}
            note={form.note}
            workstreams={project.workstreams ?? []}
            onSave={handleSave}
            onCancel={() => setForm(null)}
          />
        )}
      </SidePanel>
      <DocumentReader
        note={reading}
        project={project}
        onClose={() => setReadingId(null)}
        onOpenInCodex={selectNote}
      />
      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={handleRemove}
        title="Remove this document from the project?"
        description={removing ? `"${docTitle(removing)}" stays in Codex. It just stops showing here.` : undefined}
        confirmLabel="Remove from project"
      />
    </>
  );

  const addButton = <Button onClick={() => setForm({ note: null })}>Add document</Button>;

  if (docs.length === 0) {
    return (
      <div className={styles.page}>
        <EmptyState
          icon={FileText}
          title="No documents"
          description="Add the specs, briefs and plans this project relies on. Each one is a note you can write in Codex."
          action={addButton}
        />
        {panels}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageBar action={addButton}>
        <FilterChips
          label="Document status"
          options={DOC_FILTERS.map((f) => ({ ...f, count: counts[f.value] }))}
          value={status}
          onValueChange={setStatus}
        />
        <SearchBox label="Search documents" placeholder="Search documents" value={query} onValueChange={setQuery} />
      </PageBar>

      {shown.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No documents match"
          description="Nothing fits this status and search."
          action={<Button variant="secondary" onClick={() => { setStatus("all"); setQuery(""); }}>Clear filters</Button>}
        />
      ) : (
        <section className={styles.card} aria-label="Documents">
          {shown.map((note) => (
            <DocumentRow
              key={note.id}
              note={note}
              project={project}
              onRead={(n) => setReadingId(n.id)}
              onEdit={(n) => setForm({ note: n })}
              onRemove={setRemoving}
            />
          ))}
        </section>
      )}
      {panels}
    </div>
  );
}
