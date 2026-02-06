import ColorBends from "./ColorBends";
import { cn } from "@/lib/utils";

const GlassSurface = ({ children, className = "", withGlow = false, ...props }) => {
    return (
        <div className={cn("relative w-full h-full overflow-hidden rounded-[20px]", className)} {...props}>
            {/* Optional Internal Glow (ColorBends) */}
            {withGlow && (
                <div className="absolute inset-0 z-0">
                    <ColorBends
                        className="w-full h-full"
                        rotation={0}
                        autoRotate={1}
                        speed={0.2}
                        scale={1.0} // Revert to balanced zoom
                        frequency={1.0}
                        warpStrength={1.2}
                        mouseInfluence={0}
                        colors={[
                            "#10b981", // Emerald-500 (Bright)
                            "#3b82f6", // Blue-500 (Bright)
                            "#ffffff", // White (Highlight)
                            "#059669", // Emerald-600
                            "#2563eb", // Blue-600
                        ]}
                    />
                </div>
            )}

            {/* 
        The SVG Filter Definition 
        - Creates a subtle 'turbulence' noise map
        - Displaces pixels to simulate physical glass imperfections
      */}
            <svg className="absolute w-0 h-0 pointer-events-none">
                <defs>
                    <filter id="glass-filter">
                        <feTurbulence
                            type="fractalNoise"
                            baseFrequency="0.012 0.012"
                            numOctaves="3"
                            result="noise"
                        />
                        <feDisplacementMap
                            in="SourceGraphic"
                            in2="noise"
                            scale="2" // Subtle distortion
                            xChannelSelector="R"
                            yChannelSelector="G"
                        />
                    </filter>
                </defs>
            </svg>

            {/* 
        The Glass Layer 
        - backdrop-filter: applies the blur + saturation + our custom SVG filter
        - box-shadow: double inset shadow for the "glossy rim" effect
      */}
            <div
                className="absolute inset-0 z-0 pointer-events-none"
                style={{
                    background: withGlow ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.4)", // Very clear glass if glowing
                    backdropFilter: "url(#glass-filter) saturate(1.8) blur(16px)", // Stronger blur & saturation
                    /* 
                       Premium Dark Glass Effect
                       - Multi-layer shadow for "thick glass" rim
                       - Top inner highlight for light catching
                       - Subtle bottom edge definition
                    */
                    boxShadow: `
            0 1px 0 0 rgba(255, 255, 255, 0.1) inset,       /* Sharp Top Inner Highlight */
            0 0 0 1px rgba(255, 255, 255, 0.05) inset,      /* Subtle Overall Border */
            0 0 20px 0 rgba(0, 0, 0, 0.5),                  /* Soft Outer Glow/Shadow */
            0 10px 20px -5px rgba(0, 0, 0, 0.8)             /* Deep Drop Shadow */
          `,
                }}
            />

            {/* Content Layer - sits on top of glass */}
            <div className="relative z-10 w-full h-full">
                {children}
            </div>
        </div>
    );
};

export default GlassSurface;
