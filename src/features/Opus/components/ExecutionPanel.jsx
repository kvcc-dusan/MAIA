import React, { useState, useEffect } from 'react';
import { useData } from "../../../context/DataContext";
import {
  PlusSignSquare as Plus,
  Target02 as Target,
  CancelSquare as X,
  Unavailable as Ban,
  Calendar03 as Calendar,
  Clock01 as Clock,
  Layers01 as Layers,
  ArrowDown01 as ChevronDown,
  ChevronRight,
} from "../../../components/ui/CustomIcon.jsx";
import { cn } from "@/lib/utils";
import { TASK_PRIORITIES, SCHEDULES } from "@/lib/constants";
import { Menu, ContextDangerItem } from "@/components/composed/Menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select } from "@/components/composed/Select";
import { DateTimeField } from "@/components/composed/DateTimeField";
import { Input } from "@/components/ui/input";
import { PriorityCheckbox } from "@/components/ui/PriorityCheckbox";
import { ConfirmDialog } from "@/components/composed/ConfirmDialog";
import { SectionLabel } from "@/components/composed/SectionBits";

const SCHED_ORDER = { today: 0, soon: 1, future: 2 };
const PRIORITY_ORDER = { p1: 0, p2: 1, p3: 2 };

// Composer/edit selects are narrow inline controls — "High"/"Medium"/"Normal"
// fits, "High priority" doesn't.
const PRIORITY_OPTIONS_SHORT = TASK_PRIORITIES.map(p => ({ ...p, label: p.label.replace(' priority', '') }));

