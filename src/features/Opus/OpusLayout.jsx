import React from 'react';
import { useData } from "../../context/DataContext";
import ProjectIdentity from "./components/ProjectIdentity";
import ExecutionPanel from "./components/ExecutionPanel";
import KnowledgePanel from "./components/KnowledgePanel";
import AssetsPanel from "./components/AssetsPanel";
import ResourcesPanel from "./components/ResourcesPanel";
import ProjectContext from "./components/ProjectContext";

/**
 * OPUS: The Project Command Center
 * 
 * Architecture: Hierarchical Layers (top to bottom)
 * 
 * HEADER:  ProjectIdentity — name, icon, vitality, activity summary
 * LAYER 1: ExecutionPanel   — Now + Backlog + Blocked + Completed (unified)
 * LAYER 2: Resources        — Intel | Assets | Uplinks (3-col grid)
 * LAYER 3: ProjectContext   — Collapsed directive + metadata
 */
export default function OpusLayout({ projectId, selectNote, onDeleteProject }) {
    const { projects, updateProject } = useData();

    const project = projects.find(p => p.id === projectId);

    if (!project) return null;

    return (
        <div className="w-full px-fluid-page py-8 flex flex-col gap-6 bg-transparent min-h-screen" style={{ paddingBottom: 'calc(var(--dock-h) + 2rem)' }}>

            {/* HEADER: Identity & Activity Summary */}
            <ProjectIdentity
                project={project}
                updateProject={updateProject}
            />

            {/* LAYER 1: EXECUTION — Now + Backlog + Blocked + Completed */}
            <ExecutionPanel project={project} />

            {/* LAYER 2: RESOURCES — Intel | Assets | Uplinks */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                <KnowledgePanel project={project} selectNote={selectNote} />
                <AssetsPanel project={project} />
                <ResourcesPanel project={project} updateProject={updateProject} />
            </div>

            {/* LAYER 3: CONTEXT — Collapsed directive + metadata */}
            <ProjectContext project={project} updateProject={updateProject} />
        </div>
    );
}
