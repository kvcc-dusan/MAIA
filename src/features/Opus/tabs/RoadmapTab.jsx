import React, { useCallback, useMemo, useRef, useState } from "react";
import { Plus, Route } from "lucide-react";
import { useData } from "@/context/DataContext";
import { Button } from "@/components/arc/button/button";
import { EmptyState } from "@/components/composed/EmptyState";
import { ConfirmDialog } from "@/components/composed/ConfirmDialog";
import { WORKSTREAM_COLORS } from "../lib/projectModel";
import { PageBar, FilterChips } from "../kit";
import { DEFAULT_ZOOM, ZOOM_OPTIONS, dayNumber, computeRange, defaultRange, todayDay, containsDay } from "../components/roadmap/geometry";
import { buildRoadmap, groupByMonth, unassignText, workstreamMenuId } from "../components/roadmap/roadmapModel";
import { useElementWidth } from "../components/roadmap/useElementWidth";
import RoadmapGantt from "../components/roadmap/RoadmapGantt";
import RoadmapLegend from "../components/roadmap/RoadmapLegend";
import RoadmapList from "../components/roadmap/RoadmapList";
import WorkstreamList from "../components/roadmap/WorkstreamList";
import MilestonePanel from "../components/roadmap/MilestonePanel";
import WorkstreamPanel from "../components/roadmap/WorkstreamPanel";
import styles from "./RoadmapTab.module.css";

// Container width, not viewport: the Opus page has a sidebar, so the tab is
// always narrower than the window.
const NARROW_BELOW_PX = 640;

/**
 * Roadmap: a Gantt of milestones by workstream on wide containers, a month
 * grouped list on narrow ones, plus milestone and workstream editing.
 * Receives { project, selectNote }.
 */
