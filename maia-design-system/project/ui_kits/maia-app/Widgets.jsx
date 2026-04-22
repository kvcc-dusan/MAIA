/* global React */
const { useState, useMemo } = React;

const WorldMapCard = () => (
  <div style={{borderRadius:24,border:"1px solid rgba(255,255,255,0.10)",background:"rgba(24,24,27,0.40)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",boxShadow:"0 10px 25px -5px rgba(0,0,0,0.5)",overflow:"hidden",width:"100%"}}>
    <div style={{padding:"20px 20px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <Label>Now · Belgrade</Label>
      <span style={{fontFamily:"var(--font-mono)",fontSize:11,color:"#a1a1aa"}}>7°C · clear</span>
    </div>
    <div style={{height:120,position:"relative",margin:"0 20px 16px",borderRadius:16,overflow:"hidden",background:"radial-gradient(ellipse at 30% 30%, #1e293b 0%, #050505 70%)"}}>
      {/* stylised globe */}
      <svg viewBox="0 0 300 120" preserveAspectRatio="none" style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:.6}}>
        <defs>
          <radialGradient id="sun" cx="0.28" cy="0.35"><stop offset="0%" stopColor="#fbbf24" stopOpacity="0.4"/><stop offset="100%" stopColor="#fbbf24" stopOpacity="0"/></radialGradient>
        </defs>
        <ellipse cx="84" cy="42" rx="80" ry="40" fill="url(#sun)"/>
        {/* dotted continents */}
        {Array.from({length:240}).map((_,i) => {
          const x = (i*37)%300; const y = ((i*23)%120); const on = Math.sin(i*0.71) > -0.15 && Math.sin(i*0.3+y*0.04) > 0.1;
          return on ? <circle key={i} cx={x} cy={y} r="0.9" fill="#a1a1aa" opacity={0.55}/> : null;
        })}
      </svg>
      <div style={{position:"absolute",left:12,bottom:10,display:"flex",gap:8,alignItems:"center",fontFamily:"var(--font-mono)",fontSize:10,color:"#a1a1aa"}}>
        <span style={{width:8,height:8,borderRadius:999,background:"#fbbf24",boxShadow:"0 0 8px #fbbf24"}}/>
        15:42 local
      </div>
    </div>
  </div>
);

