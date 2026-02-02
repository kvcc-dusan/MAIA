import React from "react";
import GlassSurface from "./GlassSurface";

const GlassSkeleton = () => {
  return (
    <div className="w-full h-full p-6 md:p-12 flex flex-col gap-8 animate-pulse">
      {/* Header Area */}
      <div className="h-24 w-full relative">
        <GlassSurface className="opacity-100 bg-white/5 border border-white/10">
           {/* Inner structure for header elements */}
           <div className="absolute top-8 left-8 h-8 w-64 bg-white/10 rounded-lg"></div>
        </GlassSurface>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-8 min-h-0">

        {/* Left/Main Column */}
        <div className="col-span-1 md:col-span-2 relative h-full flex flex-col gap-6">
           <GlassSurface className="opacity-80 bg-white/5 border border-white/5 flex-1" />
        </div>

        {/* Right/Sidebar Column (hidden on small screens usually, but kept for skeleton balance) */}
        <div className="hidden md:block col-span-1 relative h-full">
          <GlassSurface className="opacity-80 bg-white/5 border border-white/5 h-full" />
        </div>

      </div>
    </div>
  );
};

export default GlassSkeleton;
