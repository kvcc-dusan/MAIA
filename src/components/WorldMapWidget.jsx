import React, { useMemo, useEffect, useState } from "react";
import { geoEquirectangular, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import land110 from "world-atlas/land-110m.json?json";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";

const MapVisual = React.memo(({ weather }) => {
    const { coords } = weather || {};

    // D3 Map Logic
    const mapData = useMemo(() => {
        if (!land110 || !land110.objects) {
            return null;
        }
        return feature(land110, land110.objects.land);
    }, []); // land110 is static import

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
                className="w-full h-full opacity-100"
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
                    fill="black"
                    fillOpacity="0.5"
                    stroke="white"
                    strokeWidth="0.5"
                    strokeOpacity="0.1"
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
                        <div className="flex items-center justify-center w-full h-full">
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
    const { temp, place, condition } = weather || {};

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
    const dateStr = `${dayName}, ${monthName} ${dayNum}${getOrdinalSuffix(dayNum)}`;

    const timeStr = now.toLocaleTimeString("en-US", { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return (
        <Card className="flex flex-col w-full overflow-hidden relative min-h-[260px] bg-card/80 backdrop-blur-sm shadow-lg border-[0.5px] border-white/10 rounded-[24px]">
            {/* HEADER: Date & Location Info */}
            <div className="flex justify-between items-start p-6 pb-4 z-20 relative">
                {/* Left: Date */}
                <div className="flex flex-col items-start text-left">
                    <div className="text-sm text-card-foreground font-medium tracking-wide leading-none">
                        {dayName}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono mt-1.5 leading-none">
                        {monthName} {dayNum}{getOrdinalSuffix(dayNum)}
                    </div>
                </div>

                {/* Right: Location */}
                <div className="flex flex-col items-end text-right">
                    <div className="text-sm text-card-foreground font-medium tracking-wide leading-none">
                        {place ? place.split(',')[0] + ", " + (place.split(',').pop()?.trim() || "") : "Locating..."}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono mt-1.5 leading-none">
                        EUROPE/LJUBLJANA
                    </div>
                </div>
            </div>

            {/* CENTER SECTION: Expanded Height for breathing room */}
            <CardContent className="w-full h-[200px] p-0 relative overflow-hidden bg-transparent z-10">
                <MapVisual weather={weather} />
            </CardContent>

            {/* FOOTER: Temp & Time */}
            <CardFooter className="p-4 py-3 flex justify-between items-center z-20 relative bg-muted/20 border-t-[0.5px] border-white/5">
                <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground font-mono tracking-wide">
                        {condition ? condition + " " : ""}{temp ? `${Math.round(temp)}°` : "--"}
                    </span>
                </div>
                <span className="text-xs text-muted-foreground font-mono tracking-wide">{timeStr}</span>
            </CardFooter>
        </Card>
    );
}
