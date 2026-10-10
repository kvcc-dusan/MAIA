import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Skeleton } from "@/components/arc/skeleton/skeleton";
import { Button } from "@/components/arc/button/button";
import { GlassErrorBoundary } from "@/components/GlassErrorBoundary";
import { useData } from "@/context/DataContext";
import { useOpusNav } from "../OpusNavContext";
import { toDayString } from "../lib/metrics";
import { projectPeople, showOwners } from "../lib/people";
import { FilterChips, PageBar } from "../kit";
import Board from "../components/board/Board";
import TaskDrawer from "../components/board/TaskDrawer";
import { STATUS_LABELS, STATUS_ORDER, buildColumns, filterTasks, wsFromParams } from "../components/board/model";
import { insertIndex, planOrder, sortColumn } from "../components/board/order";
import { buildCreateArgs, buildPatch } from "../components/board/taskForm";
import styles from "../components/board/BoardTab.module.css";

const ALL = "";
const DRAWER_EXIT_MS = 450;
const CLOSED = { open: false, mode: "create", session: 0, taskId: null, initial: {} };

const BoardSkeleton = () => (
  <div className={styles.skeletonBoard} aria-busy="true">
    {STATUS_ORDER.map((s) => (
      <div key={s} className={styles.skeletonColumn}>
        <Skeleton label={`Loading ${STATUS_LABELS[s]}`} lines={4} />
      </div>
    ))}
  </div>
);

