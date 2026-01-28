import React from "react";

export default function Sidebar({ current, setCurrent, onNewNote }) {
  return (
    <aside className="h-full flex flex-col bg-black/95 border-r border-zinc-900">
      {/* pages */}
      <nav className="flex flex-col gap-7 px-5 pt-5">
        <NavItem id="overview" label="Notes"    active={current === "overview"} onClick={setCurrent} />
        <NavItem id="projects" label="Projects" active={current === "projects"} onClick={setCurrent} />
        <NavItem id="canvas"   label="Canvas"   active={current === "canvas"}   onClick={setCurrent} />
        <NavItem id="graph"    label="Graph"    active={current === "graph"}    onClick={setCurrent} />
      </nav>

      <div className="flex-1" />

      {/* New Note — solid white, sharp edges, centered text */}
      <button
        onClick={onNewNote}
        className="mx-5 mb-5 w-[calc(100%-2.5rem)] px-4 py-3 bg-white text-black text-center font-medium"
      >
        + New Note
      </button>
    </aside>
  );
}

function NavItem({ id, label, active, onClick }) {
  return (
    <button
      onClick={() => onClick(id)}
      aria-current={active ? "page" : undefined}
      className={[
        "group w-full flex items-center gap-3 text-left select-none",
        "font-mono text-lg tracking-wide",
        active ? "text-zinc-100" : "text-zinc-400 hover:text-zinc-100",
      ].join(" ")}
    >
      <span>{label}</span>

      {/* dot on the RIGHT of the text */}
      <span
        aria-hidden
        className={[
          "ml-2 inline-block w-1.5 h-1.5 rounded-full transition-opacity duration-150",
          active ? "opacity-100 bg-white" : "opacity-0 group-hover:opacity-70 bg-zinc-500",
        ].join(" ")}
      />
    </button>
  );
}
