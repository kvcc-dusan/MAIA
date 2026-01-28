// @maia:projects
import React, { useEffect, useMemo, useState } from "react";
import GraphView from "./GraphView.jsx";

/* -----------------------------------------
   Helpers
----------------------------------------- */
const uid = () => Math.random().toString(36).slice(2, 9);

const withDefaults = (p) => ({
  id: p.id ?? uid(),
  name: p.name ?? "Untitled",
  emoji: p.emoji ?? "📁",
  color: p.color ?? null,
  status: p.status ?? "Active", // Active | Paused | Done
  description: p.description ?? "",
  createdAt: p.createdAt ?? new Date().toISOString(),
  dueAt: p.dueAt ?? null,
  milestones: p.milestones ?? [], // {id, name, dueAt, status}
  decisions: p.decisions ?? [],   // {id, date, title, noteId}
  links: p.links ?? [],           // {id, title, url}
});

const normalize = (s) => (s || "").trim().toLowerCase();

const countTasksInMarkdown = (md = "") => {
  const open = (md.match(/(^|\n)[\s*-]+ \[ \]/g) || []).length;
  const done = (md.match(/(^|\n)[\s*-]+ \[[xX]\]/g) || []).length;
  return { open, done };
};

// Does note belong to a project (by id or legacy name)?
function noteBelongsToProject(note, project) {
  const ids = note.projectIds || [];
  if (project?.id && ids.includes(project.id)) return true;
  if (note.project && project?.name && normalize(note.project) === normalize(project.name)) {
    return true; // legacy string membership
  }
  return false;
}

function addProjectToNote(note, project) {
  const ids = Array.from(new Set([...(note.projectIds || []), project.id]));
  // keep legacy 'project' untouched; migration can clean this later
  return { ...note, projectIds: ids };
}

function removeProjectFromNote(note, project) {
  const ids = (note.projectIds || []).filter((id) => id !== project.id);
  let legacy = note.project;
  // If legacy string equals this project, clear it (optional cleanup)
  if (legacy && normalize(legacy) === normalize(project.name)) legacy = null;
  return { ...note, projectIds: ids, project: legacy };
}

