import React from 'react';
import { useData } from "../../context/DataContext";
import ProjectIdentity from "./components/ProjectIdentity";
import ProjectBrief from "./components/ProjectBrief";
import ExecutionPanel from "./components/ExecutionPanel";
import KnowledgePanel from "./components/KnowledgePanel";
import AssetsPanel from "./components/AssetsPanel";
import ResourcesPanel from "./components/ResourcesPanel";

/**
 * OPUS: The Project Command Center
 *
 * Bands, in the order you need them:
 *
 * HEADER    ProjectIdentity — title, with vitality/activity/counts as one meta line
 * BRIEF     ProjectBrief | ResourcesPanel — what this is for, and where things live
 * EXECUTION ExecutionPanel — Now + Backlog + Blocked + Completed
 * LIBRARY   KnowledgePanel | AssetsPanel — notes and files
 *
 * The previous order buried the brief (collapsed, last) and the uplinks under
 * the task list, so every quick-access surface sat below the fold.
 */
export default function OpusLayout({ projectId, selectNote }) {
    const { projects, updateProject } = useData();

    const project = projects.find(p => p.id === projectId);

    if (!project) return null;

    return (
        <div className="w-full px-page py-8 flex flex-col gap-6 bg-transparent min-h-screen" style={{ paddingBottom: 'calc(var(--dock-h) + 2rem)' }}>

            {/* HEADER */}
            <ProjectIdentity
                project={project}
                updateProject={updateProject}
            />

            {/* BRIEF — purpose and quick access, above the fold */}
            {/* 3:2 rather than 2:1 — at laptop widths a third of the row left
                the uplink column too narrow to read a link's label. */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                <div className="lg:col-span-3">
                    <ProjectBrief project={project} updateProject={updateProject} />
                </div>
                <div className="lg:col-span-2">
                    <ResourcesPanel project={project} updateProject={updateProject} />
                </div>
            </div>

            {/* EXECUTION */}
            <ExecutionPanel project={project} />

            {/* LIBRARY — notes and files */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                <KnowledgePanel project={project} selectNote={selectNote} />
                <AssetsPanel project={project} />
            </div>
        </div>
    );
}
