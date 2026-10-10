// @maia:graph-controls
import React, { useEffect, useId, useRef } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { IconButton } from "@/components/composed/IconButton";
import { SectionLabel } from "@/components/composed/SectionBits";
import { Badge } from "@/components/arc/badge/badge";
import { SearchField } from "@/components/arc/search-field/search-field";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { Slider } from "@/components/arc/slider/slider";
import { Switch } from "@/components/arc/switch/switch";
import styles from "./GraphControls.module.css";

const FILTERS = [
    { key: "showOnlyProjects", label: "Show only projects" },
    { key: "showOrphans", label: "Show orphans" },
    { key: "showGhostNodes", label: "Show ghost nodes" },
];

const VIEW_OPTIONS = [
    { value: "2d", label: "2D" },
    { value: "3d", label: "3D" },
];

const COLOR_BY_OPTIONS = [
    { value: "folder", label: "Folder" },
    { value: "tag", label: "Tag" },
];

const LEGEND_LIMIT = 10;

const SLIDERS = {
    display: [
        { key: "nodeSize", label: "Node size", min: 0.5, max: 2, step: 0.1, format: (v) => `${v.toFixed(1)}x` },
        { key: "linkThickness", label: "Link thickness", min: 0.5, max: 5, step: 0.5, format: (v) => `${v.toFixed(1)}px` },
        { key: "fontSize", label: "Text size", min: 0.5, max: 2, step: 0.1, format: (v) => `${v.toFixed(1)}x` },
    ],
    physics: [
        { key: "repelForce", label: "Entropy", min: 10, max: 800, step: 10, format: (v) => String(v) },
        { key: "linkDistance", label: "Entanglement", min: 10, max: 500, step: 10, format: (v) => String(v) },
    ],
};