const FocusCard = () => {
  const [open, setOpen] = useState(false);
  const tasks = [
    { dot:"#10B981", title:"Draft design system README", ctx:"Maia" },
    { dot:"#F59E0B", title:"Review Conexa graph clusters", ctx:"Opus" },
    { dot:"#8B5CF6", title:"Ship Chronos v2 reminder engine", ctx:"Opus" },
  ];
  return (
    <div style={{borderRadius:24,border:"1px solid rgba(255,255,255,0.10)",background:"rgba(24,24,27,0.40)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",boxShadow:"0 10px 25px -5px rgba(0,0,0,0.5)",overflow:"hidden",width:"100%"}}>
      <div style={{padding:"20px 20px 0"}}><Label>Today's Focus</Label></div>
      <div style={{padding:"12px 20px 20px",display:"flex",flexDirection:"column",gap:6}}>
        {tasks.map((t,i) => (
          <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",fontFamily:"var(--font-mono)",fontSize:13,color:"#e4e4e7"}}>
            <span style={{width:6,height:6,borderRadius:999,background:t.dot,flex:"none"}}/>
            <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</span>
            <span style={{fontSize:10,color:"#52525b",textTransform:"uppercase",letterSpacing:".1em"}}>{t.ctx}</span>
          </div>
        ))}
        <div style={{overflow:"hidden",transition:"max-height 300ms ease-out",maxHeight: open ? 180 : 0}}>
          <div style={{borderTop:"1px solid rgba(255,255,255,0.05)",paddingTop:12,marginTop:8}}>
            <Label>Momentum</Label>
            <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:6}}>
              {[["#maia",+3],["#design-system",+2],["#chronos",0]].map(([t,v]) => (
                <div key={t} style={{display:"flex",justifyContent:"space-between",fontFamily:"var(--font-mono)",fontSize:12,color:"#a1a1aa"}}>
                  <span>{t}</span>
                  <span style={{fontSize:10,padding:"2px 8px",borderRadius:999,background: v>0?"rgba(16,185,129,0.1)":"rgba(39,39,42,0.5)",color: v>0?"#34d399":"#71717a"}}>{v>0?"+":""}{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div style={{borderTop:"1px solid rgba(255,255,255,0.05)",background:"rgba(39,39,42,0.2)",padding:"10px 20px",display:"flex",justifyContent:"flex-end"}}>
        <button onClick={()=>setOpen(v=>!v)} style={{background:"none",border:"none",cursor:"pointer",color:"#71717a",fontFamily:"var(--font-sans)",fontWeight:700,fontSize:10,textTransform:"uppercase",letterSpacing:".15em"}}>Momentum</button>
      </div>
    </div>
  );
};

const CaptureCard = ({ entries, onCapture }) => {
  const [text, setText] = useState("");
  const [showEntries, setShowEntries] = useState(false);
  const submit = () => { if (!text.trim()) return; onCapture(text); setText(""); };
  return (
    <div style={{borderRadius:24,border:"1px solid rgba(255,255,255,0.10)",background:"rgba(24,24,27,0.40)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",boxShadow:"0 10px 25px -5px rgba(0,0,0,0.5)",overflow:"visible",width:"100%",position:"relative"}}>
      <div style={{padding:"20px 20px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <Label>Quick Capture</Label>
        {entries.length > 0 && <span style={{fontFamily:"var(--font-mono)",fontSize:10,color:"#71717a"}}>{entries.length} today</span>}
      </div>
      <div style={{padding:"12px 20px 20px"}}>
        <textarea value={text} onChange={e=>setText(e.target.value)} rows={2} placeholder="What's on your mind…"
          style={{width:"100%",background:"transparent",border:"none",outline:"none",resize:"none",color:"#e4e4e7",fontFamily:"var(--font-mono)",fontSize:14,lineHeight:1.6}}/>
      </div>
      <div style={{borderTop:"1px solid rgba(255,255,255,0.05)",background:"rgba(39,39,42,0.2)",padding:"10px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"relative"}}>
        <button onClick={()=>setShowEntries(v=>!v)} style={{background:"none",border:"none",cursor:"pointer",color:"#71717a",fontFamily:"var(--font-sans)",fontWeight:700,fontSize:10,textTransform:"uppercase",letterSpacing:".15em"}}>Entries</button>
        <button onClick={submit} disabled={!text.trim()} style={{background:"none",border:"none",cursor: text.trim() ? "pointer" : "not-allowed",opacity: text.trim() ? 1 : 0.2,color: text.trim() ? "#fafafa" : "#71717a",fontFamily:"var(--font-sans)",fontWeight:700,fontSize:10,textTransform:"uppercase",letterSpacing:".15em",display:"flex",alignItems:"center",gap:6}}>Capture <Icon name="arrow" size={10} stroke={2}/></button>
        {showEntries && (
          <div style={{position:"absolute",bottom:"100%",left:16,marginBottom:10,width:260,maxHeight:180,overflow:"auto",borderRadius:16,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(0,0,0,0.95)",backdropFilter:"blur(16px)",boxShadow:"0 25px 50px -12px rgba(0,0,0,0.7)",padding:14,zIndex:40}}>
            {entries.length === 0 ? (
              <div style={{fontFamily:"var(--font-mono)",fontSize:11,color:"#52525b",fontStyle:"italic",textAlign:"center",padding:"6px 0"}}>No entries yet today.</div>
            ) : entries.map(e => (
              <div key={e.id} style={{borderLeft:"1px solid rgba(255,255,255,0.1)",paddingLeft:10,marginBottom:10}}>
                <div style={{fontFamily:"var(--font-mono)",fontSize:9,color:"#71717a",textTransform:"uppercase",letterSpacing:".1em"}}>{e.time}</div>
                <div style={{fontFamily:"var(--font-mono)",fontSize:12,color:"#a1a1aa",lineHeight:1.4}}>{e.title}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

Object.assign(window, { WorldMapCard, FocusCard, CaptureCard });