export default function RoadmapTab({ project }) {
  const {
    tasks, addMilestone, updateMilestone, deleteMilestone,
    addWorkstream, updateWorkstream, deleteWorkstream,
  } = useData();
  const rootRef = useRef(null);
  const ganttRef = useRef(null);
  const addButtonRef = useRef(null);
  const restoreFocusId = useRef(null);
  const wasDeleted = useRef(false);
  const width = useElementWidth(rootRef);
  const isNarrow = width > 0 && width < NARROW_BELOW_PX;

  const [panel, setPanel] = useState(null); // { kind, key, id|null, open }
  const [confirm, setConfirm] = useState(null); // { kind, id }
  const [announcement, setAnnouncement] = useState("");
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  const projectTasks = useMemo(() => tasks.filter((t) => t.projectId === project.id), [tasks, project.id]);
  const roadmap = useMemo(() => buildRoadmap(project, projectTasks), [project, projectTasks]);
  const { lanes, scheduled, unscheduled, workstreams } = roadmap;

  const today = todayDay();
  const referenceYear = new Date().getFullYear();
  const targetDay = dayNumber(project.targetDate);
  const range = useMemo(
    () => computeRange({ startDate: project.startDate, targetDate: project.targetDate, milestones: scheduled })
      ?? defaultRange(todayDay()),
    [project.startDate, project.targetDate, scheduled]
  );

  const openPanel = useCallback((kind, id = null, restoreId = null, draft = null) => {
    restoreFocusId.current = restoreId;
    wasDeleted.current = false;
    setPanel({ kind, id, draft, key: `${kind}-${id ?? "new"}-${Date.now()}`, open: true });
  }, []);
  const closePanel = useCallback(() => setPanel((p) => (p ? { ...p, open: false } : p)), []);

  const handleCloseAutoFocus = (event) => {
    const target = wasDeleted.current
      ? addButtonRef.current
      : restoreFocusId.current && document.getElementById(restoreFocusId.current);
    if (target) {
      event.preventDefault();
      target.focus();
    }
  };

  const openWorkstream = (id) => openPanel("workstream", id, workstreamMenuId(id));

  const saveMilestone = (data) => {
    if (panel.id) updateMilestone(project.id, panel.id, data);
    else addMilestone(project.id, data);
    setAnnouncement(`${data.title} ${panel.id ? "saved" : "added"}.`);
    closePanel();
  };

  const saveWorkstream = (data) => {
    if (panel.id) updateWorkstream(project.id, panel.id, data);
    else addWorkstream(project.id, data);
    setAnnouncement(`${data.name} ${panel.id ? "saved" : "added"}.`);
    closePanel();
  };

  const confirmDelete = () => {
    if (confirm.kind === "milestone") {
      deleteMilestone(project.id, confirm.id);
      setAnnouncement("Milestone deleted.");
      wasDeleted.current = true;
      closePanel();
    } else {
      deleteWorkstream(project.id, confirm.id);
      setAnnouncement("Workstream deleted.");
      restoreFocusId.current = null;
      wasDeleted.current = true;
    }
  };

  const editedMilestone = panel?.kind === "milestone" && panel.id
    ? [...scheduled, ...unscheduled].find((m) => m.id === panel.id) ?? null
    : panel?.draft ?? null;
  const editedWorkstream = panel?.kind === "workstream" && panel.id
    ? workstreams.find((w) => w.id === panel.id) ?? null
    : null;

  const confirmCopy = (() => {
    if (!confirm) return null;
    if (confirm.kind === "milestone") {
      const m = [...scheduled, ...unscheduled].find((x) => x.id === confirm.id);
      if (!m) return null;
      const linked = m.stats.total;
      return {
        title: `Delete ${m.title}?`,
        description: linked
          ? `This removes the milestone. Its ${linked} linked ${linked === 1 ? "task stays" : "tasks stay"} in the project without a milestone.`
          : "This removes the milestone from the roadmap.",
        confirmLabel: "Delete milestone",
      };
    }
    const w = workstreams.find((x) => x.id === confirm.id);
    if (!w) return null;
    const counts = {
      milestones: project.milestones.filter((m) => m.workstreamId === w.id).length,
      tasks: projectTasks.filter((t) => t.workstreamId === w.id).length,
      decisions: project.decisions.filter((d) => d.workstreamId === w.id).length,
      questions: project.questions.filter((q) => q.workstreamId === w.id).length,
    };
    return { title: `Delete ${w.name}?`, description: unassignText(counts), confirmLabel: "Delete workstream" };
  })();

  const isEmpty = project.milestones.length === 0 && workstreams.length === 0;
  const defaultColor = WORKSTREAM_COLORS[workstreams.length % WORKSTREAM_COLORS.length];

  const addMilestoneButton = (
    <Button ref={addButtonRef} onClick={() => openPanel("milestone")}>New milestone</Button>
  );

  const monthGroups = groupByMonth(scheduled);
  const unscheduledGroup = unscheduled.length
    ? [{ key: "unscheduled", label: "Unscheduled", showCount: true, items: unscheduled }]
    : [];
  const canJumpToToday = !isNarrow && lanes.length > 0 && containsDay(range, today);

  return (
    <div ref={rootRef} className={styles.root}>
      <PageBar action={addMilestoneButton}>
        {!isNarrow && (
          <>
            <FilterChips options={ZOOM_OPTIONS} value={zoom} onValueChange={setZoom} label="Zoom" />
            <Button variant="ghost" size="sm" disabled={!canJumpToToday} onClick={() => ganttRef.current?.scrollToToday(true)}>
              Today
            </Button>
            <RoadmapLegend />
          </>
        )}
      </PageBar>

      {isEmpty ? (
        <EmptyState
          icon={Route}
          size="page"
          title="No milestones yet"
          description="Add milestones with a start and a due date to see them on the roadmap."
        />
      ) : (
        <div className={styles.sections}>
          {scheduled.length === 0 && (
            <p className={styles.notice}>
              {project.milestones.length === 0
                ? "No milestones yet. Add one with a due date to place it on the timeline."
                : "No milestone has a due date yet. Set a due date to place it on the timeline."}
            </p>
          )}
          {isNarrow ? (
            <>
              <RoadmapList groups={monthGroups} referenceYear={referenceYear} onOpen={(id) => openPanel("milestone", id)} />
              <WorkstreamList workstreams={workstreams} onEdit={openWorkstream} onDelete={(id) => setConfirm({ kind: "workstream", id })} />
            </>
          ) : (
            lanes.length > 0 && (
              <RoadmapGantt
                ref={ganttRef}
                lanes={lanes}
                range={range}
                zoom={zoom}
                today={today}
                targetDay={targetDay}
                referenceYear={referenceYear}
                onOpenMilestone={(id) => openPanel("milestone", id)}
                onEditWorkstream={openWorkstream}
                onDeleteWorkstream={(id) => setConfirm({ kind: "workstream", id })}
                onAddAt={(draft) => openPanel("milestone", null, null, draft)}
              />
            )
          )}
          {unscheduledGroup.length > 0 && (
            <RoadmapList groups={unscheduledGroup} referenceYear={referenceYear} onOpen={(id) => openPanel("milestone", id)} />
          )}
        </div>
      )}

      <div>
        <Button variant="ghost" size="sm" onClick={() => openPanel("workstream")}>
          <Plus width={16} height={16} strokeWidth={1.75} aria-hidden="true" />
          Add workstream
        </Button>
      </div>

      {panel?.kind === "milestone" && (
        <MilestonePanel
          key={panel.key}
          open={panel.open}
          milestone={editedMilestone}
          workstreams={workstreams}
          onClose={closePanel}
          onSave={saveMilestone}
          onDelete={(id) => setConfirm({ kind: "milestone", id })}
          onCloseAutoFocus={handleCloseAutoFocus}
        />
      )}
      {panel?.kind === "workstream" && (
        <WorkstreamPanel
          key={panel.key}
          open={panel.open}
          workstream={editedWorkstream}
          defaultColor={defaultColor}
          onClose={closePanel}
          onSave={saveWorkstream}
          onCloseAutoFocus={handleCloseAutoFocus}
        />
      )}
      {confirmCopy && (
        <ConfirmDialog
          open
          onClose={() => setConfirm(null)}
          onConfirm={confirmDelete}
          title={confirmCopy.title}
          description={confirmCopy.description}
          confirmLabel={confirmCopy.confirmLabel}
        />
      )}

      <p className={styles.srOnly} role="status">{announcement}</p>
    </div>
  );
}
