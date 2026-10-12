import React, { useCallback, useMemo, useState } from "react";
import { Plus, SearchX, ListChecks, X } from "@/components/icons";
import { Button } from "@/components/arc/button/button";
import { EmptyState } from "@/components/composed/EmptyState";
import { Select } from "@/components/composed/Select";
import { useData } from "@/context/DataContext";
import { useOpusNav } from "../OpusNavContext";
import { FilterChips, PageBar, SearchBox } from "../kit";
import { toDayString } from "../lib/metrics";
import { projectPeople, showOwners as hasManyOwners } from "../lib/people";
import TaskEditor from "../components/tasks/TaskEditor";
import TasksList from "../components/tasks/TasksList";
import {
  EMPTY_COPY, EXACT_STATUSES, GROUP_OPTIONS, SORT_OPTIONS, STATUS_FILTERS, filterTasks, groupTasks,
  hasExtraFilters, sanitizeFilters,
} from "../components/tasks/filterTasks";
import { useTaskFilters } from "../components/tasks/useTaskFilters";
import { buildCreateArgs, buildPatch } from "../components/tasks/taskDraft";
import { workstreamColor } from "../components/tasks/taskDisplay";
import styles from "../components/tasks/TasksTab.module.css";

const CLOSED = { open: false, mode: "create", session: 0, taskId: null, initial: {} };