// One comparator for every group — schedule bucket, then priority, then
// creation order. Previously FIFO-by-schedule only applied to today/soon/
// future, so blocked and done tasks rendered in raw array order.
const sortTasks = (arr) => [...arr].sort((a, b) => {
  const sd = (SCHED_ORDER[a.schedule] ?? 0) - (SCHED_ORDER[b.schedule] ?? 0);
  if (sd !== 0) return sd;
  const pd = (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
  if (pd !== 0) return pd;
  return new Date(a.createdAt) - new Date(b.createdAt);
});

export default function ExecutionPanel({ project }) {
  const { tasks, addTask, toggleTask, updateTask, deleteTask, setNextAction } = useData();
  const [newTitle, setNewTitle] = useState("");
  const [newSchedule, setNewSchedule] = useState("today");
  const [newPriority, setNewPriority] = useState("p3");
  const [confirmClear, setConfirmClear] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({
    today: true, soon: true, future: false, blocked: true, done: false,
  });

  const projectTasks = tasks.filter(t => t.projectId === project.id);
  const nowTask   = projectTasks.find(t => t.isNextAction && !t.done);
  const today     = sortTasks(projectTasks.filter(t => !t.done && !t.isNextAction && t.status !== 'blocked' && (!t.schedule || t.schedule === 'today')));
  const soon      = sortTasks(projectTasks.filter(t => !t.done && !t.isNextAction && t.status !== 'blocked' && t.schedule === 'soon'));
  const future    = sortTasks(projectTasks.filter(t => !t.done && !t.isNextAction && t.status !== 'blocked' && t.schedule === 'future'));
  const blocked   = sortTasks(projectTasks.filter(t => !t.done && !t.isNextAction && t.status === 'blocked'));
  const completed = sortTasks(projectTasks.filter(t => t.done));

  // Track previous lengths to detect 0→N transitions
  const prevLengths = React.useRef({ today: today.length, soon: soon.length, future: future.length });

  useEffect(() => {
    const prev = prevLengths.current;
    setExpandedGroups(g => {
      const next = { ...g };
      if (today.length === 0)  next.today  = false;
      if (soon.length === 0)   next.soon   = false;
      if (future.length === 0) next.future = false;
      if (today.length > 0  && prev.today  === 0) next.today  = true;
      if (soon.length > 0   && prev.soon   === 0) next.soon   = true;
      if (future.length > 0 && prev.future === 0) next.future = true;
      return next;
    });
    prevLengths.current = { today: today.length, soon: soon.length, future: future.length };
  }, [today.length, soon.length, future.length]);

  const handleAddTask = () => {
    if (!newTitle.trim()) return;
    const hasNextAction = projectTasks.some(t => t.isNextAction && !t.done);
    addTask(newTitle, null, "", project.id, {
      schedule: newSchedule,
      priority: newPriority,
      ...(hasNextAction ? {} : { isNextAction: true }),
    });
    setNewTitle("");
  };

  const toggleGroup = (key) =>
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));

  const clearCompleted = () => {
    completed.forEach(t => deleteTask(t.id));
  };

  return (
    <div className="rounded-2xl bg-card/40 backdrop-blur-xl border border-border shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">

      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border-subtle">
        <Target size={12} className="text-subtle-foreground" />
        <SectionLabel as="h3">
          Execution
        </SectionLabel>
      </div>

      {/* ── Next Move zone ── */}
      <div className="px-5 pt-5 pb-4 border-b border-border">
        {nowTask ? (
          <Menu.Context>
            <Menu.ContextTrigger className="contents">
              <div className="cursor-default select-none group/now">
                <div className="text-xs uppercase tracking-[0.22em] text-subtle-foreground font-bold mb-2.5">
                  Next Move
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex-1 min-w-0 text-base text-foreground font-medium leading-snug truncate">
                    {nowTask.title}
                  </span>
                  <button
                    onClick={() => toggleTask(nowTask.id)}
                    className="w-5 h-5 rounded-full border border-subtle-foreground hover:border-foreground hover:bg-overlay transition-all shrink-0 flex items-center justify-center group/cb opacity-60 group-hover/now:opacity-100"
                    title="Mark complete"
                  >
                    <div className="w-2 h-2 rounded-full bg-transparent group-hover/cb:bg-foreground/60 transition-all" />
                  </button>
                </div>
              </div>
            </Menu.ContextTrigger>

            <Menu.ContextContent>
              <Menu.ContextItem onClick={() => updateTask(nowTask.id, { isNextAction: false })}>
                <X size={12} className="opacity-60" />
                Remove Next Move
              </Menu.ContextItem>
              <Menu.ContextSeparator />
              {nowTask.status !== 'blocked'
                ? <Menu.ContextItem onClick={() => updateTask(nowTask.id, { status: 'blocked' })}><Ban size={12} className="opacity-60" />Mark Blocked</Menu.ContextItem>
                : <Menu.ContextItem onClick={() => updateTask(nowTask.id, { status: null })}>Unblock</Menu.ContextItem>
              }
              <Menu.ContextSeparator />
              <ContextDangerItem onClick={() => deleteTask(nowTask.id)}>
                <X size={12} className="opacity-60" />
                Delete
              </ContextDangerItem>
            </Menu.ContextContent>
          </Menu.Context>
        ) : (
          (today.length > 0 || soon.length > 0 || future.length > 0) && (
            <div className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
              <span className="text-xs text-faint-foreground italic">
                Right-click a task → Set as Next Move
              </span>
            </div>
          )
        )}

        {/* Composer — title, schedule, priority, visible Add button */}
        <div className="flex items-center gap-2 mt-4">
          <Input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddTask()}
            placeholder="Add task…"
            className="flex-1 h-9 text-sm"
          />
          <div className="w-[92px] shrink-0">
            <Select value={newSchedule} onChange={setNewSchedule} options={SCHEDULES} />
          </div>
          <div className="w-[92px] shrink-0">
            <Select value={newPriority} onChange={setNewPriority} options={PRIORITY_OPTIONS_SHORT} />
          </div>
          <button
            onClick={handleAddTask}
            disabled={!newTitle.trim()}
            aria-label="Add task"
            className="shrink-0 h-9 w-9 rounded-full bg-overlay hover:bg-overlay-strong disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* ── Task groups ── */}
      <div className="px-4 py-3 space-y-0.5">

        <Group
          label="Today" count={today.length}
          isOpen={expandedGroups.today}
          onToggle={() => toggleGroup('today')}
          labelClass="text-muted-foreground"
        >
          {today.map(t => (
            <ExecutionRow key={t.id} task={t} project={project}
              onToggle={toggleTask} onUpdate={updateTask} onDelete={deleteTask} onSetNext={setNextAction}
            />
          ))}
        </Group>

        <Group
          label="Soon" count={soon.length}
          isOpen={expandedGroups.soon}
          onToggle={() => toggleGroup('soon')}
          labelClass="text-subtle-foreground"
        >
          {soon.map(t => (
            <ExecutionRow key={t.id} task={t} project={project}
              onToggle={toggleTask} onUpdate={updateTask} onDelete={deleteTask} onSetNext={setNextAction}
            />
          ))}
        </Group>

        <Group
          label="Future" count={future.length}
          isOpen={expandedGroups.future}
          onToggle={() => toggleGroup('future')}
          labelClass="text-faint-foreground"
        >
          {future.map(t => (
            <ExecutionRow key={t.id} task={t} project={project}
              onToggle={toggleTask} onUpdate={updateTask} onDelete={deleteTask} onSetNext={setNextAction}
            />
          ))}
        </Group>

        {blocked.length > 0 && (
          <Group
            label="Blocked" count={blocked.length}
            isOpen={expandedGroups.blocked}
            onToggle={() => toggleGroup('blocked')}
            labelClass="text-destructive/60"
          >
            {blocked.map(t => (
              <ExecutionRow key={t.id} task={t} project={project} variant="blocked"
                onToggle={toggleTask} onUpdate={updateTask} onDelete={deleteTask} onSetNext={setNextAction}
              />
            ))}
          </Group>
        )}

        <Group
          label="Done" count={completed.length}
          isOpen={expandedGroups.done}
          onToggle={() => toggleGroup('done')}
          labelClass="text-faint-foreground"
          action={completed.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmClear(true); }}
              className="text-xs text-faint-foreground hover:text-muted-foreground transition-colors px-2 shrink-0"
            >
              Clear completed
            </button>
          )}
        >
          {completed.map(t => (
            <ExecutionRow key={t.id} task={t} project={project} variant="done"
              onToggle={toggleTask} onUpdate={updateTask} onDelete={deleteTask} onSetNext={setNextAction}
            />
          ))}
        </Group>

      </div>

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={clearCompleted}
        title="Clear completed tasks?"
        description={`This removes ${completed.length} completed task${completed.length === 1 ? '' : 's'}. This can't be undone.`}
        confirmLabel="Clear"
      />
    </div>
  );
}