export default function GraphControls({
    isPanelOpen,
    setIsPanelOpen,
    searchQuery,
    setSearchQuery,
    searchResults,
    handleZoomToNode,
    values,
    setters,
    hotTags,
    activeCluster,
    setActiveCluster,
    clusters,
    colors,
    nodeDotColor,
    view,
    onSearchSubmit
}) {
    const panelId = useId();
    const toggleRef = useRef(null);
    const searchRef = useRef(null);

    // Non-modal panel: the graph stays live behind it so sliders can be judged
    // by eye. Focus moves in on open and Escape hands it back to the toggle.
    useEffect(() => {
        if (isPanelOpen) searchRef.current?.focus();
    }, [isPanelOpen]);

    const handleKeyDown = (e) => {
        if (e.key !== "Escape") return;
        e.stopPropagation();
        setIsPanelOpen(false);
        toggleRef.current?.focus();
    };

    return (
        <>
            <IconButton
                ref={toggleRef}
                label={isPanelOpen ? "Close graph controls" : "Open graph controls"}
                icon={isPanelOpen ? X : SlidersHorizontal}
                variant="secondary"
                size="icon-md"
                tooltip={false}
                aria-expanded={isPanelOpen}
                aria-controls={panelId}
                className={styles.toggle}
                onClick={() => setIsPanelOpen(!isPanelOpen)}
            />

            {/* Click-away layer: closes the panel when clicking the graph */}
            {isPanelOpen && <div className={styles.backdrop} onClick={() => setIsPanelOpen(false)} aria-hidden="true" />}

            <section
                id={panelId}
                className={styles.panel}
                aria-label="Graph controls"
                data-open={isPanelOpen ? "true" : "false"}
                inert={!isPanelOpen}
                onKeyDown={handleKeyDown}
            >
                <header className={styles.header}>
                    <h2 className={styles.title}>Graph controls</h2>
                </header>

                <div className={styles.body}>
                    <div className={styles.section}>
                        <SearchField
                            ref={searchRef}
                            label="Find node"
                            placeholder="Title or tag"
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                            onKeyDown={(e) => {
                                if (e.key !== "Enter") return;
                                e.preventDefault();
                                onSearchSubmit?.();
                            }}
                        />
                        {searchResults.length > 0 && (
                            <ul className={styles.results} aria-label="Matching nodes">
                                {searchResults.map(res => (
                                    <li key={res.id}>
                                        <button type="button" className={styles.row} onClick={() => handleZoomToNode(res.id)}>
                                            <span className={styles.rowMain}>
                                                <span className={styles.dot} style={{ background: nodeDotColor(res) }} aria-hidden="true" />
                                                <span className={styles.truncate}>{res.title}</span>
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className={styles.section}>
                        <SectionLabel as="h3" className={styles.sectionTitle}>View</SectionLabel>
                        <SegmentedControl
                            label="Graph dimensions"
                            options={VIEW_OPTIONS}
                            value={view.mode}
                            onValueChange={view.setMode}
                        />
                        {view.mode === "3d" && (
                            <>
                                <SegmentedControl
                                    label="Color by"
                                    options={COLOR_BY_OPTIONS}
                                    value={view.colorBy}
                                    onValueChange={view.setColorBy}
                                />
                                <ul className={styles.clusters} aria-label={`Colors by ${view.colorBy}`}>
                                    {view.legend.slice(0, LEGEND_LIMIT).map(g => (
                                        <li key={g.key} className={styles.legendRow}>
                                            <span className={styles.rowMain}>
                                                <span className={styles.dot} style={{ background: g.color }} aria-hidden="true" />
                                                <span className={styles.truncate}>{g.label}</span>
                                            </span>
                                            <span className={styles.count}>{g.count}</span>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>

                    <div className={styles.section}>
                        <SectionLabel as="h3" className={styles.sectionTitle}>Filters</SectionLabel>
                        {FILTERS.map(f => (
                            <Switch
                                key={f.key}
                                label={f.label}
                                checked={values[f.key]}
                                onCheckedChange={setters[f.key]}
                            />
                        ))}
                    </div>

                    <div className={styles.section}>
                        <SectionLabel as="h3" className={styles.sectionTitle}>Display</SectionLabel>
                        {SLIDERS.display.map(s => (
                            <Slider
                                key={s.key}
                                label={s.label}
                                min={s.min} max={s.max} step={s.step}
                                value={values[s.key]}
                                onValueChange={setters[s.key]}
                                format={s.format}
                            />
                        ))}
                    </div>

                    <div className={styles.section}>
                        <SectionLabel as="h3" className={styles.sectionTitle}>Physics</SectionLabel>
                        {SLIDERS.physics.map(s => (
                            <Slider
                                key={s.key}
                                label={s.label}
                                min={s.min} max={s.max} step={s.step}
                                value={values[s.key]}
                                onValueChange={setters[s.key]}
                                format={s.format}
                            />
                        ))}
                    </div>

                    <div className={styles.section}>
                        <SectionLabel as="h3" className={styles.sectionTitle}>Trending tags</SectionLabel>
                        {hotTags.size > 0 ? (
                            <div className={styles.tags}>
                                {Array.from(hotTags).slice(0, 10).map(tag => (
                                    <Badge key={tag} tone="neutral">#{tag}</Badge>
                                ))}
                            </div>
                        ) : (
                            <p className={styles.muted}>No trending tags yet.</p>
                        )}
                    </div>

                    <div className={styles.section}>
                        <SectionLabel as="h3" className={styles.sectionTitle}>Clusters</SectionLabel>
                        {clusters.length > 0 ? (
                            <ul className={styles.clusters}>
                                {clusters.slice(0, 5).map((c, i) => (
                                    <li key={i}>
                                        <button
                                            type="button"
                                            aria-pressed={activeCluster === i}
                                            onClick={() => setActiveCluster(activeCluster === i ? null : i)}
                                            className={styles.row}
                                        >
                                            <span className={styles.rowMain}>
                                                <span className={styles.dot} style={{ background: colors[i % colors.length] }} aria-hidden="true" />
                                                <span className={styles.truncate}>{c.name}</span>
                                            </span>
                                            <span className={styles.count}>{c.size}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className={styles.muted}>Clusters appear once notes link to each other.</p>
                        )}
                    </div>
                </div>
            </section>
        </>
    );
}
