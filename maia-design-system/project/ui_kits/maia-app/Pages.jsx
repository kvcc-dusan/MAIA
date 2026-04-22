/* global React */
const { useState, useEffect } = React;

const quotes = [
  "We are what we repeatedly do. Excellence, then, is a habit.",
  "The cave you fear to enter holds the treasure you seek.",
  "Silence is the sleep that nourishes wisdom.",
  "What you seek is seeking you.",
];

const greetingFor = (d) => {
  const h = d.getHours();
  if (h < 5) return "Still up,";
  if (h < 12) return "Good morning,";
  if (h < 18) return "Good afternoon,";
  return "Good evening,";
};

const HomePage = ({ entries, onCapture, now }) => {
  const [greeting] = useState(greetingFor(now));
  const [quote] = useState(quotes[Math.floor(Math.random()*quotes.length)]);
  return (
    <div style={{padding:"60px 48px 100px",height:"100%",overflowY:"auto",overflowX:"hidden",display:"grid",gridTemplateColumns:"1fr 420px",gap:"48px",alignItems:"center",boxSizing:"border-box"}}>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <h1 style={{margin:0,fontFamily:"var(--font-sans)",fontWeight:600,fontSize:"clamp(2.5rem,5vw,4rem)",letterSpacing:"-0.02em",lineHeight:1,color:"#fafafa"}}>
          <span style={{color:"rgba(255,255,255,0.5)"}}>{greeting}</span> <span>Dušan.</span>
        </h1>
        <p style={{margin:0,maxWidth:480,fontFamily:"var(--font-sans)",fontSize:15,fontStyle:"italic",lineHeight:1.6,color:"rgba(255,255,255,0.7)"}}>“{quote}”</p>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:18}}>
        <WorldMapCard/>
        <FocusCard/>
        <CaptureCard entries={entries} onCapture={onCapture}/>
      </div>
    </div>
  );
};

