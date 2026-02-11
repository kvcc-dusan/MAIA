import React, { useEffect, useState } from 'react';
import { useData } from "../../context/DataContext";
import ProjectIdentity from "./components/ProjectIdentity";
import StrategicDirective from "./components/StrategicDirective";
import ActivityGrid from "./components/ActivityGrid";
import ActivityPanel from "./components/ActivityPanel";
import KnowledgePanel from "./components/KnowledgePanel";
import ResourcesPanel from "./components/ResourcesPanel";
import TimelinePanel from "./components/TimelinePanel";

/**
 * OPUS: The Project Command Center
 * 
 * Layout Strategy:
 * - Header: Identity
 * - Grid: 12 cols
 *   - Left (8 cols): Strategy & Execution
 *   - Right (4 cols): Context & Knowledge
 */
export default function OpusLayout({ projectId, selectNote, onDeleteProject }) {
    const { projects, updateProject } = useData();

    const project = projects.find(p => p.id === projectId);

    if (!project) return null;

    return (
        <div className="w-full max-w-[1600px] mx-auto p-6 md:p-8 flex flex-col gap-6 pb-24 bg-transparent min-h-screen">

            {/* HEADER ZONE: Identity & Vitality */}
            <ProjectIdentity
                project={project}
                updateProject={updateProject}
                onDelete={onDeleteProject}
            />

            {/* ZONE 1: Momentum & Strategy (Aligned with Zone 2) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                {/* Activity Grid (Aligned with Execution) */}
                <div className="lg:col-span-7">
                    <ActivityGrid project={project} />
                </div>

                {/* Strategic Directive (Aligned with Intel) */}
                <div className="lg:col-span-5">
                    <StrategicDirective project={project} updateProject={updateProject} />
                </div>
            </div>

            {/* ZONE 2: The Workbench (Main Grid) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">

                {/* LEFT COLUMN: Execution (Primary Action Surface) */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                    {/* Activity (Tasks & Sessions) */}
                    <ActivityPanel project={project} />

                    {/* Timeline */}
                    <TimelinePanel project={project} />
                </div>

                {/* RIGHT COLUMN: Context & Resources (Support) */}
                <div className="lg:col-span-5 flex flex-col gap-6 sticky top-6">

                    {/* Intel (Notes) */}
                    <KnowledgePanel project={project} selectNote={selectNote} />

                    {/* Resources (Links) */}
                    <ResourcesPanel project={project} updateProject={updateProject} />
                </div>

            </div>
        </div>
    );
}
