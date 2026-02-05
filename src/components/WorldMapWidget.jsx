import React, { useMemo, useEffect, useState } from "react";
import { geoEquirectangular, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

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
        const projection = geoEquirectangular()
            .scale(500)
            .center(coords ? [coords.lon, coords.lat] : [15, 48])
            .translate([width / 2, height / 2]);

        const pathGenerator = geoPath().projection(projection);
        const pathD = mapData ? pathGenerator(mapData) : "";

        let dotPos = null;
        if (coords) {
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
                    - Land: Distinct Dark Grey (#52525b / zinc-600) to stand out against Black/Zinc-900 bg.
                    - Sea: Transparent (shows the glass/glow behind).
                    - Stroke: Subtle border to define shapes.
                */}
                <path
                    d={pathD}
                    className="fill-black/50 stroke-white/10 stroke-[0.5]"
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
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                            </span>
                        </div>
                    </foreignObject>
                )}
            </svg>
        </div>
    );
});



export default function WorldMapWidget({ weather }) {
    const { temp, place, condition, coords } = weather || {};

    // Lazy load map data
    const [topology, setTopology] = useState(null);
    useEffect(() => {
        // Dynamic import for bundle optimization
        import("world-atlas/land-110m.json?json")
            .then((mod) => setTopology(mod.default || mod))
            .catch((err) => console.error("Failed to load map topology:", err));
    }, []);

    // Real-time clock
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    // Formatters
    const getOrdinalSuffix = (i) => {
        const j = i % 10,
            k = i % 100;
        if (j === 1 && k !== 11) return "st";
        if (j === 2 && k !== 12) return "nd";
        if (j === 3 && k !== 13) return "rd";
        return "th";
    };

    const dayName = now.toLocaleDateString("en-US", { weekday: 'long' });
    const monthName = now.toLocaleDateString("en-US", { month: 'long' });
    const dayNum = now.getDate();

    const timeStr = now.toLocaleTimeString("en-US", { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return (
        <Card className="relative flex min-h-[260px] w-full flex-col overflow-hidden rounded-[24px] border-[0.5px] border-white/10 bg-card/80 shadow-lg backdrop-blur-sm">
            {/* HEADER: Date & Location Info */}
            <div className="relative z-20 flex items-start justify-between p-6 pb-4">
                {/* Left: Date */}
                <div className="flex flex-col items-start text-left">
                    <div className="text-sm font-medium leading-none tracking-wide text-card-foreground">
                        {dayName}
                    </div>
                    <div className="mt-1.5 font-mono text-[10px] leading-none uppercase tracking-widest text-muted-foreground">
                        {monthName} {dayNum}{getOrdinalSuffix(dayNum)}
                    </div>
                </div>

                {/* Right: Location */}
                <div className="flex flex-col items-end text-right">
                    <div className="text-sm font-medium leading-none tracking-wide text-card-foreground">
                        {place ? place.split(',')[0] + ", " + (place.split(',').pop()?.trim() || "") : "Locating..."}
                    </div>
                    <div className="mt-1.5 font-mono text-[10px] leading-none uppercase tracking-widest text-muted-foreground">
                        EUROPE/LJUBLJANA
                    </div>
                </div>
            </div>

            {/* CENTER SECTION: Expanded Height for breathing room */}
            <CardContent className="relative z-10 h-[200px] w-full overflow-hidden bg-transparent p-0">
                <MapVisual coords={coords} topology={topology} />
            </CardContent>

            {/* FOOTER: Temp & Time */}
            <CardFooter className="relative z-20 flex items-center justify-between border-t-[0.5px] border-white/5 bg-muted/20 p-4 py-3">
                <div className="flex flex-col">
                    <span className="font-mono text-xs tracking-wide text-muted-foreground">
                        {condition ? condition + " " : ""}{temp ? `${Math.round(temp)}°` : "--"}
                    </span>
                </div>
                <span className="font-mono text-xs tracking-wide text-muted-foreground">{timeStr}</span>
            </CardFooter>
        </Card>
    );
}