const CodexPage = ({ notes }) => (
  <div style={{padding:"60px 48px 100px",height:"100%",overflowY:"auto",boxSizing:"border-box"}}>
    <Label>Codex</Label>
    <h1 style={{margin:"8px 0 32px",fontFamily:"var(--font-sans)",fontWeight:600,fontSize:40,letterSpacing:"-0.02em",color:"#fafafa"}}>All notes</h1>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
      {notes.map(n => (
        <div key={n.id} style={{borderRadius:16,border:"0.5px solid rgba(255,255,255,0.05)",background:"rgba(255,255,255,0.05)",backdropFilter:"blur(4px)",padding:16,cursor:"pointer",transition:"background 200ms ease-out"}}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.1)"}
          onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.05)"}>
          <div style={{fontFamily:"var(--font-sans)",fontSize:15,fontWeight:500,color:"#fafafa",marginBottom:6}}>{n.title}</div>
          <div style={{fontFamily:"var(--font-mono)",fontSize:11,color:"#71717a",lineHeight:1.5,marginBottom:10}}>{n.content}</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {(n.tags||[]).map(t => <span key={t} className="maia-tag">#{t}</span>)}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const OpusPage = () => {
  const projects = [
    { name:"Maia Design System", status:"Active", next:"Write iconography guidelines", tag:"design" },
    { name:"Chronos v2", status:"Active", next:"Ship reminder engine", tag:"chronos" },
    { name:"Conexa clusters", status:"Paused", next:"Research force-directed layouts", tag:"graph" },
  ];
  return (
    <div style={{padding:"60px 48px 100px",height:"100%",overflowY:"auto",boxSizing:"border-box"}}>
      <Label>Opus</Label>
      <h1 style={{margin:"8px 0 32px",fontFamily:"var(--font-sans)",fontWeight:600,fontSize:40,letterSpacing:"-0.02em",color:"#fafafa"}}>Projects in motion</h1>
      <div style={{display:"flex",flexDirection:"column",gap:12,maxWidth:720}}>
        {projects.map((p,i) => (
          <div key={i} style={{borderRadius:20,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(24,24,27,0.4)",backdropFilter:"blur(16px)",padding:20,display:"grid",gridTemplateColumns:"auto 1fr auto",gap:16,alignItems:"center"}}>
            <div style={{width:44,height:44,borderRadius:12,background:"rgba(255,255,255,0.05)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fafafa"}}>
              <Icon name="sparkles" size={20}/>
            </div>
            <div>
              <div style={{fontFamily:"var(--font-sans)",fontSize:15,fontWeight:600,color:"#fafafa",marginBottom:4}}>{p.name}</div>
              <div style={{fontFamily:"var(--font-mono)",fontSize:11,color:"#a1a1aa"}}>Next · {p.next}</div>
            </div>
            <span style={{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:999,background: p.status==="Active" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)", color: p.status==="Active" ? "#34d399" : "#fbbf24",fontFamily:"var(--font-mono)",fontSize:11,fontWeight:500}}>
              <span style={{width:6,height:6,borderRadius:999,background: p.status==="Active" ? "#10B981" : "#F59E0B"}}/>
              {p.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ConexaPage = () => (
  <div style={{padding:"60px 48px 100px",height:"100%",overflowY:"auto",boxSizing:"border-box",position:"relative"}}>
    <Label>Conexa</Label>
    <h1 style={{margin:"8px 0 24px",fontFamily:"var(--font-sans)",fontWeight:600,fontSize:40,letterSpacing:"-0.02em",color:"#fafafa"}}>Knowledge graph</h1>
    <div style={{height:420,borderRadius:20,border:"1px solid rgba(255,255,255,0.1)",background:"radial-gradient(ellipse at center, #0a0a0b 0%, #000 70%)",position:"relative",overflow:"hidden"}}>
      <svg viewBox="0 0 800 420" style={{width:"100%",height:"100%"}}>
        {/* edges */}
        <g stroke="rgba(255,255,255,0.08)" strokeWidth="1" fill="none">
          <line x1="400" y1="210" x2="220" y2="110"/>
          <line x1="400" y1="210" x2="560" y2="90"/>
          <line x1="400" y1="210" x2="600" y2="300"/>
          <line x1="400" y1="210" x2="200" y2="320"/>
          <line x1="220" y1="110" x2="140" y2="60"/>
          <line x1="220" y1="110" x2="300" y2="60"/>
          <line x1="560" y1="90" x2="680" y2="140"/>
          <line x1="600" y1="300" x2="720" y2="370"/>
          <line x1="200" y1="320" x2="120" y2="380"/>
          <line x1="400" y1="210" x2="400" y2="80"/>
        </g>
        {/* nodes */}
        {[
          [400,210,10,"#fafafa","Maia"],
          [220,110,6,"#10B981",""],
          [560,90,6,"#8B5CF6",""],
          [600,300,6,"#0EA5E9",""],
          [200,320,6,"#F59E0B",""],
          [140,60,4,"#71717a",""],
          [300,60,4,"#71717a",""],
          [680,140,4,"#71717a",""],
          [720,370,4,"#71717a",""],
          [120,380,4,"#71717a",""],
          [400,80,5,"#F43F5E",""],
        ].map(([x,y,r,c,l],i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={r} fill={c}/>
            {l && <text x={x} y={y-16} fill="#fafafa" fontSize="11" fontFamily="var(--font-mono)" textAnchor="middle">{l}</text>}
          </g>
        ))}
      </svg>
      <div style={{position:"absolute",left:20,top:20,display:"flex",gap:8}}>
        <span style={{padding:"4px 10px",borderRadius:999,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",fontFamily:"var(--font-mono)",fontSize:10,color:"#a1a1aa"}}>128 notes</span>
        <span style={{padding:"4px 10px",borderRadius:999,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",fontFamily:"var(--font-mono)",fontSize:10,color:"#a1a1aa"}}>342 links</span>
      </div>
    </div>
  </div>
);

const LedgerPage = () => {
  const decisions = [
    { date:"Apr 20", title:"Adopt IBM Plex Mono as primary UI voice", rationale:"Better tabular rhythm; matches Maia's technical calm.", tag:"design" },
    { date:"Apr 18", title:"Use Onest over Inter for prose", rationale:"Warmer, more humanist letterforms for reading.", tag:"design" },
    { date:"Apr 15", title:"Ship Conexa as separate page, not overlay", rationale:"Graph deserves full canvas.", tag:"arch" },
  ];
  return (
    <div style={{padding:"60px 48px 100px",height:"100%",overflowY:"auto",boxSizing:"border-box"}}>
      <Label>Ledger</Label>
      <h1 style={{margin:"8px 0 32px",fontFamily:"var(--font-sans)",fontWeight:600,fontSize:40,letterSpacing:"-0.02em",color:"#fafafa"}}>Decisions</h1>
      <div style={{display:"flex",flexDirection:"column",gap:12,maxWidth:720}}>
        {decisions.map((d,i) => (
          <div key={i} style={{borderRadius:20,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(24,24,27,0.4)",backdropFilter:"blur(16px)",padding:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:8}}>
              <div style={{fontFamily:"var(--font-sans)",fontSize:16,fontWeight:600,color:"#fafafa"}}>{d.title}</div>
              <span style={{fontFamily:"var(--font-mono)",fontSize:10,color:"#71717a",textTransform:"uppercase",letterSpacing:".1em"}}>{d.date}</span>
            </div>
            <div style={{fontFamily:"var(--font-sans)",fontSize:14,color:"#a1a1aa",lineHeight:1.6,marginBottom:12}}>{d.rationale}</div>
            <span className="maia-tag">#{d.tag}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

Object.assign(window, { HomePage, CodexPage, OpusPage, ConexaPage, LedgerPage });