/** Board tab: tasks of one project as four status columns. Receives { project, selectNote }. */
export default function BoardTab({ project }) {
  const data = useData();
  const { params } = useOpusNav();
  const tasks = data?.tasks;
  const { addTask, updateTask, deleteTask, setNextAction } = data ?? {};

  const [wsId, setWsId] = useState(() => wsFromParams(params)[0] ?? ALL);
  const [owner, setOwner] = useState(ALL);
  const [showAllDone, setShowAllDone] = useState(false);
  const [drawer, setDrawer] = useState(CLOSED);
  const [message, setMessage] = useState("");
  const pendingFocus = useRef(null);

  // A navigate from another tab carries { ws, status } and arrives as a new params object.
  useEffect(() => {
    setWsId(wsFromParams(params)[0] ?? ALL);
    setOwner(ALL);
    if (!STATUS_ORDER.includes(params?.status)) return;
    requestAnimationFrame(() => {
      document.querySelector(`[data-status="${params.status}"]`)?.scrollIntoView?.({ inline: "start", block: "nearest" });
    });
  }, [params]);

  const projectTasks = useMemo(() => (tasks ?? []).filter((t) => t && t.projectId === project.id), [tasks, project.id]);
  const workstreams = useMemo(() => [...project.workstreams].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [project.workstreams]);
  const workstreamsById = useMemo(() => new Map(workstreams.map((w) => [w.id, w])), [workstreams]);
  const activeSelection = useMemo(() => (workstreamsById.has(wsId) ? [wsId] : []), [wsId, workstreamsById]);
  const people = useMemo(() => projectPeople(project, tasks), [project, tasks]);
  const isOwnerShown = useMemo(() => showOwners(project, tasks), [project, tasks]);
  const activeOwner = isOwnerShown && people.includes(owner) ? owner : ALL;
  const filtered = useMemo(() => filterTasks(projectTasks, { workstreamIds: activeSelection, owner: activeOwner }), [projectTasks, activeSelection, activeOwner]);
  const columns = useMemo(() => buildColumns(filtered, { showAllDone }), [filtered, showAllDone]);
  const wsOptions = useMemo(() => [{ value: ALL, label: "All" }, ...workstreams.map((w) => ({ value: w.id, label: w.name }))], [workstreams]);
  const ownerOptions = useMemo(() => [{ value: ALL, label: "All owners" }, ...people.map((name) => ({ value: name, label: name }))], [people]);
  const today = toDayString(new Date());

  // Hand focus back to a card that was re-mounted in another column.
  useEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    pendingFocus.current = null;
    requestAnimationFrame(() => document.querySelector(`[data-task-card="${CSS.escape(id)}"]`)?.focus());
  });

  const columnOf = useCallback((status, excludeId) => sortColumn(projectTasks.filter((t) => t.status === status && t.id !== excludeId)), [projectTasks]);

  const place = useCallback((task, status, placement) => {
    const rest = columnOf(status, task.id);
    const at = placement ? insertIndex(rest, placement) : rest.length;
    const [own, ...others] = planOrder(rest, task.id, at);
    const patch = { ...(task.status !== status ? { status } : {}), ...(own.order !== task.order ? { order: own.order } : {}) };
    if (Object.keys(patch).length > 0) updateTask(task.id, patch);
    others.forEach((p) => updateTask(p.id, { order: p.order }));
    pendingFocus.current = task.id;
    return Object.keys(patch).length > 0 || others.length > 0;
  }, [columnOf, updateTask]);

  const handleDrop = useCallback(({ taskId, status, prevId, nextId }) => {
    const task = projectTasks.find((t) => t.id === taskId);
    if (task) place(task, status, { prevId, nextId });
  }, [projectTasks, place]);

  const handleMoveTo = useCallback((task, status) => {
    if (task.status === status) return;
    place(task, status, null);
    setMessage(`Moved ${task.title} to ${STATUS_LABELS[status]}.`);
  }, [place]);

  const openTask = useCallback((id) => setDrawer((d) => ({ open: true, mode: "edit", session: d.session + 1, taskId: id, initial: {} })), []);
  const openCreate = useCallback((status) => setDrawer((d) => ({
    open: true, mode: "create", session: d.session + 1, taskId: null,
    initial: { status, workstreamId: activeSelection.length === 1 ? activeSelection[0] : null },
  })), [activeSelection]);
  const closeDrawer = useCallback(() => setDrawer((d) => ({ ...d, open: false })), []);

  const editing = drawer.mode === "edit" ? projectTasks.find((t) => t.id === drawer.taskId) ?? null : null;
  const isDrawerOpen = drawer.open && (drawer.mode === "create" || Boolean(editing));

  const handleSave = useCallback((draft) => {
    if (drawer.mode === "create") {
      const args = buildCreateArgs(draft, project.id);
      addTask(args.title, args.due, args.desc, args.projectId, args.extras);
      setMessage(`Added ${args.title} to ${STATUS_LABELS[draft.status]}.`);
      return;
    }
    if (!editing) return;
    const patch = buildPatch(editing, draft);
    if (patch.status) patch.order = planOrder(columnOf(patch.status, editing.id), editing.id, Infinity)[0].order;
    if (Object.keys(patch).length === 0) return;
    updateTask(editing.id, patch);
    pendingFocus.current = editing.id;
    setMessage("Task saved.");
  }, [drawer.mode, editing, project.id, addTask, updateTask, columnOf]);

  const handleDelete = useCallback(() => {
    if (!editing) return;
    deleteTask(editing.id);
    setMessage(`Deleted ${editing.title}.`);
    // The card is gone; after the drawer finishes closing, land on the column's add button.
    const addLabel = `Add task to ${STATUS_LABELS[editing.status]}`;
    setTimeout(() => document.querySelector(`[aria-label="${addLabel}"]`)?.focus(), DRAWER_EXIT_MS);
  }, [editing, deleteTask]);

  const handleSetNext = useCallback(() => {
    if (!editing) return;
    setNextAction(editing.id, project.id);
    setMessage(`${editing.title} is now the next action.`);
  }, [editing, project.id, setNextAction]);

  if (!Array.isArray(tasks)) return <BoardSkeleton />;

  return (
    <GlassErrorBoundary title="The board could not load">
      <div className={styles.root}>
        {projectTasks.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyText}>
              <p className={styles.emptyTitle}>No tasks yet</p>
              <p className={styles.emptyBody}>Tasks show up here as cards you can move between columns.</p>
            </div>
            <Button onClick={() => openCreate("todo")}>New task</Button>
          </div>
        ) : (
          <>
            <PageBar
              action={(
                <div className={styles.actions}>
                  <span className={styles.count}>{filtered.length} {filtered.length === 1 ? "task" : "tasks"}</span>
                  <Button onClick={() => openCreate("todo")}>New task</Button>
                </div>
              )}
            >
              <div className={styles.filters}>
                <FilterChips label="Workstream" options={wsOptions} value={wsId && activeSelection.length ? wsId : ALL} onValueChange={setWsId} />
                {isOwnerShown && <FilterChips label="Owner" options={ownerOptions} value={activeOwner} onValueChange={setOwner} />}
              </div>
            </PageBar>
            <Board
              columns={columns}
              workstreamsById={workstreamsById}
              today={today}
              showOwner={isOwnerShown}
              showAllDone={showAllDone}
              onOpen={openTask}
              onMoveTo={handleMoveTo}
              onAdd={openCreate}
              onToggleShowAll={() => setShowAllDone((v) => !v)}
              onDrop={handleDrop}
            />
          </>
        )}

        <TaskDrawer
          open={isDrawerOpen}
          mode={drawer.mode}
          session={drawer.session}
          task={editing}
          initial={drawer.initial}
          project={project}
          people={people}
          onClose={closeDrawer}
          onSave={handleSave}
          onDelete={handleDelete}
          onSetNextAction={handleSetNext}
        />
        <p className={styles.srOnly} role="status" aria-live="polite">{message}</p>
      </div>
    </GlassErrorBoundary>
  );
}
