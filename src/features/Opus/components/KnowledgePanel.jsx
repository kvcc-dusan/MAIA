import React, { useRef, useState, useMemo, useEffect } from 'react';
import { select, drag, zoom, forceSimulation, forceLink, forceManyBody, forceCollide, forceX, forceY } from "d3";
import { useData } from "../../../context/DataContext";
import { Share01 as Share2, NanoTechnology as Network, LeftToRightListBullet as List, PlusSignSquare as Plus, Link01 as LinkIcon, CancelSquare as X } from "../../../components/ui/CustomIcon.jsx";
import { SectionCard } from "../../../components/composed/SectionCard";
import { AppDialog } from "../../../components/composed/AppDialog";
// D3 takes colour as JS strings, so canvas-surface colours resolve through
// lib/tokens.js (oklch passes through untouched — see its header).
import { cssVar, resolveColor, tokenColor } from "../../../lib/tokens.js";

const GRAPH_HEIGHT = 280;
/* The old hexes were zinc-600/zinc-200; the token ramp interpolates the zinc
   scale at zero chroma, so these match the originals' lightness exactly. */
const PROJECT_COLOR = resolveColor(cssVar('--chart-3'));
const NOTE_COLOR    = resolveColor(cssVar('--primary'));
/* Links/dots fade from --foreground (the opaque white of the ramp) because no
   translucent token sits at these exact opacities — --overlay (10%) is the
   semantic near-match for LINK_DIM, matching graphTheme()'s link treatment. */
const LINK_DIM      = resolveColor(cssVar('--overlay'));
const LINK_HOV      = tokenColor('--foreground', 0.4);
const DOT_PATTERN   = tokenColor('--foreground', 0.07);
const LINK_MUTED    = tokenColor('--foreground', 0.03);
const GLOW_COLOR    = tokenColor('--chart-3', 0.4); // the old `${PROJECT_COLOR}66` glow, 0x66 = 40%
/* Hovered node fill / label text: --foreground (0.985) is the ramp's white;
   it replaces the raw white literal the old code hardcoded. */
const HOVER_COLOR   = resolveColor(cssVar('--foreground'));

/* ─── Panel shell ─── */
const PAGE_SIZE = 20;

