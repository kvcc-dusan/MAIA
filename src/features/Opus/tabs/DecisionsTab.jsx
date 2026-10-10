import React, { useMemo, useState } from "react";
import { GitBranch } from "lucide-react";
import { useData } from "@/context/DataContext";
import { Button } from "@/components/arc/button/button";
import { EmptyState } from "@/components/composed/EmptyState";
import { SidePanel } from "@/components/composed/SidePanel";
import { ConfirmDialog } from "@/components/composed/ConfirmDialog";
import { PageBar, SearchBox, GroupCard, humanDate } from "../kit";
import { toDayString } from "../lib/metrics";
import DecisionForm from "../components/record/DecisionForm";
import { groupDecisionsByMonth, sortDecisions } from "../components/record/decisions";
import { indexWorkstreams, findWorkstream } from "../components/record/workstreams";
import { clipText } from "../components/record/text";
import styles from "./RecordPage.module.css";

const asList = (value) => (Array.isArray(value) ? value : []);
const CLOSED = { isOpen: false, id: null, nonce: 0, today: "" };
const NO_YEAR_ELISION = 0;

const matches = (needle, parts) => !needle || parts.some((part) => String(part ?? "").toLowerCase().includes(needle));

/** Decisions: search, month cards with a timeline, log and edit in a side panel. */
export default function DecisionsTab({ project }) {
  const { addDecision, updateDecision, deleteProjectDecision } = useData();
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState(CLOSED);
  const [confirm, setConfirm] = useState({ isOpen: false, label: "" });

  const projectId = project?.id;
  const decisions = asList(project?.decisions);
  const workstreams = asList(project?.workstreams);
  const byId = useMemo(() => indexWorkstreams(workstreams), [workstreams]);

  const needle = query.trim().toLowerCase();
  const groups = useMemo(() => {
    const visible = decisions.filter((d) =>
      matches(needle, [d.title, d.detail, d.by, findWorkstream(byId, d.workstreamId)?.name]));
    return groupDecisionsByMonth(sortDecisions(visible));
  }, [decisions, needle, byId]);

  const openEditor = (id = null) =>
    setEditor((current) => ({ isOpen: true, id, nonce: current.nonce + 1, today: toDayString(new Date()) }));
  const closeEditor = () => setEditor((current) => ({ ...current, isOpen: false }));
  const edited = editor.id ? decisions.find((d) => d.id === editor.id) : null;
  const canRenderForm = !editor.id || edited;

  const save = async (data) => {
    if (editor.id) updateDecision(projectId, editor.id, data);
    else if (!addDecision(projectId, data)) throw new Error("Project not found");
    closeEditor();
  };

  const confirmDelete = async () => {
    deleteProjectDecision(projectId, editor.id);
    setConfirm((current) => ({ ...current, isOpen: false }));
    closeEditor();
  };

  const subtitleOf = (decision) =>
    [decision.by ? `Decided by ${decision.by}` : "", findWorkstream(byId, decision.workstreamId)?.name]
      .filter(Boolean)
      .join(" · ");

  return (
    <div className={styles.page}>
      <PageBar action={<Button onClick={() => openEditor()}>Log decision</Button>}>
        {decisions.length > 0 && (
          <SearchBox label="Search decisions" placeholder="Search decisions" value={query} onValueChange={setQuery} />
        )}
      </PageBar>

      {decisions.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title="No decisions logged"
          description="Decisions record what was settled, by whom and why. Log the first one."
          action={<Button variant="secondary" onClick={() => openEditor()}>Log decision</Button>}
        />
      ) : groups.length === 0 ? (
        <EmptyState icon={GitBranch} title="Nothing matches" description="Try a different search." />
      ) : (
        <div className={styles.stack}>
          {groups.map((group) => (
            <GroupCard key={group.key || "undated"} title={group.label} meta={String(group.items.length)}>
              <ul className={styles.timeline}>
                {group.items.map((decision) => (
                  <li key={decision.id}>
                    <button type="button" className={styles.item} onClick={() => openEditor(decision.id)}>
                      <span className={styles.node} aria-hidden="true" />
                      <span className={styles.body}>
                        <span className={styles.title}>{decision.title}</span>
                        {subtitleOf(decision) && <span className={styles.sub}>{subtitleOf(decision)}</span>}
                        {decision.detail && <span className={styles.detail}>{decision.detail}</span>}
                      </span>
                      <span className={styles.date}>
                        {decision.date ? humanDate(decision.date, NO_YEAR_ELISION) : "No date"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </GroupCard>
          ))}
        </div>
      )}

      <SidePanel
        open={editor.isOpen}
        onClose={closeEditor}
        title={editor.id ? "Edit decision" : "Log decision"}
        description="Decisions are kept in date order for the whole project."
      >
        {canRenderForm && (
          <DecisionForm
            key={editor.nonce}
            decision={edited}
            workstreams={workstreams}
            today={editor.today}
            onSave={save}
            onCancel={closeEditor}
            onDelete={() => setConfirm({ isOpen: true, label: clipText(edited?.title, 80) })}
          />
        )}
      </SidePanel>

      <ConfirmDialog
        open={confirm.isOpen}
        onClose={() => setConfirm((current) => ({ ...current, isOpen: false }))}
        onConfirm={confirmDelete}
        title="Delete this decision?"
        description={`"${confirm.label}" is removed from the project. This can't be undone.`}
        confirmLabel="Delete decision"
      />
    </div>
  );
}
