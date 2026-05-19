import { store } from "./storage.js";

import { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";

// ── Medications ─────────────────────────────────────────────
const MEDS = [
  { id:"stamlo",      name:"Stamlo 5mg",   generic:"Amlodipine 5mg",       purpose:"Blood Pressure",    slot:"morning", color:"#B48EFF", doctor:"Dr. Hansra" },
  { id:"tofanol",     name:"Tofanol",      generic:"Tofacitinib",          purpose:"Rheumatoid Arthritis",slot:"morning",color:"#7EB8F7", doctor:"Dr. Itesh Jain" },
  { id:"purevise",    name:"Purevise 60k", generic:"Vitamin D3 60,000 IU", purpose:"Vitamin D",         slot:"morning", color:"#F7C948", doctor:"Gynaecologist", sundayOnly:true },
  { id:"concuims_m",  name:"Concuims XT",  generic:"Curcumin XT",          purpose:"Anti-inflammatory", slot:"morning", color:"#F5A623", doctor:"Gynaecologist" },
  { id:"concuims_n",  name:"Concuims XT",  generic:"Curcumin XT",          purpose:"Anti-inflammatory", slot:"night",   color:"#F5A623", doctor:"Gynaecologist" },
  { id:"lupicheme",   name:"Lupicheme",    generic:"Hydroxychloroquine",   purpose:"Autoimmune / RA",   slot:"morning", color:"#D9A0FF", doctor:"Gynaecologist" },
  { id:"noren_m",     name:"Noren MD",     generic:"Norethindrone",        purpose:"Hormonal",          slot:"morning", color:"#FF9CC2", doctor:"Gynaecologist" },
  { id:"noren_n",     name:"Noren MD",     generic:"Norethindrone",        purpose:"Hormonal",          slot:"night",   color:"#FF9CC2", doctor:"Gynaecologist" },
];

const todayStr = () => new Date().toISOString().split("T")[0];
const isSunday  = () => new Date().getDay() === 0;
const activeMeds= () => MEDS; // always show all meds
const fmtDate   = d => new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short"});

const getBpStatus = (s, d) => {
  if (s<120 && d<80)  return { label:"Normal",       color:"#4ECCA3" };
  if (s<130 && d<80)  return { label:"Elevated",     color:"#F7C948" };
  if (s<140 || d<90)  return { label:"Stage 1 High", color:"#F5A623" };
                      return { label:"Stage 2 High", color:"#FF6B6B" };
};

// ── Styles ───────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');

*{box-sizing:border-box;margin:0;padding:0;}
:root{
  --bg:#07050F;
  --card:rgba(255,255,255,0.04);
  --border:rgba(180,142,255,0.14);
  --text:#EEE8FF;
  --muted:#8878A8;
  --dim:#4A3D65;
  --purple:#B48EFF;
  --blue:#7EB8F7;
  --pink:#FF9CC2;
  --gold:#F7C948;
  --green:#4ECCA3;
}
body{background:var(--bg);}

.ap-root{
  min-height:100vh;
  background:var(--bg);
  color:var(--text);
  font-family:'DM Sans',sans-serif;
  position:relative;
  overflow-x:hidden;
}

/* ── Petals ── */
@keyframes drift{
  0%  {transform:translateY(110vh) rotate(0deg)   scale(1);    opacity:0;}
  8%  {opacity:.55;}
  92% {opacity:.2;}
  100%{transform:translateY(-15vh) rotate(480deg) scale(0.7); opacity:0;}
}
.petal{
  position:fixed;pointer-events:none;z-index:0;
  width:7px;height:11px;
  border-radius:70% 30% 70% 30% / 40% 60% 40% 60%;
  animation:drift linear infinite;
}
.p1{left:7%;  background:rgba(180,142,255,.5);animation-duration:14s;animation-delay:0s;}
.p2{left:22%; background:rgba(255,156,194,.4);animation-duration:18s;animation-delay:4s;}
.p3{left:40%; background:rgba(126,184,247,.45);animation-duration:11s;animation-delay:8s;}
.p4{left:60%; background:rgba(180,142,255,.4);animation-duration:16s;animation-delay:2s;}
.p5{left:77%; background:rgba(217,160,255,.5);animation-duration:12s;animation-delay:6s;}
.p6{left:90%; background:rgba(255,156,194,.35);animation-duration:20s;animation-delay:1s;}
.p7{left:50%; background:rgba(247,201,72,.3); animation-duration:15s;animation-delay:10s;}

/* ── Header ── */
.ap-header{
  position:relative;z-index:1;
  padding:1.8rem 1.5rem 1.4rem;
  background:linear-gradient(165deg,rgba(55,15,110,.65) 0%,rgba(7,5,15,0) 75%);
  border-bottom:1px solid var(--border);
  text-align:center;
}
.ap-flower{
  width:64px;height:64px;
  margin:0 auto .7rem;
  filter:drop-shadow(0 0 14px rgba(180,142,255,.65));
  animation:bloom 3s ease-in-out infinite alternate;
}
@keyframes bloom{
  from{filter:drop-shadow(0 0 10px rgba(180,142,255,.5));}
  to  {filter:drop-shadow(0 0 22px rgba(180,142,255,.9));}
}
.ap-name{
  font-family:'Cormorant Garamond',serif;
  font-size:2.6rem;font-weight:300;
  letter-spacing:.14em;color:var(--text);line-height:1;
}
.ap-subtitle{
  font-size:.68rem;color:var(--muted);
  letter-spacing:.3em;text-transform:uppercase;margin-top:.35rem;
}
.ap-date{font-size:.72rem;color:var(--dim);margin-top:.35rem;}

/* ── Tabs ── */
.ap-tabs{
  display:flex;
  background:rgba(255,255,255,0.025);
  border-bottom:1px solid var(--border);
  position:sticky;top:0;z-index:10;
}
.ap-tab{
  flex:1;padding:.8rem .5rem;
  background:none;border:none;
  color:var(--muted);
  font-family:'DM Sans',sans-serif;
  font-size:.7rem;font-weight:500;
  letter-spacing:.1em;text-transform:uppercase;
  cursor:pointer;transition:all .2s;
  border-bottom:2px solid transparent;
}
.ap-tab.active{color:var(--purple);border-bottom-color:var(--purple);background:rgba(180,142,255,.05);}

/* ── Cards ── */
.card{
  background:var(--card);
  border:1px solid var(--border);
  border-radius:16px;
  backdrop-filter:blur(12px);
  -webkit-backdrop-filter:blur(12px);
}

/* ── Med Row ── */
.med-row{
  display:flex;align-items:center;gap:.9rem;
  padding:.9rem 1rem;
  border-radius:12px;
  border:1px solid rgba(255,255,255,0.05);
  background:rgba(255,255,255,0.015);
  cursor:pointer;transition:all .18s;
  user-select:none;
}
.med-row:hover{background:rgba(180,142,255,.07);border-color:rgba(180,142,255,.18);}
.med-row.taken{opacity:.45;background:rgba(78,204,163,.04);border-color:rgba(78,204,163,.12);}

.check{
  width:28px;height:28px;border-radius:50%;
  border:2px solid;
  display:flex;align-items:center;justify-content:center;
  flex-shrink:0;font-size:13px;
  transition:all .2s;
}
.check.done{background:var(--green);border-color:var(--green);color:#072315;}

@keyframes pop{0%{transform:scale(1)}50%{transform:scale(1.35)}100%{transform:scale(1)}}
.pop{animation:pop .28s ease;}

/* ── Inputs ── */
.inp{
  background:rgba(255,255,255,.045);
  border:1px solid rgba(180,142,255,.2);
  border-radius:10px;color:var(--text);
  font-family:'DM Sans',sans-serif;font-size:.88rem;
  padding:.7rem .95rem;outline:none;width:100%;
  transition:border-color .2s;
}
.inp:focus{border-color:rgba(180,142,255,.5);}
.inp::placeholder{color:var(--dim);}
.inp-label{font-size:.6rem;color:var(--muted);display:block;margin-bottom:.28rem;letter-spacing:.08em;text-transform:uppercase;}

/* ── Buttons ── */
.btn-primary{
  background:linear-gradient(135deg,#6D28D9,#B48EFF);
  border:none;border-radius:12px;color:#fff;
  cursor:pointer;font-family:'DM Sans',sans-serif;
  font-size:.82rem;font-weight:600;letter-spacing:.07em;
  padding:.82rem 1.5rem;text-transform:uppercase;
  transition:all .2s;width:100%;
}
.btn-primary:hover{transform:translateY(-1px);box-shadow:0 5px 22px rgba(109,40,217,.45);}
.btn-primary.success{background:linear-gradient(135deg,#065F46,#4ECCA3);}

.btn-notif{
  background:linear-gradient(135deg,rgba(109,40,217,.22),rgba(255,156,194,.1));
  border:1px solid rgba(180,142,255,.22);border-radius:12px;
  padding:.9rem 1rem;display:flex;align-items:center;gap:.7rem;
  cursor:pointer;transition:all .2s;width:100%;text-align:left;
  color:var(--text);font-family:'DM Sans',sans-serif;
}
.btn-notif:hover{background:rgba(109,40,217,.3);}

/* ── Section label ── */
.sec{
  font-family:'Cormorant Garamond',serif;
  font-size:1.15rem;font-weight:400;
  color:#C4ADFF;letter-spacing:.04em;
  margin-bottom:.65rem;display:flex;align-items:center;gap:.4rem;
}

/* ── Scroll page ── */
.page{padding:1.2rem;display:flex;flex-direction:column;gap:1.15rem;position:relative;z-index:1;}

/* ── BP badge ── */
.bp-badge{
  display:inline-flex;align-items:center;
  padding:.2rem .6rem;border-radius:20px;
  font-size:.66rem;font-weight:600;letter-spacing:.04em;
}

/* ── Custom tooltip ── */
.ct{
  background:rgba(18,8,38,.96);
  border:1px solid rgba(180,142,255,.22);
  border-radius:8px;padding:8px 12px;
  font-family:'DM Sans',sans-serif;font-size:.72rem;color:var(--text);
}
.ct-label{color:var(--muted);margin-bottom:4px;}
`;

// ── SVG Flower ───────────────────────────────────────────────
function Flower() {
  return (
    <svg viewBox="0 0 100 100" className="ap-flower">
      {/* 5 petals */}
      {[0,72,144,216,288].map((a,i) => (
        <g key={i} transform={`rotate(${a} 50 50)`}>
          <ellipse cx="50" cy="26" rx="9" ry="20"
            fill={i%2===0 ? "rgba(180,142,255,0.8)" : "rgba(217,160,255,0.65)"}
            stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
        </g>
      ))}
      {/* inner glow ring */}
      <circle cx="50" cy="50" r="13" fill="rgba(247,201,72,0.15)" />
      {/* center */}
      <circle cx="50" cy="50" r="10" fill="#F7C948" opacity=".92" />
      <circle cx="50" cy="50" r="6.5" fill="#E8A820" />
      {/* stamen */}
      {[0,60,120,180,240,300].map((a,i) => {
        const x = 50 + 8.5 * Math.cos(a*Math.PI/180);
        const y = 50 + 8.5 * Math.sin(a*Math.PI/180);
        return <circle key={i} cx={x} cy={y} r="1.6" fill="#FFD97D" />;
      })}
    </svg>
  );
}

// ── Custom Chart Tooltip ─────────────────────────────────────
function CTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="ct">
      <div className="ct-label">{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{color:p.color}}>{p.name}: {p.value} mmHg</div>
      ))}
    </div>
  );
}

// ── Daily Quotes ────────────────────────────────────────────
const QUOTES = [
  { text: "She overcomes. Every single day.", author: "The meaning of Aparajita" },
  { text: "Taking your meds is an act of self-love.", author: "" },
  { text: "Small consistent steps build the strongest health.", author: "" },
  { text: "Your body is doing its best — support it.", author: "" },
  { text: "Rest, heal, and rise. You are undefeated.", author: "" },
  { text: "Every pill taken is a promise kept to yourself.", author: "" },
  { text: "Healing is not linear, but you are always moving forward.", author: "" },
  { text: "Strength isn't the absence of struggle — it's continuing through it.", author: "" },
  { text: "You are not your diagnosis. You are so much more.", author: "" },
  { text: "Nourish your body. It carries you through everything.", author: "" },
  { text: "Today's routines are tomorrow's resilience.", author: "" },
  { text: "Be gentle with yourself. You are a work in progress.", author: "" },
  { text: "Your health is the most important project you'll ever manage.", author: "" },
  { text: "Every morning you wake up and try again is a victory.", author: "" },
  { text: "The body heals with play, the mind heals with laughter, the spirit heals with joy.", author: "" },
  { text: "Consistency is the quiet superpower of every healthy person.", author: "" },
  { text: "Taking care of yourself is the most radical thing you can do.", author: "" },
  { text: "You have survived every hard day so far. Today is no different.", author: "" },
  { text: "Good health is a crown worn by the well that only the sick can see.", author: "" },
  { text: "One day at a time. One dose at a time. One breath at a time.", author: "" },
  { text: "Your future self is grateful for what you do today.", author: "" },
  { text: "The secret of getting ahead is getting started — even just with your meds.", author: "" },
  { text: "Healing requires patience, persistence, and a whole lot of heart.", author: "" },
  { text: "Every storm runs out of rain. Keep going.", author: "" },
  { text: "You are braver than you believe, stronger than you seem.", author: "A.A. Milne" },
  { text: "Health is not a destination. It's a daily practice of love.", author: "" },
  { text: "Be the reason you smile today.", author: "" },
  { text: "Even the darkest night will end, and the sun will rise.", author: "Victor Hugo" },
  { text: "She believed she could, so she did.", author: "" },
  { text: "Aparajita — the one who cannot be defeated.", author: "Sanskrit" },
  { text: "Fall seven times, stand up eight.", author: "Japanese Proverb" },
];

const getDailyQuote = () => {
  const start = new Date("2024-01-01");
  const today = new Date();
  const day = Math.floor((today - start) / (1000*60*60*24));
  return QUOTES[day % QUOTES.length];
};

function DailyQuote() {
  const q = getDailyQuote();
  return (
    <div className="card" style={{
      padding:"1.4rem 1.3rem",
      background:"linear-gradient(135deg,rgba(55,15,110,.35),rgba(180,142,255,.06))",
      borderColor:"rgba(180,142,255,.2)",
      textAlign:"center",
      position:"relative",
      overflow:"hidden",
    }}>
      {/* decorative quote marks */}
      <div style={{
        position:"absolute",top:"-10px",left:"10px",
        fontFamily:"Cormorant Garamond,serif",
        fontSize:"6rem",color:"rgba(180,142,255,.1)",
        lineHeight:1,userSelect:"none",pointerEvents:"none",
      }}>"</div>
      <div style={{
        fontFamily:"Cormorant Garamond,serif",
        fontSize:"1.15rem",fontWeight:400,fontStyle:"italic",
        color:"#D4BFFF",lineHeight:1.55,
        position:"relative",zIndex:1,
      }}>
        {q.text}
      </div>
      {q.author && (
        <div style={{
          fontSize:".65rem",color:"var(--muted)",marginTop:".7rem",
          letterSpacing:".1em",textTransform:"uppercase",
        }}>— {q.author}</div>
      )}
      <div style={{
        fontSize:".6rem",color:"var(--dim)",marginTop:".5rem",
        letterSpacing:".05em",
      }}>✦ refreshes daily ✦</div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────
export default function AparajitaHealth() {
  const [tab,        setTab]        = useState("today");
  const [medLog,     setMedLog]     = useState({});
  const [bpLogs,     setBpLogs]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [notifOk,    setNotifOk]    = useState(false);
  const [popId,      setPopId]      = useState(null);
  const [bpForm,     setBpForm]     = useState({sys:"",dia:"",pulse:"",notes:""});
  const [bpSaved,    setBpSaved]    = useState(false);
  const [storageErr, setStorageErr] = useState(false);

  // ── Inject CSS ──────────────────────────────────────────────
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = CSS;
    document.head.appendChild(el);
    return () => el.remove();
  }, []);

  // ── Load from storage ───────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [mRes, bRes] = await Promise.all([
          store.get(`med:${todayStr()}`).catch(()=>null),
          store.get("bp_logs").catch(()=>null),
        ]);
        if (mRes?.value) setMedLog(JSON.parse(mRes.value));
        if (bRes?.value) setBpLogs(JSON.parse(bRes.value));
      } catch(e) { setStorageErr(true); }
      setLoading(false);
      setNotifOk(typeof Notification!=="undefined" && Notification.permission==="granted");
    })();
  }, []);

  // ── Reminder interval ───────────────────────────────────────
  useEffect(() => {
    if (!notifOk) return;
    const iv = setInterval(() => {
      const h = new Date().getHours(), m = new Date().getMinutes();
      if (h===8 && m===0)  new Notification("🌸 Good Morning, Aparajita!", {body:"Time for your morning medications 💜"});
      if (h===22 && m===0) new Notification("🌙 Evening, Aparajita",        {body:"Don't forget your night medications 🌿"});
    }, 60000);
    return () => clearInterval(iv);
  }, [notifOk]);

  // ── Toggle med ──────────────────────────────────────────────
  const toggleMed = useCallback(async (id) => {
    const updated = {...medLog, [id]: !medLog[id]};
    setMedLog(updated);
    setPopId(id); setTimeout(()=>setPopId(null), 320);
    try { await store.set(`med:${todayStr()}`, JSON.stringify(updated)); } catch(e) {}
  }, [medLog]);

  // ── Add BP ──────────────────────────────────────────────────
  const addBp = useCallback(async () => {
    if (!bpForm.sys || !bpForm.dia) return;
    const entry = {
      id: Date.now(),
      date: todayStr(),
      displayDate: fmtDate(new Date()),
      time: new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}),
      systolic:  parseInt(bpForm.sys),
      diastolic: parseInt(bpForm.dia),
      pulse:     bpForm.pulse ? parseInt(bpForm.pulse) : null,
      notes:     bpForm.notes,
    };
    const updated = [entry, ...bpLogs].slice(0, 200);
    setBpLogs(updated);
    setBpForm({sys:"",dia:"",pulse:"",notes:""});
    setBpSaved(true); setTimeout(()=>setBpSaved(false), 2200);
    try { await store.set("bp_logs", JSON.stringify(updated)); } catch(e) {}
  }, [bpForm, bpLogs]);

  // ── Request notifs ──────────────────────────────────────────
  const requestNotifs = async () => {
    if ("Notification" in window) {
      const p = await Notification.requestPermission();
      setNotifOk(p==="granted");
    }
  };

  // ── Derived ─────────────────────────────────────────────────
  const meds    = activeMeds();
  const morning = meds.filter(m=>m.slot==="morning");
  const night   = meds.filter(m=>m.slot==="night");
  const taken   = meds.filter(m=>medLog[m.id]).length;
  const total   = meds.length;
  const pct     = total > 0 ? taken/total : 0;
  const C       = 2*Math.PI*44;            // circumference r=44
  const offset  = C*(1-pct);

  const chartData = [...bpLogs].slice(0,20).reverse().map(b=>({
    date: b.displayDate||b.date.slice(5),
    Systolic:  b.systolic,
    Diastolic: b.diastolic,
  }));

  const latest = bpLogs[0];
  const dateDisp = new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"});

  if (loading) return (
    <div className="ap-root" style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}>
      <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:"1.6rem",color:"var(--muted)"}}>
        Loading…
      </div>
    </div>
  );

  return (
    <div className="ap-root">
      {/* Petals */}
      {["p1","p2","p3","p4","p5","p6","p7"].map(c=><div key={c} className={`petal ${c}`}/>)}

      {/* Header */}
      <header className="ap-header">
        <Flower />
        <div className="ap-name">Aparajita</div>
        <div className="ap-subtitle">Health &amp; Wellness Journal</div>
        <div className="ap-date">{dateDisp}</div>
      </header>

      {/* Tabs */}
      <nav className="ap-tabs">
        {[["today","🌸 Today"],["bp","❤️ BP Log"],["history","📋 History"]].map(([k,l])=>(
          <button key={k} className={`ap-tab${tab===k?" active":""}`} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </nav>

      {/* ══════════════ TODAY ══════════════ */}
      {tab==="today" && (
        <div className="page">

          {/* Notif banner */}
          {!notifOk && (
            <button className="btn-notif" onClick={requestNotifs}>
              <span style={{fontSize:"1.4rem"}}>🔔</span>
              <div>
                <div style={{fontSize:".82rem",fontWeight:600,color:"#C4ADFF"}}>Enable Reminders</div>
                <div style={{fontSize:".68rem",color:"var(--muted)"}}>Notified at 8:00 AM &amp; 10:00 PM daily</div>
              </div>
              <span style={{marginLeft:"auto",fontSize:".75rem",color:"var(--purple)"}}>Allow →</span>
            </button>
          )}
          {notifOk && (
            <div style={{textAlign:"center",fontSize:".7rem",color:"var(--green)",letterSpacing:".05em"}}>
              ✓ Reminders active — 8 AM &amp; 10 PM
            </div>
          )}

          {/* Progress ring */}
          <div className="card" style={{padding:"1.4rem",display:"flex",alignItems:"center",gap:"1.4rem"}}>
            <div style={{position:"relative",width:90,height:90,flexShrink:0}}>
              <svg width="90" height="90" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="44" fill="none" stroke="rgba(180,142,255,.1)" strokeWidth="6"/>
                <circle cx="48" cy="48" r="44" fill="none"
                  stroke={pct===1?"#4ECCA3":"#B48EFF"}
                  strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={C} strokeDashoffset={offset}
                  transform="rotate(-90 48 48)"
                  style={{transition:"stroke-dashoffset .6s ease"}}/>
                <text x="48" y="44" textAnchor="middle" fill="#EEE8FF"
                  fontSize="16" fontFamily="Cormorant Garamond" fontWeight="500">{taken}/{total}</text>
                <text x="48" y="58" textAnchor="middle" fill="#8878A8"
                  fontSize="8" fontFamily="DM Sans">taken</text>
              </svg>
            </div>
            <div>
              <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:"1.5rem",color:"var(--text)",lineHeight:1.2}}>
                {pct===1 ? "All done today! 🎉" : pct>.5 ? "Almost there 💜" : "Morning routine"}
              </div>
              <div style={{fontSize:".72rem",color:"var(--muted)",marginTop:".3rem"}}>
                {total-taken} medication{total-taken!==1?"s":""} remaining
              </div>
              {!isSunday() && (
                <div style={{fontSize:".65rem",color:"#F7C948",marginTop:".2rem"}}>
                  ☀️ Purevise 60k: take this Sunday
                </div>
              )}
            </div>
          </div>

          {/* Morning */}
          <div>
            <div className="sec">🌅 Morning</div>
            <div style={{display:"flex",flexDirection:"column",gap:".45rem"}}>
              {morning.map(m=>{
                const locked = m.sundayOnly && !isSunday();
                return (
                <div key={m.id}
                  className={`med-row${(medLog[m.id]||locked)?" taken":""}`}
                  style={locked?{opacity:.48,cursor:"default"}:{}}
                  onClick={()=>!locked&&toggleMed(m.id)}>
                  <div className={`check${medLog[m.id]?" done":""}${popId===m.id?" pop":""}`}
                    style={{borderColor:medLog[m.id]?"#4ECCA3":locked?"var(--dim)":m.color}}>
                    {medLog[m.id] && "✓"}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:".9rem",fontWeight:600,color:(medLog[m.id]||locked)?"var(--dim)":"var(--text)",textDecoration:medLog[m.id]?"line-through":"none"}}>
                      {m.name}
                    </div>
                    <div style={{fontSize:".68rem",color:"var(--dim)"}}>{m.generic} · {m.purpose}</div>
                    {locked && <div style={{fontSize:".6rem",color:"#F7C948",marginTop:".15rem"}}>☀️ Only on Sundays</div>}
                  </div>
                  <div style={{fontSize:".6rem",color:"var(--dim)",textAlign:"right",flexShrink:0}}>
                    {m.doctor}
                  </div>
                </div>
              );})}
            </div>
          </div>

          {/* Night */}
          <div>
            <div className="sec">🌙 Night</div>
            <div style={{display:"flex",flexDirection:"column",gap:".45rem"}}>
              {night.map(m=>(
                <div key={m.id} className={`med-row${medLog[m.id]?" taken":""}`} onClick={()=>toggleMed(m.id)}>
                  <div className={`check${medLog[m.id]?" done":""}${popId===m.id?" pop":""}`}
                    style={{borderColor:medLog[m.id]?"#4ECCA3":m.color}}>
                    {medLog[m.id] && "✓"}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:".9rem",fontWeight:600,color:medLog[m.id]?"var(--dim)":"var(--text)",textDecoration:medLog[m.id]?"line-through":"none"}}>
                      {m.name}
                    </div>
                    <div style={{fontSize:".68rem",color:"var(--dim)"}}>{m.generic} · {m.purpose}</div>
                  </div>
                  <div style={{fontSize:".6rem",color:"var(--dim)",textAlign:"right",flexShrink:0}}>
                    {m.doctor}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Quote */}
          <DailyQuote />

        </div>
      )}

      {/* ══════════════ BP LOG ══════════════ */}
      {tab==="bp" && (
        <div className="page">

          {/* Latest reading */}
          {latest && (()=>{
            const s = getBpStatus(latest.systolic, latest.diastolic);
            return (
              <div className="card" style={{padding:"1.4rem",textAlign:"center"}}>
                <div style={{fontSize:".65rem",color:"var(--muted)",letterSpacing:".12em",textTransform:"uppercase",marginBottom:".5rem"}}>Latest Reading</div>
                <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:"3.2rem",fontWeight:300,color:s.color,lineHeight:1}}>
                  {latest.systolic}<span style={{fontSize:"1.4rem",color:"var(--dim)"}}>/{latest.diastolic}</span>
                </div>
                <div style={{fontSize:".72rem",color:"var(--muted)",marginTop:".25rem"}}>{latest.date} · {latest.time}</div>
                <div style={{marginTop:".5rem"}}>
                  <span className="bp-badge" style={{background:`${s.color}22`,color:s.color,border:`1px solid ${s.color}44`}}>{s.label}</span>
                </div>
                {latest.pulse && <div style={{fontSize:".72rem",color:"var(--muted)",marginTop:".4rem"}}>💓 {latest.pulse} bpm</div>}
                {latest.notes && <div style={{fontSize:".72rem",color:"var(--muted)",marginTop:".3rem",fontStyle:"italic"}}>"{latest.notes}"</div>}
              </div>
            );
          })()}

          {/* Trend chart */}
          {chartData.length > 1 && (
            <div className="card" style={{padding:"1.2rem"}}>
              <div className="sec">📈 Trend</div>
              <ResponsiveContainer width="100%" height={155}>
                <AreaChart data={chartData} margin={{top:4,right:4,left:-20,bottom:0}}>
                  <defs>
                    <linearGradient id="gSys" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#B48EFF" stopOpacity={.35}/>
                      <stop offset="95%" stopColor="#B48EFF" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gDia" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#7EB8F7" stopOpacity={.3}/>
                      <stop offset="95%" stopColor="#7EB8F7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/>
                  <XAxis dataKey="date" tick={{fill:"#4A3D65",fontSize:9}} axisLine={false} tickLine={false}/>
                  <YAxis domain={[55,185]} tick={{fill:"#4A3D65",fontSize:9}} axisLine={false} tickLine={false}/>
                  <ReferenceLine y={120} stroke="rgba(247,201,72,.28)" strokeDasharray="4 4"/>
                  <ReferenceLine y={80}  stroke="rgba(126,184,247,.25)" strokeDasharray="4 4"/>
                  <Tooltip content={<CTip/>}/>
                  <Area type="monotone" dataKey="Systolic"  stroke="#B48EFF" strokeWidth={2} fill="url(#gSys)" dot={{fill:"#B48EFF",r:3,strokeWidth:0}}/>
                  <Area type="monotone" dataKey="Diastolic" stroke="#7EB8F7" strokeWidth={2} fill="url(#gDia)" dot={{fill:"#7EB8F7",r:3,strokeWidth:0}}/>
                </AreaChart>
              </ResponsiveContainer>
              <div style={{display:"flex",gap:"1rem",marginTop:".4rem",justifyContent:"center"}}>
                <span style={{fontSize:".65rem",color:"#B48EFF"}}>● Systolic</span>
                <span style={{fontSize:".65rem",color:"#7EB8F7"}}>● Diastolic</span>
              </div>
            </div>
          )}

          {/* Log form */}
          <div className="card" style={{padding:"1.2rem"}}>
            <div className="sec">➕ Log Reading</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".65rem",marginBottom:".65rem"}}>
              {[
                {key:"sys",  label:"Systolic *",  ph:"120"},
                {key:"dia",  label:"Diastolic *", ph:"80"},
                {key:"pulse",label:"Pulse (bpm)", ph:"72"},
                {key:"notes",label:"Notes",       ph:"After rest…", type:"text"},
              ].map(f=>(
                <div key={f.key} style={f.key==="notes"?{gridColumn:"span 2"}:{}}>
                  <label className="inp-label">{f.label}</label>
                  <input className="inp"
                    type={f.type||"number"}
                    placeholder={f.ph}
                    value={bpForm[f.key]}
                    onChange={e=>setBpForm({...bpForm,[f.key]:e.target.value})}
                    onKeyDown={e=>e.key==="Enter"&&addBp()}
                  />
                </div>
              ))}
            </div>
            <button className={`btn-primary${bpSaved?" success":""}`} onClick={addBp}>
              {bpSaved ? "✓ Saved!" : "Save Reading"}
            </button>
          </div>

          {/* Reference table */}
          <div className="card" style={{padding:"1rem"}}>
            <div style={{fontSize:".65rem",color:"var(--muted)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:".5rem"}}>BP Reference</div>
            {[
              {l:"Normal",       r:"< 120/80",         c:"#4ECCA3"},
              {l:"Elevated",     r:"120–129 / < 80",   c:"#F7C948"},
              {l:"Stage 1 High", r:"130–139 / 80–89",  c:"#F5A623"},
              {l:"Stage 2 High", r:"≥ 140 / ≥ 90",     c:"#FF6B6B"},
            ].map((t,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:".32rem 0",borderBottom:i<3?"1px solid rgba(255,255,255,.04)":"none"}}>
                <span style={{fontSize:".76rem",color:t.c}}>{t.l}</span>
                <span style={{fontSize:".68rem",color:"var(--dim)"}}>{t.r}</span>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* ══════════════ HISTORY ══════════════ */}
      {tab==="history" && (
        <div className="page">
          <div className="sec">❤️ BP Log History</div>

          {bpLogs.length===0 ? (
            <div style={{textAlign:"center",padding:"3rem 1rem",fontFamily:"Cormorant Garamond,serif",fontSize:"1.2rem",color:"var(--dim)"}}>
              No readings yet.<br/>
              <span style={{fontSize:".8rem",fontFamily:"DM Sans"}}>Log your first BP reading above 💜</span>
            </div>
          ) : bpLogs.map(bp=>{
            const s = getBpStatus(bp.systolic, bp.diastolic);
            return (
              <div key={bp.id} className="card" style={{padding:".95rem 1rem",display:"flex",justifyContent:"space-between",alignItems:"center",gap:"1rem"}}>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:"1.7rem",color:s.color,lineHeight:1}}>
                    {bp.systolic}<span style={{fontSize:".9rem",color:"var(--dim)"}}>/{bp.diastolic}</span>
                  </div>
                  <div style={{fontSize:".62rem",color:"var(--dim)",marginTop:".18rem"}}>
                    {bp.date} · {bp.time}{bp.pulse?` · 💓 ${bp.pulse} bpm`:""}
                  </div>
                  {bp.notes && <div style={{fontSize:".67rem",color:"var(--muted)",marginTop:".18rem",fontStyle:"italic"}}>"{bp.notes}"</div>}
                </div>
                <span className="bp-badge" style={{background:`${s.color}22`,color:s.color,border:`1px solid ${s.color}44`,whiteSpace:"nowrap",flexShrink:0}}>
                  {s.label}
                </span>
              </div>
            );
          })}

          {bpLogs.length > 0 && (
            <div style={{textAlign:"center",fontSize:".68rem",color:"var(--dim)",paddingBottom:".5rem"}}>
              {bpLogs.length} reading{bpLogs.length!==1?"s":""} stored · synced across devices
            </div>
          )}
        </div>
      )}

      {/* Footer glow */}
      <div style={{height:"2rem",background:"linear-gradient(to top,rgba(55,15,110,.2),transparent)",pointerEvents:"none"}}/>
    </div>
  );
}