export default function KnowledgePanel({ project, selectNote }) {
    const { notes, createNote, updateNote } = useData();
    // List first: the graph is a nice artifact, but titles and excerpts are
    // what you actually navigate by. The toggle keeps the graph one click away.
    const [view, setView] = useState('list');
    const [showAll, setShowAll] = useState(false);
    const [isPicking, setIsPicking] = useState(false);

    const allLinked = useMemo(() =>
        notes
            .filter(n => n.projectIds?.includes(project.id))
            .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)),
        [notes, project.id]
    );

    // The graph stays capped regardless — past ~20 nodes it is unreadable, and
    // that is a rendering limit rather than something to page through.
    const visibleNotes = view === 'graph' || !showAll ? allLinked.slice(0, PAGE_SIZE) : allLinked;
    const hiddenCount = allLinked.length - visibleNotes.length;

    const unlinkedNotes = useMemo(
        () => notes.filter(n => !n.projectIds?.includes(project.id)),
        [notes, project.id]
    );

    const newNote = () => {
        const id = createNote({ projectIds: [project.id] });
        selectNote?.(id);
    };

    const linkNote = (note) => {
        updateNote({ ...note, projectIds: [...(note.projectIds || []), project.id] });
        setIsPicking(false);
    };

    const unlinkNote = (note) => {
        updateNote({ ...note, projectIds: (note.projectIds || []).filter(id => id !== project.id) });
    };

    return (
        <SectionCard
            icon={Share2}
            title="Nodes"
            count={allLinked.length}
            bodyStyle={{ height: GRAPH_HEIGHT }}
            action={
                <div className="flex items-center gap-1">
                    <button
                        onClick={newNote}
                        className="w-6 h-6 flex items-center justify-center text-subtle-foreground hover:text-foreground-secondary hover:bg-overlay-subtle rounded-md transition-colors"
                        aria-label="New note in this project"
                        title="New note in this project"
                    >
                        <Plus size={12} />
                    </button>
                    <button
                        onClick={() => setIsPicking(true)}
                        className="w-6 h-6 flex items-center justify-center text-subtle-foreground hover:text-foreground-secondary hover:bg-overlay-subtle rounded-md transition-colors"
                        aria-label="Link an existing note"
                        title="Link an existing note"
                    >
                        <LinkIcon size={12} />
                    </button>
                    <button
                        onClick={() => setView(v => v === 'graph' ? 'list' : 'graph')}
                        className="w-6 h-6 flex items-center justify-center text-subtle-foreground hover:text-foreground-secondary hover:bg-overlay-subtle rounded-md transition-colors"
                        aria-label={view === 'graph' ? 'Switch to list view' : 'Switch to graph view'}
                    >
                        {view === 'graph' ? <List size={12} /> : <Network size={12} />}
                    </button>
                </div>
            }
        >
            {allLinked.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ background: PROJECT_COLOR, boxShadow: `0 0 12px ${GLOW_COLOR}` }} />
                    <span className="text-faint-foreground text-xs italic">No linked notes</span>
                    <div className="flex items-center gap-2">
                        <button onClick={newNote} className="px-2.5 py-1 text-xs font-medium text-foreground bg-overlay hover:bg-accent rounded-lg transition-colors">
                            New note
                        </button>
                        <button onClick={() => setIsPicking(true)} className="px-2.5 py-1 text-xs text-subtle-foreground hover:text-foreground-secondary rounded-lg transition-colors">
                            Link existing
                        </button>
                    </div>
                </div>
            ) : view === 'graph' ? (
                <MiniGraph key={project.id} project={project} notes={visibleNotes} onOpenNote={selectNote} />
            ) : (
                <ListView
                    notes={visibleNotes}
                    hiddenCount={hiddenCount}
                    onShowAll={() => setShowAll(true)}
                    onOpenNote={selectNote}
                    onUnlink={unlinkNote}
                />
            )}

            <NotePicker
                open={isPicking}
                notes={unlinkedNotes}
                onPick={linkNote}
                onClose={() => setIsPicking(false)}
            />
        </SectionCard>
    );
}

/* ─── Link-an-existing-note picker ─── */
function NotePicker({ open, notes, onPick, onClose }) {
    const [query, setQuery] = useState("");

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        const pool = q ? notes.filter(n => (n.title || '').toLowerCase().includes(q)) : notes;
        return pool.slice(0, 50);
    }, [notes, query]);

    return (
        <AppDialog open={open} onClose={onClose} title="Link a note" size="sm">
            <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search notes…"
                aria-label="Search notes"
                className="w-full bg-overlay-subtle border border-border rounded-xl text-foreground text-sm outline-hidden focus:border-border-strong transition-all placeholder:text-subtle-foreground px-3 py-2.5 mb-2"
            />
            <div className="max-h-64 overflow-y-auto custom-scrollbar -mx-2">
                {results.length === 0 ? (
                    <p className="text-faint-foreground text-xs italic text-center py-6">
                        {notes.length === 0 ? "Every note is already linked." : "No notes match."}
                    </p>
                ) : results.map(n => (
                    <button
                        key={n.id}
                        onClick={() => onPick(n)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-overlay-subtle transition-colors"
                    >
                        <span className="block text-sm text-foreground-secondary truncate">{n.title || 'Untitled'}</span>
                    </button>
                ))}
            </div>
        </AppDialog>
    );
}

