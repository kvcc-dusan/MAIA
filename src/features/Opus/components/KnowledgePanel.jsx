import React, { useRef, useState, useMemo, useEffect } from 'react';
import { select, drag, zoom, forceSimulation, forceLink, forceManyBody, forceCollide, forceX, forceY } from "d3";
import { useData } from "../../../context/DataContext";
import { Share01 as Share2, NanoTechnology as Network, LeftToRightListBullet as List } from "../../../components/ui/CustomIcon.jsx";

const GRAPH_HEIGHT = 280;
const PROJECT_COLOR = '#3f3f46';
const NOTE_COLOR    = '#e4e4e7';
const LINK_DIM      = 'rgba(255,255,255,0.09)';
const LINK_HOV      = 'rgba(255,255,255,0.40)';

/* ─── Panel shell ─── */
export default function KnowledgePanel({ project, selectNote }) {
    const { notes } = useData();
    const [view, setView] = useState('graph');

    const linkedNotes = useMemo(() =>
        notes
            .filter(n => n.projectIds?.includes(project.id))
            .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
            .slice(0, 20),
        [notes, project.id]
    );

    return (
        <div className="flex flex-col rounded-2xl bg-zinc-900/40 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <Share2 size={12} className="text-zinc-600" />
                    <h3 className="text-fluid-3xs uppercase tracking-[0.15em] text-zinc-500 font-bold font-mono">
                        Nodes
                    </h3>
                    <span className="text-fluid-3xs text-zinc-600 bg-white/5 px-1.5 py-0.5 rounded-full font-mono">
                        {linkedNotes.length}
                    </span>
                </div>
                {/* Graph / List toggle */}
                <button
                    onClick={() => setView(v => v === 'graph' ? 'list' : 'graph')}
                    className="w-6 h-6 flex items-center justify-center text-zinc-600 hover:text-zinc-300 hover:bg-white/5 rounded-md transition-colors"
                    title={view === 'graph' ? 'Switch to list view' : 'Switch to graph view'}
                >
                    {view === 'graph' ? <List size={12} /> : <Network size={12} />}
                </button>
            </div>

            {/* Body */}
            <div style={{ height: GRAPH_HEIGHT }}>
                {linkedNotes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: PROJECT_COLOR, boxShadow: `0 0 12px ${PROJECT_COLOR}66` }} />
                        <span className="text-zinc-700 text-xs italic font-mono">No linked notes</span>
                    </div>
                ) : view === 'graph' ? (
                    <MiniGraph key={project.id} project={project} notes={linkedNotes} onOpenNote={selectNote} />
                ) : (
                    <ListView notes={linkedNotes} onOpenNote={selectNote} />
                )}
            </div>
        </div>
    );
}

/* ─── List view ─── */
function ListView({ notes, onOpenNote }) {
    return (
        <div className="h-full overflow-y-auto custom-scrollbar py-2">
            {notes.map(n => (
                <button
                    key={n.id}
                    onClick={() => onOpenNote?.(n.id)}
                    className="w-full text-left px-5 py-2.5 flex flex-col gap-0.5 hover:bg-white/5 transition-colors group"
                >
                    <span className="text-xs font-mono text-zinc-300 group-hover:text-white transition-colors truncate">
                        {n.title || 'Untitled'}
                    </span>
                    {n.content && (
                        <span className="text-fluid-3xs font-mono text-zinc-600 truncate">
                            {n.content.replace(/[#*`\[\]]/g, '').slice(0, 55)}
                        </span>
                    )}
                </button>
            ))}
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
            .attr('fill', 'rgba(255,255,255,0.07)');
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
                        l.source.id === d.id || l.target.id === d.id ? LINK_HOV : 'rgba(255,255,255,0.03)'
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
                    .attr('fill', n => n.id === d.id && n.type === 'note' ? '#ffffff' : n.type === 'project' ? PROJECT_COLOR : NOTE_COLOR);
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
            .attr('font-size', 9).attr('fill', '#ffffff').attr('opacity', 0)
            .attr('text-anchor', 'middle').attr('dy', -11)
            .style('pointer-events', 'none')
            .style('font-family', 'var(--font-mono, monospace)')
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