/* -----------------------------------------
   Component
----------------------------------------- */
export default function Projects({
  notes,
  projects,
  setProjects,
  setNotes,           // ⬅️ pass from App to enable add/remove membership
  selectNote,
  pushToast,          // optional
}) {
  const toast = (msg) => (typeof pushToast === "function" ? pushToast(msg) : void 0);

  // Normalize projects so all fields exist (and persist normalization once)
  const normalizedProjects = useMemo(() => projects.map(withDefaults), [projects]);
  useEffect(() => {
    if (!projects.length) return;
    // If any project is missing defaults, write back once
    const needs = projects.some((p, i) => JSON.stringify(withDefaults(p)) !== JSON.stringify(normalizedProjects[i]));
    if (needs) setProjects(normalizedProjects);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedProjects]);

  // Active project (by name so legacy notes still show)
  const [activeName, setActiveName] = useState(normalizedProjects[0]?.name || null);
  useEffect(() => {
    if (!activeName && normalizedProjects[0]) setActiveName(normalizedProjects[0].name);
  }, [normalizedProjects, activeName]);

  const activeProject = useMemo(
    () => normalizedProjects.find((p) => p.name === activeName) || null,
    [normalizedProjects, activeName]
  );

  /* -----------------------------------------
     Project CRUD
  ----------------------------------------- */
  const upsertProject = (patch) => {
    setProjects((prev) => {
      const arr = prev.map(withDefaults);
      const idx = arr.findIndex((p) => p.id === (patch.id ?? activeProject?.id));
      if (idx === -1) return [withDefaults(patch), ...arr];
      const next = [...arr];
      next[idx] = withDefaults({ ...next[idx], ...patch });
      return next;
    });
  };

  const createProject = () => {
    const name = window.prompt("Project name?");
    if (!name) return;
    const exists = projects.some((p) => normalize(p.name) === normalize(name));
    if (exists) {
      setActiveName(name.trim());
      return;
    }
    const proj = withDefaults({ name: name.trim() });
    setProjects([proj, ...projects]);
    setActiveName(proj.name);
  };

  const deleteProject = (id) => {
    const proj = normalizedProjects.find((p) => p.id === id);
    if (!proj) return;
    const hasNotes = notes.some((n) => noteBelongsToProject(n, proj));
    const ok = window.confirm(
      hasNotes
        ? `This project has notes linked to "${proj.name}". Deleting the project won't delete notes, but their membership by ID will be removed.\n\nDelete project anyway?`
        : `Delete project "${proj.name}"?`
    );
    if (!ok) return;
    // Remove membership by ID from notes as cleanup (if setNotes exists)
    if (setNotes) {
      setNotes((prev) =>
        prev.map((n) => {
          if (!noteBelongsToProject(n, proj)) return n;
          return removeProjectFromNote(n, proj);
        })
      );
    }
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (activeName === proj.name) setActiveName(null);
    toast?.("Project deleted");
  };

  /* -----------------------------------------
     Scoped data & stats
  ----------------------------------------- */
  const scopedNotes = useMemo(() => {
    if (!activeProject) return [];
    return notes.filter((n) => noteBelongsToProject(n, activeProject));
  }, [notes, activeProject]);

  const taskStats = useMemo(() => {
    let open = 0, done = 0;
    for (const n of scopedNotes) {
      const c = countTasksInMarkdown(n.content || "");
      open += c.open;
      done += c.done;
    }
    return { open, done, total: open + done };
  }, [scopedNotes]);

  const nextMilestone = useMemo(() => {
    if (!activeProject || !activeProject.milestones?.length) return null;
    const upcoming = activeProject.milestones
      .filter((m) => m.dueAt)
      .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
    return upcoming[0] || null;
  }, [activeProject]);

  /* -----------------------------------------
     Add existing notes modal
  ----------------------------------------- */
  const [showAddModal, setShowAddModal] = useState(false);
  const [noteQuery, setNoteQuery] = useState("");
  const [selected, setSelected] = useState(() => new Set());

  const candidates = useMemo(() => {
    if (!activeProject) return [];
    const notInProject = notes.filter((n) => !noteBelongsToProject(n, activeProject));
    if (!noteQuery.trim()) return notInProject;
    const q = normalize(noteQuery);
    return notInProject.filter(
      (n) =>
        normalize(n.title).includes(q) ||
        (n.tags || []).some((t) => normalize(t).includes(q))
    );
  }, [notes, activeProject, noteQuery]);

  const togglePick = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const addSelectedNotes = () => {
    if (!activeProject) return;
    if (!setNotes) {
      window.alert("setNotes was not provided. Please pass setNotes from App to enable adding notes to a project.");
      return;
    }
    const ids = Array.from(selected);
    if (!ids.length) return;
    setNotes((prev) =>
      prev.map((n) => (ids.includes(n.id) ? addProjectToNote(n, activeProject) : n))
    );
    setShowAddModal(false);
    setSelected(new Set());
    setNoteQuery("");
    toast?.(`Added ${ids.length} note(s) to ${activeProject.name}`);
  };

  const removeFromProject = (noteId) => {
    if (!activeProject || !setNotes) return;
    setNotes((prev) => prev.map((n) => (n.id === noteId ? removeProjectFromNote(n, activeProject) : n)));
    toast?.(`Removed from ${activeProject.name}`);
  };

  /* -----------------------------------------
     UI
  ----------------------------------------- */
  return (
    <div className="h-full grid min-h-0" style={{ gridTemplateRows: "2.75rem minmax(0,1fr)" }}>
      {/* Top bar: New + Tabs */}
      <div className="border-b border-zinc-800 px-3 flex items-center gap-2 overflow-x-auto">
        <button
          onClick={createProject}
          className="px-3 py-1.5 text-xs rounded-md border border-zinc-800/70 hover:bg-zinc-900/60"
        >
          + New Project
        </button>

        <div className="flex gap-1">
          {normalizedProjects.map((p) => (
            <button
              key={p.id}
              onClick={() => setActiveName(p.name)}
              className={`px-3 py-1.5 rounded-md border ${
                activeName === p.name
                  ? "border-zinc-300 text-zinc-100"
                  : "border-zinc-800/70 text-zinc-400 hover:bg-zinc-900/60"
              }`}
              title={p.description || p.name}
            >
              <span className="mr-1">{p.emoji}</span>
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="overflow-auto p-4 space-y-4">
        {!activeProject ? (
          <div className="text-zinc-500 text-sm">No projects yet. Create one to get started.</div>
        ) : (
          <>
            {/* Project header card */}
            <div className="rounded-xl border border-zinc-800/70 bg-black/40 p-3">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  className="text-2xl"
                  title="Change emoji"
                  onClick={() => {
                    const e = window.prompt("Project emoji?", activeProject.emoji || "📁");
                    if (e) upsertProject({ id: activeProject.id, emoji: e });
                  }}
                >
                  {activeProject.emoji}
                </button>
                <div className="text-xl font-semibold text-zinc-100">{activeProject.name}</div>

                <select
                  className="ml-2 px-2 py-1 text-xs bg-transparent rounded-md border border-zinc-800/70 text-zinc-300"
                  value={activeProject.status}
                  onChange={(e) => upsertProject({ id: activeProject.id, status: e.target.value })}
                >
                  <option>Active</option>
                  <option>Paused</option>
                  <option>Done</option>
                </select>

                <input
                  type="date"
                  className="px-2 py-1 text-xs bg-transparent rounded-md border border-zinc-800/70 text-zinc-300"
                  value={activeProject.dueAt ? activeProject.dueAt.slice(0, 10) : ""}
                  onChange={(e) =>
                    upsertProject({
                      id: activeProject.id,
                      dueAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                    })
                  }
                />

                <button
                  className="ml-auto text-xs text-red-400 border border-red-700/50 px-2 py-1 rounded-md hover:bg-red-950/30"
                  onClick={() => deleteProject(activeProject.id)}
                >
                  Delete
                </button>
              </div>

              {/* Description */}
              <div className="mt-3">
                <textarea
                  rows={2}
                  className="w-full bg-transparent rounded-md border border-zinc-800/70 p-2 text-sm text-zinc-300"
                  placeholder="Short project description / goal…"
                  value={activeProject.description || ""}
                  onChange={(e) => upsertProject({ id: activeProject.id, description: e.target.value })}
                />
              </div>
            </div>

            {/* Overview tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <InfoTile label="Notes" value={scopedNotes.length} />
              <InfoTile label="Open tasks" value={taskStats.open} />
              <InfoTile label="Done tasks" value={taskStats.done} />
              <InfoTile
                label="Next milestone"
                value={
                  nextMilestone
                    ? `${nextMilestone.name} — ${new Date(nextMilestone.dueAt).toLocaleDateString()}`
                    : "—"
                }
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {/* Left (2 cols): Backlog preview + Notes */}
              <div className="xl:col-span-2 grid grid-cols-1 gap-4">
                {/* Backlog (counts per note) */}
                <section className="rounded-xl border border-zinc-800/70 bg-black/40 p-3">
                  <SectionHeader title="Backlog (from note checkboxes)" />
                  <div className="text-xs text-zinc-500 mb-2">
                    Parsed from <code>- [ ]</code> and <code>- [x]</code> in notes of this project.
                  </div>
                  <div className="space-y-2">
                    {scopedNotes.map((n) => {
                      const { open, done } = countTasksInMarkdown(n.content || "");
                      return (
                        <div key={n.id} className="flex items-center justify-between">
                          <button className="text-zinc-200 hover:underline" onClick={() => selectNote(n.id)}>
                            {n.title || "Untitled"}
                          </button>
                          <div className="text-xs text-zinc-400">
                            {open} open · {done} done
                          </div>
                        </div>
                      );
                    })}
                    {!scopedNotes.length && (
                      <div className="text-sm text-zinc-500">No notes in this project yet.</div>
                    )}
                  </div>
                </section>

                {/* Notes (scoped) */}
                <section className="rounded-xl border border-zinc-800/70 bg-black/40 p-3">
                  <div className="flex items-center justify-between">
                    <SectionHeader title="Notes" bare />
                    <button
                      className="px-2 py-1 text-xs rounded-md border border-zinc-800/70 hover:bg-zinc-900/60"
                      onClick={() => setShowAddModal(true)}
                    >
                      + Add existing notes
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    {scopedNotes.map((n) => (
                      <div
                        key={n.id}
                        className="rounded-lg border border-zinc-800/70 p-3 bg-zinc-950/40"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            onClick={() => selectNote(n.id)}
                            className="text-left text-base font-semibold text-zinc-100 truncate hover:underline"
                          >
                            {n.title || "Untitled"}
                          </button>
                          <button
                            className="text-[11px] text-zinc-400 hover:text-zinc-100"
                            onClick={() => removeFromProject(n.id)}
                            title="Remove from this project"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">
                          {new Date(n.createdAt).toLocaleDateString()}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {(n.tags || []).map((t) => (
                            <span
                              key={t}
                              className="text-[10px] px-2 py-1 bg-emerald-900/30 text-emerald-300 border border-emerald-700/40 rounded-full"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {!scopedNotes.length && (
                    <div className="text-sm text-zinc-500 mt-2">No notes in this project yet.</div>
                  )}
                </section>
              </div>

              {/* Right (1 col): Graph + Milestones + Decisions + Links */}
              <div className="grid grid-cols-1 gap-4">
                {/* Graph */}
                <section className="rounded-xl border border-zinc-800/70 bg-black/40">
                  <SectionHeader title="Graph (scoped)" />
                  <div className="h-[360px]">
                    <GraphView notes={scopedNotes} onOpenNote={(id) => selectNote(id)} />
                  </div>
                </section>

                {/* Milestones */}
                <section className="rounded-xl border border-zinc-800/70 bg-black/40 p-3">
                  <SectionHeader title="Milestones" />
                  <Milestones project={activeProject} upsert={upsertProject} />
                </section>

                {/* Decisions */}
                <section className="rounded-xl border border-zinc-800/70 bg-black/40 p-3">
                  <SectionHeader title="Decisions" />
                  <Decisions project={activeProject} upsert={upsertProject} selectNote={selectNote} />
                </section>

                {/* Links */}
                <section className="rounded-xl border border-zinc-800/70 bg-black/40 p-3">
                  <SectionHeader title="Links" />
                  <LinksPanel project={activeProject} upsert={upsertProject} />
                </section>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add existing notes modal */}
      {showAddModal && activeProject && (
        <div
          className="fixed inset-0 bg-black/60 grid place-items-center z-50"
          onMouseDown={() => setShowAddModal(false)}
        >
          <div
            className="w-[680px] max-w-[92vw] rounded-xl bg-zinc-950 border border-zinc-800/70 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-zinc-800/60 text-sm text-zinc-400">
              Add notes to <span className="text-zinc-200">{activeProject.name}</span>
            </div>

            <div className="p-4">
              <input
                value={noteQuery}
                onChange={(e) => setNoteQuery(e.target.value)}
                placeholder="Search notes by title or tag…"
                className="w-full bg-zinc-950/70 border border-zinc-800/70 focus:border-zinc-700 outline-none px-3 py-2 text-sm rounded-md placeholder:text-zinc-500"
                autoFocus
              />

              <div className="max-h-[360px] overflow-auto mt-3 space-y-1">
                {candidates.length === 0 && (
                  <div className="text-sm text-zinc-500">No matching notes.</div>
                )}
                {candidates.map((n) => {
                  const picked = selected.has(n.id);
                  return (
                    <label
                      key={n.id}
                      className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${
                        picked
                          ? "border-zinc-300 bg-zinc-900/60"
                          : "border-zinc-800/70 bg-zinc-950/40 hover:bg-zinc-900/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={picked}
                          onChange={() => togglePick(n.id)}
                        />
                        <div>
                          <div className="text-sm text-zinc-100">{n.title || "Untitled"}</div>
                          <div className="text-[11px] text-zinc-500">
                            {(n.tags || []).slice(0, 6).map((t) => `#${t}`).join(" ")}
                          </div>
                        </div>
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-md border border-zinc-800/70 hover:bg-zinc-900/60"
                >
                  Cancel
                </button>
                <button
                  onClick={addSelectedNotes}
                  className="px-3 py-1.5 rounded-md bg-white text-black"
                >
                  Add {selected.size || ""} {selected.size === 1 ? "note" : "notes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =============================== Subcomponents ============================== */

function InfoTile({ label, value }) {
  return (
    <div className="rounded-xl border border-zinc-800/70 bg-black/40 p-3">
      <div className="text-[11px] uppercase tracking-widest text-zinc-500">{label}</div>
      <div className="mt-1 text-xl text-zinc-100">{value}</div>
    </div>
  );
}

function SectionHeader({ title, bare = false }) {
  return bare ? (
    <div className="px-2 py-1 text-xs uppercase tracking-widest text-zinc-500">{title}</div>
  ) : (
    <div className="px-3 py-2 text-xs uppercase tracking-widest text-zinc-500 border-b border-zinc-800/60">
      {title}
    </div>
  );
}

/* ------------------------------- Milestones -------------------------------- */
function Milestones({ project, upsert }) {
  const list = project.milestones || [];
  const add = () => {
    const name = window.prompt("Milestone name?");
    if (!name) return;
    const due = window.prompt("Due date (YYYY-MM-DD), optional:");
    const m = {
      id: uid(),
      name: name.trim(),
      dueAt: due ? new Date(due).toISOString() : null,
      status: "Open",
    };
    upsert({ id: project.id, milestones: [m, ...list] });
  };
  const toggle = (id) => {
    const next = list.map((m) =>
      m.id === id ? { ...m, status: m.status === "Done" ? "Open" : "Done" } : m
    );
    upsert({ id: project.id, milestones: next });
  };
  const remove = (id) => {
    upsert({ id: project.id, milestones: list.filter((m) => m.id !== id) });
  };
  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-zinc-300">{list.length} milestone(s)</div>
        <button onClick={add} className="text-xs px-2 py-1 rounded-md border border-zinc-800/70 hover:bg-zinc-900/60">
          + Add
        </button>
      </div>
      <div className="space-y-2">
        {list.map((m) => (
          <div key={m.id} className="flex items-center justify-between text-sm rounded-lg border border-zinc-800/70 px-3 py-2 bg-zinc-950/40">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={m.status === "Done"}
                onChange={() => toggle(m.id)}
              />
              <span className={m.status === "Done" ? "line-through text-zinc-500" : "text-zinc-200"}>
                {m.name}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500">
                {m.dueAt ? new Date(m.dueAt).toLocaleDateString() : "—"}
              </span>
              <button className="text-xs text-red-400" onClick={() => remove(m.id)}>
                Remove
              </button>
            </div>
          </div>
        ))}
        {!list.length && <div className="text-sm text-zinc-500">No milestones yet.</div>}
      </div>
    </>
  );
}

/* -------------------------------- Decisions -------------------------------- */
function Decisions({ project, upsert, selectNote }) {
  const list = project.decisions || [];
  const add = () => {
    const title = window.prompt("Decision title?");
    if (!title) return;
    const noteId = window.prompt("Link to note ID (optional):") || null;
    const d = { id: uid(), title: title.trim(), date: new Date().toISOString(), noteId };
    upsert({ id: project.id, decisions: [d, ...list] });
  };
  const remove = (id) => upsert({ id: project.id, decisions: list.filter((d) => d.id !== id) });
  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-zinc-300">{list.length} decision(s)</div>
        <button onClick={add} className="text-xs px-2 py-1 rounded-md border border-zinc-800/70 hover:bg-zinc-900/60">
          + Add
        </button>
      </div>
      <div className="space-y-2">
        {list.map((d) => (
          <div key={d.id} className="flex items-center justify-between text-sm rounded-lg border border-zinc-800/70 px-3 py-2 bg-zinc-950/40">
            <div className="text-zinc-200">
              <span className="text-xs text-zinc-500 mr-2">
                {new Date(d.date).toLocaleDateString()}
              </span>
              {d.title}
            </div>
            <div className="flex items-center gap-3">
              {d.noteId && (
                <button className="text-xs text-emerald-300" onClick={() => selectNote(d.noteId)}>
                  Open note
                </button>
              )}
              <button className="text-xs text-red-400" onClick={() => remove(d.id)}>
                Remove
              </button>
            </div>
          </div>
        ))}
        {!list.length && <div className="text-sm text-zinc-500">No decisions yet.</div>}
      </div>
    </>
  );
}

/* ---------------------------------- Links ---------------------------------- */
function LinksPanel({ project, upsert }) {
  const list = project.links || [];
  const add = () => {
    const title = window.prompt("Link title?");
    if (!title) return;
    const url = window.prompt("URL (https://…)?");
    if (!url) return;
    upsert({ id: project.id, links: [{ id: uid(), title: title.trim(), url: url.trim() }, ...list] });
  };
  const remove = (id) => upsert({ id: project.id, links: list.filter((l) => l.id !== id) });
  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-zinc-300">{list.length} link(s)</div>
        <button onClick={add} className="text-xs px-2 py-1 rounded-md border border-zinc-800/70 hover:bg-zinc-900/60">
          + Add
        </button>
      </div>
      <div className="space-y-2">
        {list.map((l) => (
          <div key={l.id} className="flex items-center justify-between text-sm rounded-lg border border-zinc-800/70 px-3 py-2 bg-zinc-950/40">
            <a href={l.url} target="_blank" rel="noreferrer" className="text-emerald-300 hover:underline">
              {l.title}
            </a>
            <button className="text-xs text-red-400" onClick={() => remove(l.id)}>
              Remove
            </button>
          </div>
        ))}
        {!list.length && <div className="text-sm text-zinc-500">No links yet.</div>}
      </div>
    </>
  );
}
