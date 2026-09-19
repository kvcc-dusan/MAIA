import React, { useMemo, useEffect, useState } from "react";
import { geoEquirectangular, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { Widget } from "./composed/Widget.jsx";
import { EmptyState } from "./composed/EmptyState.jsx";
import { Button } from "./ui/button.jsx";
import { MapPinOff, RefreshCw } from "lucide-react";
import { getOrdinalSuffix } from "@/lib/utils";

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
        <div className="absolute inset-0 flex items-center justify-center">
            <svg
                viewBox="0 0 300 180"
                className="h-full w-full opacity-100"
                preserveAspectRatio="xMidYMid meet"
                aria-hidden="true"
            >
                {/* 
                    Visual Fixes: 
                    - Land: distinct dark grey to stand out against the glass ground.
                    - Sea: Transparent (shows the glass/glow behind).
                    - Stroke: Subtle border to define shapes.
                */}
                <path
                    d={pathD}
                    className="fill-background stroke-border stroke-[0.5]"
                />

                {/* Location Dot */}
                {/* Location Dot with Pill Pulse Animation */}
                {dotPos && (
                    <foreignObject
                        x={dotPos.x - 10}
                        y={dotPos.y - 10}
                        width="20"
                        height="20"
                        className="overflow-visible" // Allow ping to spill out if needed
                    >
                        <div className="flex h-full w-full items-center justify-center">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ backgroundColor: "var(--success)" }}></span>
                                <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: "var(--success)" }}></span>
                            </span>
                        </div>
                    </foreignObject>
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
    useEffect(() => {
        let mounted = true;
        // Dynamic import for bundle optimization
        import("world-atlas/land-110m.json?json")
            .then((mod) => {
                if (mounted) setTopology(mod.default || mod);
            })
            .catch((err) => console.error("Failed to load map topology:", err));
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
                    <span className="text-xs tracking-wide text-muted-foreground">
                        {condition ? condition + " " : ""}{temp ? `${Math.round(temp)}°` : "--"}
                    </span>
                    <span className="text-xs tabular-nums tracking-wide text-muted-foreground">{timeStr}</span>
                </>
            }
            {...shell}
        >
            <div className="flex flex-none items-start justify-between px-5 pb-3">
                {/* Left: Date */}
                <div className="flex flex-col items-start text-left">
                    <div className="text-sm font-medium leading-none tracking-wide text-card-foreground">
                        {dayName}
                    </div>
                    <div className="mt-1.5 text-xs leading-none uppercase tracking-widest text-muted-foreground">
                        {monthName} {dayNum}{getOrdinalSuffix(dayNum)}
                    </div>
                </div>

                {/* Right: Location */}
                <div className="flex flex-col items-end text-right">
                    <div className="text-sm font-medium leading-none tracking-wide text-card-foreground">
                        {isUnavailable
                            ? "Location unavailable"
                            : place
                              ? place.split(',')[0] + ", " + (place.split(',').pop()?.trim() || "")
                              : "Locating..."}
                    </div>
                    <div className="mt-1.5 text-xs leading-none uppercase tracking-widest text-muted-foreground">
                        {timeZoneLabel || Intl.DateTimeFormat().resolvedOptions().timeZone}
                    </div>
                </div>
            </div>

            {/* The map no longer depends on an `@container home` breakpoint to be
                visible — the shell owns sizing, so it renders wherever it's placed. */}
            <div className="relative min-h-24 w-full flex-1 overflow-hidden">
                {isUnavailable ? (
                    <EmptyState
                        icon={MapPinOff}
                        title="No location fix"
                        description="Enable location, or retry to use the last known position."
                        action={
                            <Button variant="outline" size="sm" onClick={() => retryWeather?.()}>
                                <RefreshCw className="size-4" /> Retry
                            </Button>
                        }
                    />
                ) : (
                    <MapVisual coords={coords} topology={topology} />
                )}
            </div>
        </Widget>
    );
}
