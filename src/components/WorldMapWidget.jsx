import React, { useMemo, useEffect, useState } from "react";
import { geoEquirectangular, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { Widget } from "./composed/Widget.jsx";
import { EmptyState } from "./composed/EmptyState.jsx";
import { Button } from "./arc/button/button.jsx";
import { MapPinOff, RefreshCw } from "lucide-react";
import { getOrdinalSuffix } from "@/lib/utils";
import styles from "./WorldMapWidget.module.css";

export const MapVisual = React.memo(({ coords, topology }) => {
    // D3 Map Logic
    const mapData = useMemo(() => {
        if (!topology || !topology.objects) {
            return null;
        }
        return feature(topology, topology.objects.land);
    }, [topology]);

    const { pathD, dotPos } = useMemo(() => {
        const width = 300;
        const height = 180;

        // Europe Focus (Zoomed Out to 500)
        // Dynamically center on User Location (e.g. Maribor)
        const validCoords = coords && typeof coords.lon === 'number' && typeof coords.lat === 'number';
        const projection = geoEquirectangular()
            .scale(500)
            .center(validCoords ? [coords.lon, coords.lat] : [15, 48])
            .translate([width / 2, height / 2]);

        const pathGenerator = geoPath().projection(projection);
        const pathD = mapData ? pathGenerator(mapData) : "";

        let dotPos = null;
        if (validCoords) {
            const [x, y] = projection([coords.lon, coords.lat]);
            // Check bounds just in case, but fitSize should ensure it's generally in view
            if (x >= 0 && x <= width && y >= 0 && y <= height) {
                dotPos = { x, y };
            }
        }

        return { pathD, dotPos };
    }, [mapData, coords]);

    return (
        <div className={styles.mapFill}>
            <svg
                viewBox="0 0 300 180"
                className={styles.svg}
                preserveAspectRatio="xMidYMid meet"
                aria-hidden="true"
            >
                <path d={pathD} className={styles.land} />

                {dotPos && (
                    <g data-location-dot>
                        <circle cx={dotPos.x} cy={dotPos.y} r="3" className={styles.pulse} />
                        <circle cx={dotPos.x} cy={dotPos.y} r="3" className={styles.dot} />
                    </g>
                )}
            </svg>
        </div>
    );
});

export default function WorldMapWidget({
  weather,
  weatherLoading = false,
  weatherError = null,
  retryWeather,
  now = new Date(),
  timeZoneLabel,
  ...shell
}) {
    const { temp, place, condition, coords } = weather || {};
    // A denied/absent location provider used to leave the widget on
    // "Locating…" forever; with no fix and no cached one, say so and offer a
    // retry instead.
    const hasFix = Boolean(coords);
    const isUnavailable = !hasFix && !weatherLoading && Boolean(weatherError);

    // Lazy load map data
    const [topology, setTopology] = useState(null);
    const [mapFailed, setMapFailed] = useState(false);
    useEffect(() => {
        let mounted = true;
        // Dynamic import for bundle optimization
        import("world-atlas/land-110m.json?json")
            .then((mod) => {
                if (mounted) setTopology(mod.default || mod);
            })
            .catch((err) => {
                console.error("Failed to load map topology:", err);
                if (mounted) setMapFailed(true);
            });
        return () => { mounted = false; };
    }, []);

    // The clock ticks once, on the page, and is passed down — this widget used
    // to run a second independent 1s interval.

    // Formatters
    const dayName = now.toLocaleDateString("en-US", { weekday: 'long' });
    const monthName = now.toLocaleDateString("en-US", { month: 'long' });
    const dayNum = now.getDate();

    const timeStr = now.toLocaleTimeString("en-US", { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return (
        <Widget
            title="Today"
            bodyClassName="flex min-h-0 flex-col px-0 pt-0 pb-0"
            footer={
                <>
                    <span className={styles.footerText}>
                        {condition ? condition + " " : ""}{temp ? `${Math.round(temp)}°` : "--"}
                    </span>
                    <span className={`${styles.footerText} ${styles.footerTime}`}>{timeStr}</span>
                </>
            }
            {...shell}
        >
            <div className={styles.head}>
                <div className={styles.headCol}>
                    <div className={styles.primary}>{dayName}</div>
                    <div className={styles.secondary}>
                        {monthName} {dayNum}{getOrdinalSuffix(dayNum)}
                    </div>
                </div>

                <div className={`${styles.headCol} ${styles.headRight}`}>
                    <div className={styles.primary}>
                        {isUnavailable
                            ? "Location unavailable"
                            : place
                              ? place.split(',')[0] + ", " + (place.split(',').pop()?.trim() || "")
                              : "Locating..."}
                    </div>
                    <div className={styles.secondary}>
                        {timeZoneLabel || Intl.DateTimeFormat().resolvedOptions().timeZone}
                    </div>
                </div>
            </div>

            {/* The map renders wherever the shell places it; it has no
                container-query breakpoint to lose. */}
            <div className={styles.mapBox} aria-busy={!topology && !mapFailed ? true : undefined}>
                {isUnavailable ? (
                    <EmptyState
                        icon={MapPinOff}
                        title="No location fix"
                        description="Enable location, or retry to use the last known position."
                        action={
                            <Button variant="secondary" size="sm" onClick={() => retryWeather?.()}>
                                <RefreshCw size={16} strokeWidth={1.75} aria-hidden="true" /> Retry
                            </Button>
                        }
                    />
                ) : mapFailed ? (
                    <EmptyState
                        icon={MapPinOff}
                        title="Map unavailable"
                        description="The map data didn't load. Reload the app to try again."
                    />
                ) : (
                    <MapVisual coords={coords} topology={topology} />
                )}
            </div>
        </Widget>
    );
}
