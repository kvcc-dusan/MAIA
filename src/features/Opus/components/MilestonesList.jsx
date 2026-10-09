import React, { useMemo, useState } from 'react';
import { PlusSignSquare as Plus, CancelSquare as X, CheckmarkSquare02 as CheckSquare, Circle as Square } from "../../../components/ui/CustomIcon.jsx";
import { DateTimeField } from "../../../components/composed/DateTimeField";
import { uid } from "../../../lib/ids";
import { byDate, formatMilestoneDate } from "../milestones";
import { cn } from "@/lib/utils";

/**
 * Milestones — dated checkpoints.
 *
 * `project.milestones` ({id, title, date, done}) has been written by every
 * project-creation path since the schema was defined and read by nothing; this
 * is the surface that activates it. It deliberately mirrors the success-criteria
 * list it sits under — the two are the same kind of thing, one untimed and one
 * dated — so they read as a pair rather than two unrelated widgets.
 */

export default function MilestonesList({ project, updateProject }) {
    const [newTitle, setNewTitle] = useState("");

    const milestones = useMemo(
        () => [...(project.milestones || [])].sort(byDate),
        [project.milestones]
    );

    const write = (next) => updateProject(project.id, { milestones: next });

    const addMilestone = () => {
        const title = newTitle.trim();
        if (!title) return;
        write([...(project.milestones || []), { id: uid(), title, date: null, done: false }]);
        setNewTitle("");
    };

    const patchMilestone = (id, patch) =>
        write((project.milestones || []).map(m => (m.id === id ? { ...m, ...patch } : m)));

    const removeMilestone = (id) =>
        write((project.milestones || []).filter(m => m.id !== id));

    return (
        <div>
            <label className="text-xs uppercase tracking-wider text-subtle-foreground font-bold mb-3 block">
                Milestones
            </label>

            <div className="space-y-2 mb-3">
                {milestones.map(m => (
                    <MilestoneRow
                        key={m.id}
                        milestone={m}
                        onToggle={() => patchMilestone(m.id, { done: !m.done })}
                        onSetDate={date => patchMilestone(m.id, { date })}
                        onRemove={() => removeMilestone(m.id)}
                    />
                ))}
            </div>

            <div className="flex items-center gap-2">
                <Plus size={14} className="text-subtle-foreground" />
                <input
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addMilestone()}
                    placeholder="Add milestone..."
                    aria-label="Add milestone"
                    className="bg-transparent text-sm text-foreground-secondary placeholder:text-faint-foreground outline-hidden flex-1"
                />
            </div>
        </div>
    );
}

function MilestoneRow({ milestone, onToggle, onSetDate, onRemove }) {
    const [isEditingDate, setIsEditingDate] = useState(false);
    const isOverdue = !milestone.done && milestone.date && new Date(milestone.date) < new Date();

    return (
        <div className="flex items-start gap-3 group/item">
            <button
                onClick={onToggle}
                aria-label={milestone.done ? `Mark "${milestone.title}" incomplete` : `Mark "${milestone.title}" complete`}
                className={cn(
                    "mt-0.5 transition-colors",
                    milestone.done ? "text-success" : "text-subtle-foreground hover:text-muted-foreground"
                )}
            >
                {milestone.done ? <CheckSquare size={16} /> : <Square size={16} />}
            </button>

            <div className="flex-1 min-w-0">
                <span className={cn(
                    "text-sm leading-relaxed block truncate",
                    milestone.done ? "text-subtle-foreground line-through" : "text-foreground-secondary"
                )}>
                    {milestone.title}
                </span>

                {isEditingDate ? (
                    <div className="mt-1.5 max-w-[220px]">
                        <DateTimeField
                            dateOnly
                            value={milestone.date || ""}
                            onChange={value => { onSetDate(value); setIsEditingDate(false); }}
                        />
                    </div>
                ) : (
                    <button
                        onClick={() => setIsEditingDate(true)}
                        className={cn(
                            "text-xs transition-colors hover:text-foreground-secondary",
                            isOverdue ? "text-destructive" : "text-faint-foreground"
                        )}
                    >
                        {milestone.date ? formatMilestoneDate(milestone.date) : "Set date"}
                    </button>
                )}
            </div>

            <button
                onClick={onRemove}
                aria-label={`Remove milestone "${milestone.title}"`}
                className="opacity-0 group-hover/item:opacity-100 text-subtle-foreground hover:text-destructive transition-opacity"
            >
                <X size={14} />
            </button>
        </div>
    );
}