/* ─── List view ─── */
function ListView({ notes, hiddenCount, onShowAll, onOpenNote, onUnlink }) {
    return (
        <div className="h-full overflow-y-auto custom-scrollbar py-2">
            {notes.map(n => (
                <div key={n.id} className="group flex items-center hover:bg-overlay-subtle transition-colors">
                    <button
                        onClick={() => onOpenNote?.(n.id)}
                        className="flex-1 min-w-0 text-left pl-5 pr-2 py-2.5 flex flex-col gap-0.5"
                    >
                        <span className="text-xs text-foreground-secondary group-hover:text-foreground transition-colors truncate">
                            {n.title || 'Untitled'}
                        </span>
                        {n.content && (
                            <span className="text-xs text-subtle-foreground truncate">
                                {n.content.replace(/[#*`[\]]/g, '').slice(0, 55)}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => onUnlink?.(n)}
                        aria-label={`Unlink ${n.title || 'Untitled'} from this project`}
                        className="opacity-0 group-hover:opacity-100 mr-3 p-1.5 shrink-0 text-subtle-foreground hover:text-destructive hover:bg-overlay-subtle rounded transition-all"
                    >
                        <X size={12} />
                    </button>
                </div>
            ))}
            {hiddenCount > 0 && (
                <button
                    onClick={onShowAll}
                    className="w-full px-5 py-2.5 text-left text-xs text-subtle-foreground hover:text-foreground-secondary hover:bg-overlay-subtle transition-colors"
                >
                    Show {hiddenCount} more…
                </button>
            )}
        </div>
    );
}

/* ─── Force graph ─── */
function MiniGraph({ project, notes, onOpenNote }) {
    const containerRef = useRef(null);
    const svgRef       = useRef(null);
    const simRef       = useRef(null);
    const dimsRef      = useRef({ w: 300, h: GRAPH_HEIGHT });
    const [dims, setDims] = useState({ w: 300, h: GRAPH_HEIGHT });

    useEffect(() => { dimsRef.current = dims; }, [dims]);

    /* Resize observer */
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
            setDims({ w: width, h: height });
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    /* Update soft center gravity when panel resizes */
    useEffect(() => {
        const sim = simRef.current;
        if (!sim) return;
        sim.force('cx')?.x(dims.w / 2);
        sim.force('cy')?.y(dims.h / 2);
        sim.alpha(0.15).restart();
    }, [dims]);

    /* Build node/link data */
    const { graphNodes, graphLinks } = useMemo(() => {
        const projNode = { id: `proj-${project.id}`, title: project.name, type: 'project' };
        const noteNodes = notes.map(n => ({ id: n.id, title: n.title || 'Untitled', type: 'note' }));
        const links = noteNodes.map(n => ({ source: projNode.id, target: n.id }));
        return { graphNodes: [projNode, ...noteNodes], graphLinks: links };
    }, [project.id, project.name, notes]);

    /* D3 — rebuild when data changes */
    useEffect(() => {
        if (!svgRef.current) return;

        const { w, h } = dimsRef.current;
        const svg = select(svgRef.current);
        svg.selectAll('*').remove();

        /* Dotted background */
        const defs  = svg.append('defs');
        const patId = `dots-${project.id}`;
        const pat   = defs.append('pattern')
            .attr('id', patId).attr('width', 20).attr('height', 20)
            .attr('patternUnits', 'userSpaceOnUse');
        pat.append('circle').attr('cx', 10).attr('cy', 10).attr('r', 0.9)
            .attr('fill', DOT_PATTERN);
        svg.append('rect').attr('width', '100%').attr('height', '100%')
            .attr('fill', `url(#${patId})`).style('pointer-events', 'none');

        const g = svg.append('g');
        const linkLayer  = g.append('g');
        const nodeLayer  = g.append('g');
        const labelLayer = g.append('g');

        /* Assign initial positions — project at center, notes in a ring */
        graphNodes.forEach((n, i) => {
            if (n.type === 'project') {
                n.x = w / 2; n.y = h / 2;
            } else {
                const idx   = i - 1;
                const total = graphNodes.length - 1;
                const angle = (idx / total) * 2 * Math.PI - Math.PI / 2;
                const ring  = Math.min(w, h) * 0.26;
                n.x = w / 2 + ring * Math.cos(angle) + (Math.random() - 0.5) * 6;
                n.y = h / 2 + ring * Math.sin(angle) + (Math.random() - 0.5) * 6;
            }
        });

        /* Simulation — soft center gravity instead of hard boundary clamp */
        const sim = forceSimulation(graphNodes)
            .force('link',    forceLink(graphLinks).id(d => d.id).distance(60).strength(0.45))
            .force('charge',  forceManyBody().strength(-85))
            .force('collide', forceCollide().radius(d => d.type === 'project' ? 20 : 13).strength(0.85))
            .force('cx',      forceX(w / 2).strength(0.04))   // soft pull to center, not a wall
            .force('cy',      forceY(h / 2).strength(0.04))
            .alphaDecay(0.012)
            .velocityDecay(0.38)
            .alpha(1).restart();

        simRef.current = sim;

        /* Links */
        const link = linkLayer.selectAll('line')
            .data(graphLinks)
            .join('line')
            .attr('stroke', LINK_DIM)
            .attr('stroke-width', 1)
            .style('pointer-events', 'none');

        /* Node circles */
        const node = nodeLayer.selectAll('circle.mn')
            .data(graphNodes)
            .join('circle').attr('class', 'mn')
            .attr('r',    d => d.type === 'project' ? 9 : 5)
            .attr('fill', d => d.type === 'project' ? PROJECT_COLOR : NOTE_COLOR)
            .attr('cursor', d => d.type === 'note' ? 'pointer' : 'grab')
            .call(makeDrag(sim))
            .on('click', (e, d) => { if (d.type === 'note') onOpenNote?.(d.id); })
            .on('mouseover', (e, d) => {
                link
                    .attr('stroke', l =>
                        l.source.id === d.id || l.target.id === d.id ? LINK_HOV : LINK_MUTED
                    )
                    .attr('stroke-width', l =>
                        l.source.id === d.id || l.target.id === d.id ? 1.5 : 1
                    );
                node
                    .attr('opacity', n => {
                        const linked = graphLinks.some(l =>
                            (l.source.id === d.id && l.target.id === n.id) ||
                            (l.target.id === d.id && l.source.id === n.id)
                        );
                        return n.id === d.id || linked ? 1 : 0.2;
                    })
                    .attr('fill', n => n.id === d.id && n.type === 'note' ? HOVER_COLOR : n.type === 'project' ? PROJECT_COLOR : NOTE_COLOR);
                label.attr('opacity', n => n.id === d.id ? 1 : 0);
            })
            .on('mouseout', () => {
                link.attr('stroke', LINK_DIM).attr('stroke-width', 1);
                node.attr('opacity', 1)
                    .attr('fill', n => n.type === 'project' ? PROJECT_COLOR : NOTE_COLOR);
                label.attr('opacity', 0);
            });

        /* Labels — shown only on hover */
        const label = labelLayer.selectAll('text')
            .data(graphNodes)
            .join('text')
            .text(d => d.type === 'project' ? '' : truncate(d.title, 22))
            .attr('font-size', 9).attr('fill', HOVER_COLOR).attr('opacity', 0)
            .attr('text-anchor', 'middle').attr('dy', -11)
            .style('pointer-events', 'none')
            .style('font-family', 'var(--font-mono)')
            .style('user-select', 'none');

        /* Tick — NO boundary clamping, zoom + drag work freely */
        sim.on('tick', () => {
            link .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
                 .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
            node .attr('cx', d => d.x).attr('cy', d => d.y);
            label.attr('x',  d => d.x).attr('y',  d => d.y);
        });

        /* Zoom — pinch / wheel, pans the g group, no conflict with node drag */
        const zoomBehavior = zoom()
            .scaleExtent([0.3, 4])
            .on('zoom', event => g.attr('transform', event.transform));
        svg.call(zoomBehavior);

        return () => sim.stop();
    }, [graphNodes, graphLinks]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div ref={containerRef} className="w-full h-full select-none">
            <svg ref={svgRef} className="w-full h-full block touch-none" />
        </div>
    );
}

/* ─── Drag factory ─── */
function makeDrag(sim) {
    return drag()
        .on('start', e => {
            if (!e.active) sim.alphaTarget(0.3).restart();
            e.subject.fx = e.subject.x;
            e.subject.fy = e.subject.y;
        })
        .on('drag', e => {
            e.subject.fx = e.x;
            e.subject.fy = e.y;
        })
        .on('end', e => {
            if (!e.active) sim.alphaTarget(0);
            e.subject.fx = null;
            e.subject.fy = null;
        });
}

function truncate(str, max) {
    return str.length > max ? str.slice(0, max) + '…' : str;
}
