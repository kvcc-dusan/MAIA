/* global React */
const { useState, useEffect, useRef, useMemo } = React;

const CommandPalette = ({ open, onClose, onNavigate }) => {
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const inputRef = useRef(null);
  const actions = [
    { type:"action", label:"New Note", run:()=>{ onClose(); onNavigate("codex"); }},
    { type:"action", label:"New Project", run:()=>{ onClose(); onNavigate("opus"); }},
    { type:"action", label:"Go to Today", run:()=>{ onClose(); onNavigate("home"); }},
    { type:"action", label:"Go to Opus", run:()=>{ onClose(); onNavigate("opus"); }},
    { type:"action", label:"Go to Codex", run:()=>{ onClose(); onNavigate("codex"); }},
    { type:"action", label:"Go to Conexa", run:()=>{ onClose(); onNavigate("conexa"); }},
    { type:"action", label:"Go to Ledger", run:()=>{ onClose(); onNavigate("ledger"); }},
    { type:"action", label:"Chronos", run:()=>{ onClose(); }},
    { type:"note", label:"Journal — Apr 21", run:()=>{ onClose(); onNavigate("codex"); }},
    { type:"note", label:"Design system tokens", run:()=>{ onClose(); onNavigate("codex"); }},
    { type:"note", label:"Conexa v0.3 notes", run:()=>{ onClose(); onNavigate("codex"); }},
  ];
  const items = useMemo(() => {
    const ql = q.toLowerCase();
    return actions.filter(a => !ql || a.label.toLowerCase().includes(ql)).slice(0,10);
  }, [q]);
  useEffect(()=> { if (open) { setQ(""); setI(0); setTimeout(()=>inputRef.current?.focus(),0); }}, [open]);
  useEffect(() => {
    const onKey = (e) => {
      if (!open) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") { e.preventDefault(); setI(x=>Math.min(x+1, items.length-1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setI(x=>Math.max(x-1, 0)); }
      if (e.key === "Enter") { e.preventDefault(); items[i]?.run(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, i, items, onClose]);
  if (!open) return null;
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div onClick={e=>e.stopPropagation()} style={{width:600,maxWidth:"90%",borderRadius:24,background:"rgba(0,0,0,0.8)",border:"1px solid rgba(255,255,255,0.1)",backdropFilter:"blur(16px)",boxShadow:"0 25px 50px -12px rgba(0,0,0,0.7)",overflow:"hidden"}}>
        <div style={{padding:16,borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
          <input ref={inputRef} value={q} onChange={e=>{setQ(e.target.value);setI(0);}} placeholder="Type a command or search notes…" style={{width:"100%",background:"none",border:"none",outline:"none",padding:"10px 14px",color:"#fafafa",fontSize:14,fontFamily:"var(--font-sans)",fontWeight:500,boxSizing:"border-box"}}/>
        </div>
        <div style={{padding:8,maxHeight:360,overflow:"auto",display:"flex",flexDirection:"column",gap:4}}>
          {items.length === 0 && <div style={{padding:"32px",textAlign:"center",color:"#52525b",fontSize:14}}>No matching commands or notes.</div>}
          {items.map((it, idx) => (
            <button key={idx} onMouseEnter={()=>setI(idx)} onClick={()=>it.run()}
              style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",borderRadius:12,background: i===idx ? "rgba(255,255,255,0.1)" : "transparent",color: i===idx ? "#fafafa" : "#a1a1aa",border:"none",cursor:"pointer",fontSize:14,fontFamily:"var(--font-sans)",textAlign:"left",width:"100%"}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:32,height:32,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-mono)",fontSize:9,fontWeight:700,background: i===idx ? "#fafafa" : "rgba(255,255,255,0.05)",color: i===idx ? "#18181b" : "#71717a"}}>{it.type==="action"?"CMD":"DOC"}</div>
                <span>{it.label}</span>
              </div>
              {it.type==="note" && <span style={{fontSize:10,opacity:0.4,textTransform:"uppercase",letterSpacing:".15em",fontWeight:500}}>Note</span>}
            </button>
          ))}
        </div>
        <div style={{padding:"12px 16px",borderTop:"1px solid rgba(255,255,255,0.05)",background:"rgba(0,0,0,0.4)",display:"flex",justifyContent:"space-between",fontFamily:"var(--font-sans)",fontWeight:700,fontSize:10,textTransform:"uppercase",letterSpacing:".15em",color:"#52525b"}}>
          <span>Search, Navigate, Act</span><span>ESC to close</span>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { CommandPalette });