/** Tasks tab: a plain filterable list of the project's tasks. Receives { project }. */
export default function TasksTab({ project }) {
  const { tasks, addTask, updateTask, deleteTask, toggleTask } = useData();
  const { params } = useOpusNav();
  const [rawFilters, dispatch] = useTaskFilters(params);
  const [drawer, setDrawer] = useState(CLOSED);

  const today = toDayString(new Date());
  const workstreams = useMemo(() => project.workstreams ?? [], [project.workstreams]);
  const milestones = useMemo(() => project.milestones ?? [], [project.milestones]);
  const projectTasks = useMemo(() => tasks.filter((t) => t.projectId === project.id), [tasks, project.id]);
  const owners = useMemo(() => [...new Set(projectTasks.map((t) => t.owner).filter(Boolean))].sort(), [projectTasks]);
  const people = useMemo(() => projectPeople(project, tasks), [project, tasks]);
  const showOwners = hasManyOwners(project, tasks);
  const workstreamsById = useMemo(() => new Map(workstreams.map((w) => [w.id, w])), [workstreams]);
  const milestonesById = useMemo(() => new Map(milestones.map((m) => [m.id, m])), [milestones]);

  const filters = sanitizeFilters(rawFilters, { workstreams, milestones, owners });
  const visible = filterTasks(projectTasks, filters, today);
  const groups = groupTasks(visible, filters.groupBy, { workstreams, milestones, allTasks: projectTasks, sort: filters.sort });
  const exactLabel = EXACT_STATUSES[filters.status];
  const milestone = milestonesById.get(filters.milestoneId);
  const hasExtras = hasExtraFilters(filters);

  const openTask = useCallback((id) => setDrawer((d) => ({ open: true, mode: "edit", session: d.session + 1, taskId: id, initial: {} })), []);
  const openCreate = useCallback(() => setDrawer((d) => ({
    open: true, mode: "create", session: d.session + 1, taskId: null,
    initial: { workstreamId: filters.workstreamId || null, milestoneId: filters.milestoneId || null },
  })), [filters.workstreamId, filters.milestoneId]);
  const closeDrawer = useCallback(() => setDrawer((d) => ({ ...d, open: false })), []);

  const editing = drawer.mode === "edit" ? projectTasks.find((t) => t.id === drawer.taskId) ?? null : null;
  const isDrawerOpen = drawer.open && (drawer.mode === "create" || Boolean(editing));

  const handleSave = (draft) => {
    if (drawer.mode === "create") {
      const args = buildCreateArgs(draft, project.id);
      addTask(args.title, args.due, args.desc, args.projectId, args.extras);
      return;
    }
    if (!editing) return;
    const patch = buildPatch(editing, draft);
    if (Object.keys(patch).length > 0) updateTask(editing.id, patch);
  };

  const ctx = useMemo(
    () => ({ today, showOwners, onToggle: toggleTask, onUpdate: updateTask, onOpen: openTask }),
    [today, showOwners, toggleTask, updateTask, openTask]
  );

  const wsOptions = workstreams.map((w) => ({ value: w.id, label: w.name, color: workstreamColor(w) }));
  const ownerOptions = owners.map((o) => ({ value: o, label: o }));
  const [emptyTitle, emptyText] = EMPTY_COPY[filters.status] ?? EMPTY_COPY.all;

  const renderBody = () => {
    if (projectTasks.length === 0) {
      return (
        <EmptyState
          icon={ListChecks}
          title="No tasks yet"
          description="Tasks are the units of work. Add the first one to start tracking progress."
          action={<Button onClick={openCreate}>New task</Button>}
        />
      );
    }
    if (visible.length === 0) {
      const isFiltered = hasExtras;
      return (
        <EmptyState
          icon={isFiltered ? SearchX : ListChecks}
          title={isFiltered ? "No tasks match" : emptyTitle}
          description={isFiltered ? "Nothing fits these filters. Clear them to see more." : emptyText}
          action={isFiltered ? <Button variant="secondary" onClick={() => dispatch({ type: "clear" })}>Clear filters</Button> : undefined}
        />
      );
    }
    return (
      <TasksList
        groups={groups}
        count={visible.length}
        groupBy={filters.groupBy}
        ctx={ctx}
        workstreamsById={workstreamsById}
        milestonesById={milestonesById}
      />
    );
  };

  return (
    <div className={styles.page}>
      <PageBar action={<Button onClick={openCreate}><Plus size={16} strokeWidth={1.75} aria-hidden="true" /> New task</Button>}>
        <FilterChips
          label="Task status"
          options={STATUS_FILTERS}
          value={exactLabel ? "" : filters.status}
          onValueChange={(value) => dispatch({ type: "status", value })}
        />
        {exactLabel ? (
          <Button variant="secondary" size="sm" onClick={() => dispatch({ type: "status", value: "open" })} aria-label={`Remove status filter ${exactLabel}`}>
            Status: {exactLabel} <X size={14} strokeWidth={1.75} aria-hidden="true" />
          </Button>
        ) : null}
        {milestone ? (
          <Button variant="secondary" size="sm" onClick={() => dispatch({ type: "milestone", value: "" })} aria-label={`Remove milestone filter ${milestone.title}`}>
            Milestone: {milestone.title} <X size={14} strokeWidth={1.75} aria-hidden="true" />
          </Button>
        ) : null}
      </PageBar>

      {projectTasks.length > 0 ? (
        <div className={styles.toolbar}>
          <div className={styles.tools}>
            <SearchBox
              className={styles.search}
              label="Search tasks"
              placeholder="Search tasks"
              value={filters.query}
              onValueChange={(value) => dispatch({ type: "query", value })}
            />
            <div className={styles.field}>
              <Select
                label="Workstream"
                labelClassName="sr-only"
                value={filters.workstreamId || null}
                options={wsOptions}
                clearLabel="All workstreams"
                placeholder="All workstreams"
                onChange={(value) => dispatch({ type: "workstream", value })}
              />
            </div>
            {showOwners ? (
              <div className={styles.field}>
                <Select
                  label="Owner"
                  labelClassName="sr-only"
                  value={filters.owner || null}
                  options={ownerOptions}
                  clearLabel="Everyone"
                  placeholder="Everyone"
                  onChange={(value) => dispatch({ type: "owner", value })}
                />
              </div>
            ) : null}
            <div className={styles.field}>
              <Select
                label="Sort by"
                labelClassName="sr-only"
                value={filters.sort}
                options={SORT_OPTIONS}
                onChange={(value) => dispatch({ type: "sort", value })}
              />
            </div>
          </div>
          <div className={styles.group}>
            <span className={styles.groupLabel}>Group by</span>
            <FilterChips
              label="Group tasks by"
              options={GROUP_OPTIONS}
              value={filters.groupBy}
              onValueChange={(value) => dispatch({ type: "groupBy", value })}
            />
          </div>
        </div>
      ) : null}

      {renderBody()}

      <TaskEditor
        open={isDrawerOpen}
        mode={drawer.mode}
        session={drawer.session}
        task={editing}
        initial={drawer.initial}
        project={project}
        people={people}
        onClose={closeDrawer}
        onSave={handleSave}
        onDelete={() => { if (editing) deleteTask(editing.id); }}
      />
    </div>
  );
}
