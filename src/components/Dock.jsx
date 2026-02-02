import React from "react";
import ProjectIcon from "./ProjectIcon.jsx";
import GlassSurface from "./GlassSurface.jsx";

export default function Dock({ currentPage, onNavigate, onOpenTool }) {
    const DockItem = ({ id, label, icon, active, onClick }) => (
        <button
            onClick={onClick}
            className={`
        group relative flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 ease-out
        ${active ? "bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)] scale-110" : "hover:bg-white/5 hover:scale-110 hover:-translate-y-1"}
      `}
            title={label}
            aria-label={label}
        >
            <span className="text-xl opacity-80 group-hover:opacity-100 transition-opacity">{icon}</span>
            {/* Active Dot */}
            {active && (
                <span className="absolute -bottom-2 w-1 h-1 rounded-full bg-white/50" />
            )}
        </button>
    );

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <GlassSurface className="rounded-2xl">
                <div className="px-4 py-3 flex items-center gap-2">
                    {/* APPS */}
                    <DockItem
                        id="home"
                        label="Home"
                        icon={<ProjectIcon name="personal" size={20} />}
                        active={currentPage === "home"}
                        onClick={() => onNavigate("home")}
                    />
                    <DockItem
                        id="projects"
                        label="Opus"
                        icon={<ProjectIcon name="work" size={20} />}
                        active={currentPage === "projects"}
                        onClick={() => onNavigate("projects")}
                    />
                    <DockItem
                        id="overview"
                        label="Codex"
                        icon={<ProjectIcon name="writing" size={20} />}
                        active={currentPage === "overview"}
                        onClick={() => onNavigate("overview")}
                    />
                    <DockItem
                        id="graph"
                        label="Connexa"
                        icon={<ProjectIcon name="design" size={20} />}
                        active={currentPage === "graph"}
                        onClick={() => onNavigate("graph")}
                    />
                    <DockItem
                        id="journal"
                        label="Journal"
                        icon={<ProjectIcon name="writing" size={20} />}
                        active={currentPage === "journal"}
                        onClick={() => onNavigate("journal")}
                    />


                    {/* DIVIDER */}
                    <div className="w-[1px] h-8 bg-white/10 mx-2" />

                    {/* TOOLS */}
                    <DockItem
                        id="chronos"
                        label="Chronos"
                        icon={<ProjectIcon name="star" size={20} />}
                        active={false} // Tool, not a page
                        onClick={() => onOpenTool("chronos")}
                    />
                    <DockItem
                        id="ledger"
                        label="Ledger"
                        icon={<ProjectIcon name="flag" size={20} />}
                        active={false}
                        onClick={() => onOpenTool("ledger")}
                    />
                    <DockItem
                        id="search"
                        label="Search"
                        icon={<ProjectIcon name="research" size={20} />}
                        active={false}
                        onClick={() => onOpenTool("search")}
                    />
                </div>
            </GlassSurface>
        </div>
    );
}
