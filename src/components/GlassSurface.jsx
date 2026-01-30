import React from "react";

const GlassSurface = ({ children, className = "" }) => {
    return (
        <div className={`relative w-full h-full overflow-hidden rounded-[20px] ${className}`}>
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
                    background: "hsl(0 0% 0% / 0.05)",
                    backdropFilter: "url(#glass-filter) saturate(1.2) blur(11px)",
                    boxShadow: `
            0 0 2px 1px color-mix(in oklch, white, transparent 75%) inset,
            0 0 10px 4px color-mix(in oklch, white, transparent 85%) inset
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
