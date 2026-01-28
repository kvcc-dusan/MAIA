// @maia:navbar
import React, { useState } from "react";

export default function Navbar({ search, setSearch, currentPage, setCurrentPage }) {
  const [searchFocused, setSearchFocused] = useState(false);

  const Tab = ({ id, label }) => (
    <button
      onClick={() => setCurrentPage(id)}
      className={[
        "relative h-full px-3 flex items-center",
        "text-sm transition-colors",
        "text-zinc-400 hover:text-zinc-100",
        // underline animation (same as Pulse)
        "after:content-[''] after:absolute after:left-0 after:bottom-0 after:h-[2px] after:w-full after:bg-white",
        "after:origin-left after:transition-transform after:duration-200",
        currentPage === id ? "text-zinc-100 after:scale-x-100" : "after:scale-x-0 hover:after:scale-x-100",
      ].join(" ")}
    >
      {label}
    </button>
  );

  return (
    <header
      className="h-12 border-b border-zinc-900 bg-black text-zinc-200 grid font-mono"
      style={{ gridTemplateColumns: "auto 1fr auto" }}
    >
      {/* Brand → goes Home on click */}
      <button
        onClick={() => setCurrentPage("home")}
        aria-label="Go to Home"
        title="Home"
        className="h-full px-4 flex items-center gap-2 cursor-pointer select-none group"
      >
        <img
          src="/maia-icon.png"
          alt=""
          className="h-5 w-5 rounded-sm opacity-90 group-hover:opacity-100"
        />
        <span
          className="font-bold tracking-wider uppercase"
          style={{ fontFamily: "system-ui,-apple-system,'Segoe UI',Arial,sans-serif" }}
        >
          Maia
        </span>
      </button>

      {/* spacer pushes the right group over */}
      <div />

      {/* Right group: tabs (left) + search (right) */}
      <div className="h-full flex items-center justify-end px-4 gap-6">
        <nav className="h-full flex items-center">
          {/* Keep IDs as your internal route keys; labels are the new names */}
          <Tab id="pulse" label="Chronos" />
          <Tab id="projects" label="Opus" />
          <Tab id="overview" label="Codex" />
          <Tab id="canvas" label="Tabula" />
          <Tab id="graph" label="Connexa" />
        </nav>

        {/* Search — unchanged styling */}
        <div
          className={[
            "group relative h-full flex items-center",
            "after:content-[''] after:absolute after:left-0 after:bottom-0 after:h-[2px] after:w-full after:bg-white",
            "after:origin-left after:transition-transform after:duration-200",
            searchFocused || (search ?? "").length > 0 ? "after:scale-x-100" : "after:scale-x-0",
            "group-hover:after:scale-x-100",
          ].join(" ")}
          style={{ width: 320 }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search…"
            aria-label="Search"
            className={[
              "w-full bg-transparent border-none outline-none",
              "text-sm placeholder:text-zinc-500",
              searchFocused ? "text-zinc-100" : "text-zinc-400",
              "transition-colors",
            ].join(" ")}
          />
        </div>
      </div>
    </header>
  );
}
