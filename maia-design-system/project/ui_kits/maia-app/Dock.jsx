/* global React */
const { useState } = React;

const Icon = ({ name, size = 20, stroke = 1.8 }) => {
  const paths = {
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>,
    sparkles: <><path d="M12 3v18M3 12h18M7 7l10 10M17 7 7 17"/></>,
    library: <><path d="M16 6l4 14H4l4-14"/><path d="M8 6V4h8v2"/></>,
    globe: <><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></>,
    scale: <><path d="M12 3v18M3 6h18M6 6l-3 6h6zM18 6l3 6h-6z"/></>,
    hourglass: <><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></>,
    search: <><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>,
    arrow: <><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
  );
};

const Label = ({ children, active, className = "" }) => (
  <span className={className} style={{fontFamily:"var(--font-sans)",fontWeight:700,fontSize:"10px",textTransform:"uppercase",letterSpacing:".15em",color: active ? "#fafafa" : "#71717a"}}>
    {children}
  </span>
);

const Dock = ({ page, setPage, onSearch }) => {
  const items = [
    { key: "home", icon: "calendar", label: "Today" },
    { key: "opus", icon: "sparkles", label: "Opus" },
    { key: "codex", icon: "library", label: "Codex" },
    { key: "conexa", icon: "globe", label: "Conexa" },
    { key: "ledger", icon: "scale", label: "Ledger" },
  ];
  const tools = [
    { key: "chronos", icon: "hourglass", label: "Chronos" },
    { key: "search", icon: "search", label: "Search", onClick: onSearch },
  ];
  const btn = (it) => {
    const active = page === it.key;
    return (
      <button key={it.key} onClick={it.onClick || (() => setPage(it.key))} title={it.label}
        style={{width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:12,background: active ? "rgba(255,255,255,0.1)" : "transparent",color: active ? "#fafafa" : "#71717a",border:"none",cursor:"pointer",transition:"all 200ms ease-out"}}
        onMouseEnter={e => { if (!active) { e.currentTarget.style.background="rgba(255,255,255,0.05)"; e.currentTarget.style.color="#fafafa"; }}}
        onMouseLeave={e => { if (!active) { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="#71717a"; }}}
      >
        <Icon name={it.icon} stroke={active ? 2.2 : 1.8} />
      </button>
    );
  };
  return (
    <div style={{position:"fixed",bottom:16,left:0,right:0,display:"flex",justifyContent:"center",zIndex:50,pointerEvents:"none"}}>
      <div style={{pointerEvents:"auto",display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:24,background:"rgba(24,24,27,0.80)",border:"1px solid rgba(255,255,255,0.10)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",boxShadow:"0 10px 25px -5px rgba(0,0,0,0.5)"}}>
        {items.map(btn)}
        <div style={{width:1,height:28,background:"rgba(255,255,255,0.1)",margin:"0 4px"}}/>
        {tools.map(btn)}
      </div>
    </div>
  );
};

Object.assign(window, { Icon, Label, Dock });
