import React, { useState } from 'react';
import { PlusSignSquare as Plus, CancelSquare as X, CheckmarkSquare02 as CheckSquare, Circle as Square, Target02 as Target } from "../../../components/ui/CustomIcon.jsx";
import { SectionCard } from "../../../components/composed/SectionCard";
import MilestonesList from "./MilestonesList";
import { uid } from "../../../lib/ids";

/**
 * ProjectBrief — what this project is for.
 *
 * Was ProjectContext: a collapsed-by-default accordion pinned to the bottom of
 * the page, which meant the project's purpose and its definition of done were
 * the two things you could never see. It now renders expanded in the band
 * directly under the title, and hosts milestones alongside success criteria.
 */
export default function ProjectBrief({ project, updateProject }) {
    const [newCriteria, setNewCriteria] = useState("");

    const addCriteria = () => {
        const text = newCriteria.trim();
        if (!text) return;
        updateProject(project.id, {
            successCriteria: [...(project.successCriteria || []), { id: uid(), text, done: false }]
        });
        setNewCriteria("");
    };

    const toggleCriteria = (id) => {
        updateProject(project.id, {
            successCriteria: (project.successCriteria || []).map(c =>
                c.id === id ? { ...c, done: !c.done } : c
            )
        });
    };

    const removeCriteria = (id) => {
        updateProject(project.id, {
            successCriteria: (project.successCriteria || []).filter(c => c.id !== id)
        });
    };

    return (
        <SectionCard
            icon={Target}
            title="Brief"
            bodyClassName="p-6 space-y-6"
        >
            {/* Strategic Directive */}
            <div>
                <label className="text-xs uppercase tracking-wider text-subtle-foreground font-bold mb-2 block" htmlFor={`directive-${project.id}`}>
                    Strategic Directive
                </label>
                <textarea
                    id={`directive-${project.id}`}
                    value={project.description || ""}
                    onChange={e => updateProject(project.id, { description: e.target.value })}
                    className="w-full min-h-[64px] text-sm font-light leading-relaxed bg-transparent border-none p-0 focus:ring-0 outline-hidden resize-none placeholder:text-secondary placeholder:italic text-foreground/90"
                    placeholder="Define the core objective and desired outcome..."
                />
            </div>

            {/* Success Criteria */}
            <div className="pt-4 border-t border-border-subtle">
                <label className="text-xs uppercase tracking-wider text-subtle-foreground font-bold mb-3 block">
                    Success Criteria
                </label>
                <div className="space-y-2 mb-3">
                    {(project.successCriteria || []).map(c => (
                        <div key={c.id} className="flex items-start gap-3 group/item">
                            <button
                                onClick={() => toggleCriteria(c.id)}
                                aria-label={c.done ? `Mark "${c.text}" incomplete` : `Mark "${c.text}" complete`}
                                className={`mt-0.5 ${c.done ? "text-success" : "text-subtle-foreground hover:text-muted-foreground"} transition-colors`}
                            >
                                {c.done ? <CheckSquare size={16} /> : <Square size={16} />}
                            </button>
                            <span className={`text-sm flex-1 leading-relaxed ${c.done ? "text-subtle-foreground line-through" : "text-foreground-secondary"}`}>
                                {c.text}
                            </span>
                            <button
                                onClick={() => removeCriteria(c.id)}
                                aria-label={`Remove criteria "${c.text}"`}
                                className="opacity-0 group-hover/item:opacity-100 text-subtle-foreground hover:text-destructive transition-opacity"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <Plus size={14} className="text-subtle-foreground" />
                    <input
                        value={newCriteria}
                        onChange={e => setNewCriteria(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addCriteria()}
                        placeholder="Add success criteria..."
                        aria-label="Add success criteria"
                        className="bg-transparent text-sm text-foreground-secondary placeholder:text-faint-foreground outline-hidden flex-1"
                    />
                </div>
            </div>

            {/* Milestones */}
            <div className="pt-4 border-t border-border-subtle">
                <MilestonesList project={project} updateProject={updateProject} />
            </div>
        </SectionCard>
    );
}
