import React, { useMemo, useRef, useState } from "react";
import { Button } from "@/components/arc/button/button";
import { useData } from "../../../context/DataContext";
import { ConfirmDialog } from "@/components/composed/ConfirmDialog";
import { EmptyState } from "@/components/composed/EmptyState";
import { ListChecks, SearchX } from "lucide-react";
import { useOpusNav } from "../OpusNavContext";
import { toDayString } from "../lib/metrics";
import TaskRow from "./tasks/TaskRow";
import TaskGroup from "./tasks/TaskGroup";
import TaskComposer from "./tasks/TaskComposer";
import TaskFilters from "./tasks/TaskFilters";
import { UNASSIGNED, filterTasks, groupTasks, hasActiveFilters, sanitizeFilters, summarizeTasks } from "./tasks/filterTasks";
import { useTaskFilters } from "./tasks/useTaskFilters";
import { useGroupOpen } from "./tasks/useGroupOpen";
import styles from "./ExecutionPanel.module.css";

const summaryText = ({ open, blocked, overdue }) =>
  [`${open} open`, blocked ? `${blocked} blocked` : "", overdue ? `${overdue} overdue` : ""].filter(Boolean).join(", ");

/** The Tasks tab body: next move, quick add, filters, grouped rows. */
export default function ExecutionPanel({ project }) {
  const { tasks, addTask, toggleTask, updateTask, deleteTask, setNextAction } = useData();
  const { params } = useOpusNav();
  const [rawFilters, dispatch] = useTaskFilters(params);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isClearing, setIsClearing] = useState(false);
  const composerRef = useRef(null);

  const today = toDayString(new Date());
  const workstreams = useMemo(() => project.workstreams ?? [], [project.workstreams]);
  const milestones = useMemo(() => project.milestones ?? [], [project.milestones]);
  const projectTasks = useMemo(() => tasks.filter((t) => t.projectId === project.id), [tasks, project.id]);

  const filters = sanitizeFilters(rawFilters, { workstreams, milestones });
  const isFiltered = hasActiveFilters(filters);
  const visible = filterTasks(projectTasks, filters, today);
  const isStatusView = filters.groupBy === "status";
  const nextMove = isStatusView ? visible.find((t) => t.isNextAction && t.status !== "done") : null;
  const rest = nextMove ? visible.filter((t) => t.id !== nextMove.id) : visible;
  const groups = groupTasks(rest, filters.groupBy, { workstreams, milestones, allTasks: projectTasks });
  const { isOpen, toggle } = useGroupOpen(groups, { groupBy: filters.groupBy, isFiltered });
  const completed = visible.filter((t) => t.status === "done");

  const actions = useMemo(() => ({
    onToggle: toggleTask,
    onUpdate: updateTask,
    onDelete: setPendingDelete,
    onSetNext: setNextAction,
  }), [toggleTask, updateTask, setNextAction]);

  const ctx = {
    today, workstreams, milestones, actions,
    hide: { workstream: filters.groupBy === "workstream", milestone: filters.groupBy === "milestone" },
  };

  const handleAdd = ({ title, schedule, priority }) => {
    const hasNextAction = projectTasks.some((t) => t.isNextAction && t.status !== "done");
    // A task added while filtering by workstream or milestone should stay in view.
    const link = (id) => (id && id !== UNASSIGNED ? id : null);
    addTask(title, null, "", project.id, {
      schedule,
      priority,
      workstreamId: link(filters.workstreamId),
      milestoneId: link(filters.milestoneId),
      ...(hasNextAction ? {} : { isNextAction: true }),
    });
  };

  const targetName = workstreams.find((w) => w.id === filters.workstreamId)?.name;
  const note = targetName ? `New tasks are added to ${targetName}.` : undefined;

  const renderRow = (task, showNextMarker) => <TaskRow key={task.id} task={task} ctx={ctx} showNextMarker={showNextMarker} />;

  return (
    <section className={styles.panel} aria-labelledby="opus-tasks-heading">
      <header className={styles.head}>
        <h2 id="opus-tasks-heading" className={styles.title}>Tasks</h2>
        <p className={styles.summary}>{summaryText(summarizeTasks(projectTasks, today))}</p>
      </header>

      {nextMove && (
        <section className={styles.next} aria-labelledby="opus-next-move">
          <h3 id="opus-next-move" className={styles.nextTitle}>Next move</h3>
          <TaskRow task={nextMove} ctx={ctx} showNextMarker={false} />
        </section>
      )}
      {!nextMove && isStatusView && !isFiltered && projectTasks.some((t) => t.status !== "done") && (
        <p className={styles.hint}>No next move yet. Open a task&apos;s actions menu and choose Set as next move.</p>
      )}

      <TaskComposer onAdd={handleAdd} inputRef={composerRef} note={note} />

      {projectTasks.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No tasks yet"
          description="Add the first task to start tracking this project."
          action={<Button onClick={() => composerRef.current?.focus()}>Add a task</Button>}
        />
      ) : (
        <>
          <TaskFilters
            filters={filters}
            dispatch={dispatch}
            workstreams={workstreams}
            milestones={milestones}
            shownCount={visible.length}
            totalCount={projectTasks.length}
            completedCount={completed.length}
            onClearCompleted={() => setIsClearing(true)}
          />
          {visible.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No tasks match"
              description="Nothing fits these filters. Clear them to see more."
              action={<Button variant="secondary" onClick={() => dispatch({ type: "clear" })}>Clear filters</Button>}
            />
          ) : (
            <div className={styles.groups}>
              {groups.map((group) => (
                <TaskGroup
                  key={group.key}
                  group={group}
                  today={today}
                  showHeader={filters.groupBy !== "none"}
                  isOpen={isOpen(group)}
                  onToggle={() => toggle(group)}
                >
                  {group.tasks.map((t) => <li key={t.id}>{renderRow(t, !isStatusView)}</li>)}
                </TaskGroup>
              ))}
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={isClearing}
        onClose={() => setIsClearing(false)}
        onConfirm={() => completed.forEach((t) => deleteTask(t.id))}
        title="Clear completed tasks?"
        description={`This removes ${completed.length} completed task${completed.length === 1 ? "" : "s"}. This can't be undone.`}
        confirmLabel="Clear completed"
      />
      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => deleteTask(pendingDelete.id)}
        title={`Delete "${pendingDelete?.title ?? ""}"?`}
        description="This task is removed from the project. This can't be undone."
        confirmLabel="Delete task"
      />
    </section>
  );
}