/* ── Collapsible section ── */
function Group({ label, count, isOpen, onToggle, labelClass = "text-subtle-foreground", action, children }) {
  return (
    <div>
      <div className="flex items-center gap-1">
        <button
          onClick={onToggle}
          className="flex items-center gap-1.5 flex-1 py-1.5 px-2 text-left hover:bg-overlay-subtle rounded-lg transition-colors group/grp"
        >
          {isOpen
            ? <ChevronDown size={11} className="text-faint-foreground group-hover/grp:text-muted-foreground transition-colors" />
            : <ChevronRight size={11} className="text-faint-foreground group-hover/grp:text-muted-foreground transition-colors" />
          }
          <span className={cn("text-xs uppercase tracking-[0.15em] font-bold", labelClass)}>
            {label}
          </span>
          {count > 0 && (
            <span className="text-xs text-faint-foreground ml-0.5">{count}</span>
          )}
        </button>
        {action}
      </div>

      {isOpen && React.Children.count(children) > 0 && (
        <div className="mt-0.5 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
          {children}
        </div>
      )}
    </div>
  );
}

/* ── Task row — left-click opens an inline edit popover, right-click opens the action menu ── */
function ExecutionRow({ task, project, variant, onToggle, onUpdate, onDelete, onSetNext }) {
  const [open, setOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState(task.title);

  useEffect(() => {
    if (open) setDraftTitle(task.title);
  }, [open, task.title]);

  const isDone    = variant === 'done';
  const isBlocked = variant === 'blocked';
  const schedule  = task.schedule || 'today';
  const priority  = task.priority || 'p3';

  const commitTitle = () => {
    const trimmed = draftTitle.trim();
    if (trimmed && trimmed !== task.title) onUpdate(task.id, { title: trimmed });
  };

  return (
    <Menu.Context>
      <Menu.ContextTrigger className="contents">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            nativeButton={false}
            render={
              <div
                className="group flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-overlay-subtle transition-colors cursor-pointer select-none"
                onClick={(e) => { if (e.target.closest('button')) e.preventDefault(); }}
              />
            }
          >
            <PriorityCheckbox
              checked={isDone}
              priority={priority}
              onChange={() => onToggle(task.id)}
              aria-label={isDone ? "Mark as not done" : "Mark as done"}
            />
            <span className={cn(
              "flex-1 min-w-0 text-sm truncate transition-colors",
              isDone    ? "text-faint-foreground line-through"
              : isBlocked ? "text-muted-foreground"
              : "text-muted-foreground group-hover:text-foreground"
            )}>
              {task.title}
            </span>
            {isBlocked && <Ban size={11} className="text-destructive/50 shrink-0" />}
            {task.due && !isDone && (
              <span className="text-xs text-subtle-foreground shrink-0">
                {new Date(task.due).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            )}
          </PopoverTrigger>

          <PopoverContent align="start" className="w-72 p-4">
            <div className="space-y-3">
              <Input
                value={draftTitle}
                onChange={e => setDraftTitle(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={e => {
                  if (e.key === 'Enter') { commitTitle(); setOpen(false); }
                }}
                className="text-sm font-medium"
                aria-label="Task title"
              />
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Select value={schedule} onChange={(v) => onUpdate(task.id, { schedule: v })} options={SCHEDULES} />
                </div>
                <div className="flex-1">
                  <Select value={priority} onChange={(v) => onUpdate(task.id, { priority: v })} options={PRIORITY_OPTIONS_SHORT} />
                </div>
              </div>
              {/* The row has always rendered task.due; until now nothing in
                  Opus could set it. */}
              <DateTimeField
                dateOnly
                label="Due"
                value={task.due || ""}
                onChange={(v) => onUpdate(task.id, { due: v })}
              />
            </div>
          </PopoverContent>
        </Popover>
      </Menu.ContextTrigger>

      <Menu.ContextContent>
        {!isDone && !task.isNextAction && (
          <Menu.ContextItem onClick={() => onSetNext(task.id, project.id)}>
            <Target size={12} className="opacity-60" />
            Set as Next Move
          </Menu.ContextItem>
        )}
        {task.isNextAction && (
          <Menu.ContextItem onClick={() => onUpdate(task.id, { isNextAction: false })}>
            <X size={12} className="opacity-60" />
            Remove Next Move
          </Menu.ContextItem>
        )}

        {!isDone && (
          <>
            <Menu.ContextSeparator />
            {schedule !== 'today' && (
              <Menu.ContextItem onClick={() => onUpdate(task.id, { schedule: 'today' })}>
                <Calendar size={12} className="opacity-60" />
                Move to Today
              </Menu.ContextItem>
            )}
            {schedule !== 'soon' && (
              <Menu.ContextItem onClick={() => onUpdate(task.id, { schedule: 'soon' })}>
                <Clock size={12} className="opacity-60" />
                Move to Soon
              </Menu.ContextItem>
            )}
            {schedule !== 'future' && (
              <Menu.ContextItem onClick={() => onUpdate(task.id, { schedule: 'future' })}>
                <Layers size={12} className="opacity-60" />
                Move to Future
              </Menu.ContextItem>
            )}
          </>
        )}

        {!isDone && (
          <>
            <Menu.ContextSeparator />
            {!isBlocked
              ? <Menu.ContextItem onClick={() => onUpdate(task.id, { status: 'blocked' })}><Ban size={12} className="opacity-60" />Mark Blocked</Menu.ContextItem>
              : <Menu.ContextItem onClick={() => onUpdate(task.id, { status: null })}>Unblock</Menu.ContextItem>
            }
          </>
        )}

        <Menu.ContextSeparator />
        <ContextDangerItem onClick={() => onDelete(task.id)}>
          <X size={12} className="opacity-60" />
          Delete
        </ContextDangerItem>
      </Menu.ContextContent>
    </Menu.Context>
  );
}
