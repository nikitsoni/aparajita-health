import { db } from "./db.js";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
  BarChart, Bar, Cell
} from "recharts";

// ── Medications ──────────────────────────────────────────────
const MEDS = [
  // ── Morning (after breakfast) ───────────────────────────
  { id:"stamlo",    name:"Stamlo 5mg",  generic:"Amlodipine 5mg",      purpose:"Blood Pressure",     slot:"morning",   color:"#B48EFF", note:"After breakfast", doctor:"Dr. Hansra" },
  { id:"trazer_m",  name:"Trazer HD",   generic:"Powder supplement",   purpose:"Bone & Nutrition",   slot:"morning",   color:"#4ECCA3", note:"After breakfast · powder", doctor:"Dr. Sunaina Dubey", isPowder:true },
  // ── Afternoon (Sunday only) ─────────────────────────────
  { id:"tracnil",   name:"Tracnil M",   generic:"Tracnil M",           purpose:"Gynaecology",         slot:"afternoon", color:"#F472B6", note:"After lunch",          doctor:"Gynaecologist", duration:"×3 months" },
  { id:"purevise",  name:"Purevise 60k",generic:"Vitamin D3 60,000 IU",purpose:"Vitamin D",          slot:"afternoon", color:"#F7C948", sundayOnly:true, note:"After lunch", doctor:"Dr. Sunaina Dubey" },
  // ── Night / Dinner ──────────────────────────────────────
  { id:"codesoft_m", name:"Codesoft XT", generic:"Codesoft XT", purpose:"Supplement",        slot:"morning", color:"#34D399", note:"After breakfast", doctor:"Gynaecologist", duration:"×15 days" },
  { id:"codesoft_n", name:"Codesoft XT", generic:"Codesoft XT", purpose:"Supplement",        slot:"night",   color:"#34D399", note:"After dinner",    doctor:"Gynaecologist", duration:"×15 days" },
  { id:"trazer_n",  name:"Trazer HD",   generic:"Powder supplement",   purpose:"Bone & Nutrition",   slot:"night",     color:"#4ECCA3", note:"After dinner · powder", doctor:"Dr. Sunaina Dubey", isPowder:true },
  { id:"tofanol",   name:"Tofanol 5mg", generic:"Tofacitinib 5mg",     purpose:"Rheumatoid Arthritis",slot:"night",    color:"#7EB8F7", note:"After dinner", doctor:"Dr. Nitesh Jain" },
];

// ── Quotes ───────────────────────────────────────────────────
// ── Skincare (Dr. Suchita Parab) ────────────────────────────
const SKINCARE = [
  { id:"sk_fullnoir", icon:"🌿", label:"Serum Fullnoir / Densita", slot:"morning",   note:"Grey hair areas",                   doctor:"Dr. Suchita Parab", duration:"×60d" },
  { id:"sk_blemgard", icon:"💧", label:"Serum Blemgard",           slot:"morning",   note:"Niacinamide 10%",                   doctor:"Dr. Suchita Parab", duration:"×60d" },
  { id:"sk_sun1",     icon:"☀️", label:"LA Shield Sunscreen",      slot:"morning",   note:"1st application",                   doctor:"Dr. Suchita Parab", duration:"×30d" },
  { id:"sk_sun2",     icon:"☀️", label:"LA Shield Sunscreen",      slot:"afternoon", note:"2nd application",                   doctor:"Dr. Suchita Parab", duration:"×30d" },
  { id:"sk_sun3",     icon:"☀️", label:"LA Shield Sunscreen",      slot:"night",     note:"3rd application",                   doctor:"Dr. Suchita Parab", duration:"×30d" },
  { id:"sk_vb7",      icon:"💊", label:"VB7 Blak Tablet",          slot:"night",     note:"Evening",                           doctor:"Dr. Suchita Parab", duration:"×60d" },
  { id:"sk_retijoy",  icon:"✨", label:"Serum Retijoy",            slot:"night",     note:"Evening",                           doctor:"Dr. Suchita Parab", duration:"×60d" },
  { id:"sk_cutiyt",   icon:"🧴", label:"Lotion Cutiyt G12",        slot:"night",     note:"Thin layer · old marks · arms/thigh",doctor:"Dr. Suchita Parab", duration:"×60d" },
];

const QUOTES = [
  { text:"She overcomes. Every single day.", author:"The meaning of Aparajita" },
  { text:"Taking your meds is an act of self-love.", author:"" },
  { text:"Small consistent steps build the strongest health.", author:"" },
  { text:"Your body is doing its best — support it.", author:"" },
  { text:"Rest, heal, and rise. You are undefeated.", author:"" },
  { text:"Every pill taken is a promise kept to yourself.", author:"" },
  { text:"Healing is not linear, but you are always moving forward.", author:"" },
  { text:"Strength isn't the absence of struggle — it's continuing through it.", author:"" },
  { text:"You are not your diagnosis. You are so much more.", author:"" },
  { text:"Nourish your body. It carries you through everything.", author:"" },
  { text:"Today's routines are tomorrow's resilience.", author:"" },
  { text:"Be gentle with yourself. You are a work in progress.", author:"" },
  { text:"Your health is the most important project you'll ever manage.", author:"" },
  { text:"Every morning you wake up and try again is a victory.", author:"" },
  { text:"Consistency is the quiet superpower of every healthy person.", author:"" },
  { text:"Taking care of yourself is the most radical thing you can do.", author:"" },
  { text:"You have survived every hard day so far. Today is no different.", author:"" },
  { text:"One day at a time. One dose at a time. One breath at a time.", author:"" },
  { text:"Your future self is grateful for what you do today.", author:"" },
  { text:"Healing requires patience, persistence, and a whole lot of heart.", author:"" },
  { text:"Every storm runs out of rain. Keep going.", author:"" },
  { text:"You are braver than you believe, stronger than you seem.", author:"A.A. Milne" },
  { text:"Health is not a destination. It's a daily practice of love.", author:"" },
  { text:"She believed she could, so she did.", author:"" },
  { text:"Even the darkest night will end, and the sun will rise.", author:"Victor Hugo" },
  { text:"Aparajita — the one who cannot be defeated.", author:"Sanskrit" },
  { text:"Fall seven times, stand up eight.", author:"Japanese Proverb" },
  { text:"Be the reason you smile today.", author:"" },
  { text:"Courage is resistance to fear, not absence of it.", author:"Mark Twain" },
  { text:"The secret of getting ahead is getting started.", author:"Mark Twain" },
  { text:"What you do today can improve all your tomorrows.", author:"Ralph Marston" },
];

// ── Badges ───────────────────────────────────────────────────
const totalPills = h => h.reduce((a,d)=>a+(d.taken||0),0);
const maxPerfectStreak = h => {
  let max=0,cur=0;
  [...h].sort((a,b)=>a.date<b.date?-1:1).forEach(d=>{if(d.pct>=1){cur++;max=Math.max(max,cur);}else cur=0;});
  return max;
};
const BADGES = [
  { id:"first",    icon:"🌱", name:"First Step",     desc:"Logged your very first day",    check:(_,h)=>h.length>=1 },
  { id:"streak3",  icon:"✨", name:"3-Day Glow",     desc:"3 days in a row",               check:(s)=>s>=3 },
  { id:"streak7",  icon:"🔥", name:"Week Warrior",   desc:"7-day streak",                  check:(s)=>s>=7 },
  { id:"streak14", icon:"💜", name:"Fortnight",      desc:"14-day streak",                 check:(s)=>s>=14 },
  { id:"streak30", icon:"🌟", name:"Monthly Marvel", desc:"30-day streak",                 check:(s)=>s>=30 },
  { id:"pills50",  icon:"💊", name:"Pill Fifty",     desc:"50 pills taken total",          check:(_,h)=>totalPills(h)>=50 },
  { id:"pills100", icon:"⚡", name:"Centurion",      desc:"100 pills taken",               check:(_,h)=>totalPills(h)>=100 },
  { id:"perfect7", icon:"🏆", name:"Perfect Week",   desc:"7 consecutive perfect days",    check:(_,h)=>maxPerfectStreak(h)>=7 },
  { id:"aparajita",icon:"🌸", name:"Aparajita",      desc:"30 perfect days — undefeated",  check:(_,h)=>maxPerfectStreak(h)>=30 },
];

// ── Helpers ──────────────────────────────────────────────────
const todayStr  = () => new Date().toISOString().split("T")[0];
const isSunday  = () => new Date().getDay()===0;
const fmtDate   = d => new Date(d+"T12:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short"});
const fmtDay    = d => new Date(d+"T12:00:00").toLocaleDateString("en-IN",{weekday:"short"});
const MONTHS    = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const getDailyQuote = () => {
  const day = Math.floor((new Date()-new Date("2024-01-01"))/(864e5));
  return QUOTES[day%QUOTES.length];
};
const getBpStatus = (s,d) => {
  if(s<120&&d<80)  return {label:"Normal",      color:"#4ECCA3"};
  if(s<130&&d<80)  return {label:"Elevated",    color:"#F7C948"};
  if(s<140||d<90)  return {label:"Stage 1 High",color:"#F5A623"};
                   return {label:"Stage 2 High",color:"#FF6B6B"};
};
const heatColor = pct => {
  if(pct===undefined||pct===null) return "rgba(255,255,255,0.04)";
  if(pct===0)   return "rgba(255,107,107,0.25)";
  if(pct<0.5)   return "rgba(245,166,35,0.3)";
  if(pct<1)     return "rgba(180,142,255,0.4)";
               return "rgba(78,204,163,0.65)";
};

// ── CSV Export ───────────────────────────────────────────────
function downloadCSV(filename, rows, headers) {
  const csv = [headers.join(","), ...rows.map(r => headers.map(h => `"${(r[h]??"")}"`).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
  a.download = filename; a.click();
}

// ── CSS ──────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
:root{--bg:#07050F;--card:rgba(255,255,255,0.04);--border:rgba(180,142,255,0.14);--text:#EEE8FF;--muted:#8878A8;--dim:#4A3D65;--purple:#B48EFF;--blue:#7EB8F7;--pink:#FF9CC2;--gold:#F7C948;--green:#4ECCA3;}
body{background:var(--bg);}
@keyframes drift{0%{transform:translateY(110vh) rotate(0deg) scale(1);opacity:0;}8%{opacity:.55;}92%{opacity:.2;}100%{transform:translateY(-15vh) rotate(480deg) scale(0.7);opacity:0;}}
.petal{position:fixed;pointer-events:none;z-index:0;width:7px;height:11px;border-radius:70% 30% 70% 30%/40% 60% 40% 60%;animation:drift linear infinite;}
.p1{left:7%;background:rgba(180,142,255,.5);animation-duration:14s;animation-delay:0s;}
.p2{left:22%;background:rgba(255,156,194,.4);animation-duration:18s;animation-delay:4s;}
.p3{left:40%;background:rgba(126,184,247,.45);animation-duration:11s;animation-delay:8s;}
.p4{left:60%;background:rgba(180,142,255,.4);animation-duration:16s;animation-delay:2s;}
.p5{left:77%;background:rgba(217,160,255,.5);animation-duration:12s;animation-delay:6s;}
.p6{left:90%;background:rgba(255,156,194,.35);animation-duration:20s;animation-delay:1s;}
.p7{left:50%;background:rgba(247,201,72,.3);animation-duration:15s;animation-delay:10s;}
.ap-root{min-height:100vh;background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;position:relative;overflow-x:hidden;}
@keyframes bloom{from{filter:drop-shadow(0 0 10px rgba(180,142,255,.5));}to{filter:drop-shadow(0 0 22px rgba(180,142,255,.9));}}
.ap-flower{width:64px;height:64px;margin:0 auto .7rem;filter:drop-shadow(0 0 14px rgba(180,142,255,.65));animation:bloom 3s ease-in-out infinite alternate;}
.ap-header{position:relative;z-index:1;padding:1.8rem 1.5rem 1.4rem;background:linear-gradient(165deg,rgba(55,15,110,.65) 0%,rgba(7,5,15,0) 75%);border-bottom:1px solid var(--border);text-align:center;}
.ap-name{font-family:'Cormorant Garamond',serif;font-size:2.6rem;font-weight:300;letter-spacing:.14em;color:var(--text);line-height:1;}
.ap-subtitle{font-size:.68rem;color:var(--muted);letter-spacing:.3em;text-transform:uppercase;margin-top:.35rem;}
.ap-date{font-size:.72rem;color:var(--dim);margin-top:.35rem;}
.ap-tabs{display:flex;background:rgba(255,255,255,0.025);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:10;}
.ap-tab{flex:1;padding:.75rem .3rem;background:none;border:none;color:var(--muted);font-family:'DM Sans',sans-serif;font-size:.62rem;font-weight:500;letter-spacing:.07em;text-transform:uppercase;cursor:pointer;transition:all .2s;border-bottom:2px solid transparent;}
.ap-tab.active{color:var(--purple);border-bottom-color:var(--purple);background:rgba(180,142,255,.05);}
.card{background:var(--card);border:1px solid var(--border);border-radius:16px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);}
.med-row{display:flex;align-items:center;gap:.9rem;padding:.9rem 1rem;border-radius:12px;border:1px solid rgba(255,255,255,0.05);background:rgba(255,255,255,0.015);cursor:pointer;transition:all .18s;user-select:none;}
.med-row:hover{background:rgba(180,142,255,.07);border-color:rgba(180,142,255,.18);}
.med-row.taken{opacity:.45;background:rgba(78,204,163,.04);border-color:rgba(78,204,163,.12);}
.check{width:28px;height:28px;border-radius:50%;border:2px solid;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:13px;transition:all .2s;}
.check.done{background:var(--green);border-color:var(--green);color:#072315;}
@keyframes pop{0%{transform:scale(1)}50%{transform:scale(1.35)}100%{transform:scale(1)}}
.pop{animation:pop .28s ease;}
.inp{background:rgba(255,255,255,.045);border:1px solid rgba(180,142,255,.2);border-radius:10px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:.88rem;padding:.7rem .95rem;outline:none;width:100%;transition:border-color .2s;}
.inp:focus{border-color:rgba(180,142,255,.5);}
.inp::placeholder{color:var(--dim);}
.inp-label{font-size:.6rem;color:var(--muted);display:block;margin-bottom:.28rem;letter-spacing:.08em;text-transform:uppercase;}
.btn-primary{background:linear-gradient(135deg,#6D28D9,#B48EFF);border:none;border-radius:12px;color:#fff;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.82rem;font-weight:600;letter-spacing:.07em;padding:.82rem 1.5rem;text-transform:uppercase;transition:all .2s;width:100%;}
.btn-primary:hover{transform:translateY(-1px);box-shadow:0 5px 22px rgba(109,40,217,.45);}
.btn-primary.success{background:linear-gradient(135deg,#065F46,#4ECCA3);}
.btn-export{background:rgba(78,204,163,.1);border:1px solid rgba(78,204,163,.25);border-radius:10px;color:var(--green);cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.75rem;font-weight:600;padding:.6rem 1rem;transition:all .2s;display:flex;align-items:center;gap:.4rem;}
.btn-export:hover{background:rgba(78,204,163,.2);}
.btn-notif{background:linear-gradient(135deg,rgba(109,40,217,.22),rgba(255,156,194,.1));border:1px solid rgba(180,142,255,.22);border-radius:12px;padding:.9rem 1rem;display:flex;align-items:center;gap:.7rem;cursor:pointer;transition:all .2s;width:100%;text-align:left;color:var(--text);font-family:'DM Sans',sans-serif;}
.btn-notif:hover{background:rgba(109,40,217,.3);}
.sec{font-family:'Cormorant Garamond',serif;font-size:1.15rem;font-weight:400;color:#C4ADFF;letter-spacing:.04em;margin-bottom:.65rem;display:flex;align-items:center;gap:.4rem;}
.page{padding:1.2rem;display:flex;flex-direction:column;gap:1.15rem;position:relative;z-index:1;}
.bp-badge{display:inline-flex;align-items:center;padding:.2rem .6rem;border-radius:20px;font-size:.66rem;font-weight:600;letter-spacing:.04em;}
.ct{background:rgba(18,8,38,.96);border:1px solid rgba(180,142,255,.22);border-radius:8px;padding:8px 12px;font-family:'DM Sans',sans-serif;font-size:.72rem;color:var(--text);}
.ct-label{color:var(--muted);margin-bottom:4px;}
.badge-card{display:flex;flex-direction:column;align-items:center;gap:.3rem;padding:.8rem .5rem;border-radius:12px;border:1px solid;text-align:center;transition:all .3s;}
.badge-card.earned{background:rgba(180,142,255,.08);border-color:rgba(180,142,255,.3);}
.badge-card.locked{background:rgba(255,255,255,.02);border-color:rgba(255,255,255,.06);opacity:.4;filter:grayscale(1);}
.heat-cell{width:100%;aspect-ratio:1;border-radius:4px;transition:all .2s;cursor:default;}
.sync-dot{width:6px;height:6px;border-radius:50%;display:inline-block;margin-right:.3rem;}
.sync-dot.ok{background:#4ECCA3;}
.sync-dot.err{background:#FF6B6B;}
.sync-dot.loading{background:#F7C948;animation:pulse 1s infinite;}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.fade-up{animation:fadeUp .4s ease forwards;}
.wellness-row{display:flex;align-items:center;gap:.9rem;padding:.65rem 1rem;border-radius:12px;border:1px solid rgba(78,204,163,0.1);background:rgba(78,204,163,0.03);cursor:pointer;transition:all .18s;user-select:none;}
.wellness-row:hover{background:rgba(78,204,163,.07);border-color:rgba(78,204,163,.2);}
.wellness-row.wdone{opacity:.5;}
.wellness-check{width:24px;height:24px;border-radius:7px;border:2px solid rgba(78,204,163,.35);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:11px;transition:all .2s;}
.wellness-check.wdone{background:rgba(78,204,163,.2);border-color:#4ECCA3;color:#4ECCA3;}
.sk-row{display:flex;align-items:center;gap:.9rem;padding:.65rem 1rem;border-radius:12px;border:1px solid rgba(255,156,194,0.12);background:rgba(255,156,194,0.03);cursor:pointer;transition:all .18s;user-select:none;}
.sk-row:hover{background:rgba(255,156,194,.07);border-color:rgba(255,156,194,.2);}
.sk-row.skdone{opacity:.5;}
.sk-check{width:24px;height:24px;border-radius:7px;border:2px solid rgba(255,156,194,.35);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:11px;transition:all .2s;}
.sk-check.skdone{background:rgba(255,156,194,.2);border-color:#FF9CC2;color:#FF9CC2;}
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.78);backdrop-filter:blur(6px);z-index:100;display:flex;align-items:flex-end;justify-content:center;padding:1rem;}
.modal{background:#120A28;border:1px solid rgba(180,142,255,.25);border-radius:20px 20px 16px 16px;width:100%;max-width:480px;max-height:85vh;overflow-y:auto;padding:1.4rem;animation:slideUp .25s ease;}
.modal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.1rem;}
.modal-title{font-family:'Cormorant Garamond',serif;font-size:1.4rem;color:var(--text);}
.modal-close{background:rgba(255,255,255,.07);border:none;border-radius:50%;width:30px;height:30px;color:var(--muted);cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;}
.edit-btn{background:rgba(180,142,255,.08);border:1px solid rgba(180,142,255,.2);border-radius:8px;color:var(--purple);cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.65rem;font-weight:600;padding:.25rem .6rem;transition:all .2s;flex-shrink:0;}
.edit-btn:hover{background:rgba(180,142,255,.18);}
@keyframes slideUp{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.78);backdrop-filter:blur(6px);z-index:100;display:flex;align-items:flex-end;justify-content:center;padding:1rem;}
.modal{background:#120A28;border:1px solid rgba(180,142,255,.25);border-radius:20px 20px 16px 16px;width:100%;max-width:480px;max-height:85vh;overflow-y:auto;padding:1.4rem;animation:slideUp .25s ease;}
.modal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.1rem;}
.modal-title{font-family:'Cormorant Garamond',serif;font-size:1.4rem;color:var(--text);}
.modal-close{background:rgba(255,255,255,.07);border:none;border-radius:50%;width:30px;height:30px;color:var(--muted);cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;}
.edit-btn{background:rgba(180,142,255,.08);border:1px solid rgba(180,142,255,.2);border-radius:8px;color:var(--purple);cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.65rem;font-weight:600;padding:.25rem .6rem;transition:all .2s;flex-shrink:0;}
.edit-btn:hover{background:rgba(180,142,255,.18);}
@keyframes slideUp{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}
`;

// ── Flower ───────────────────────────────────────────────────
function Flower(){
  return(
    <svg viewBox="0 0 100 100" className="ap-flower">
      {[0,72,144,216,288].map((a,i)=>(
        <g key={i} transform={`rotate(${a} 50 50)`}>
          <ellipse cx="50" cy="26" rx="9" ry="20"
            fill={i%2===0?"rgba(180,142,255,0.8)":"rgba(217,160,255,0.65)"}
            stroke="rgba(255,255,255,0.15)" strokeWidth="0.5"/>
        </g>
      ))}
      <circle cx="50" cy="50" r="13" fill="rgba(247,201,72,0.15)"/>
      <circle cx="50" cy="50" r="10" fill="#F7C948" opacity=".92"/>
      <circle cx="50" cy="50" r="6.5" fill="#E8A820"/>
      {[0,60,120,180,240,300].map((a,i)=>{
        const x=50+8.5*Math.cos(a*Math.PI/180),y=50+8.5*Math.sin(a*Math.PI/180);
        return<circle key={i} cx={x} cy={y} r="1.6" fill="#FFD97D"/>;
      })}
    </svg>
  );
}

function CTip({active,payload,label}){
  if(!active||!payload?.length) return null;
  return<div className="ct"><div className="ct-label">{label}</div>{payload.map(p=><div key={p.name} style={{color:p.color}}>{p.name}: {p.value}</div>)}</div>;
}

// ── Main App ─────────────────────────────────────────────────
export default function AparajitaHealth(){
  const [tab,      setTab]      = useState("today");
  const [medLog,   setMedLog]   = useState({});
  const [medHist,  setMedHist]  = useState([]);
  const [bpLogs,   setBpLogs]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [syncState,setSyncState]= useState("ok"); // ok | loading | error
  const [notifOk,  setNotifOk]  = useState(false);
  const [popId,    setPopId]    = useState(null);
  const [bpForm,   setBpForm]   = useState({
    sys:"", dia:"", pulse:"", notes:"",
    date: new Date().toISOString().split("T")[0],
    time: new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:false}),
  });
  const [bpSaved,  setBpSaved]  = useState(false);
  const [showDays,  setShowDays]  = useState(30);
  const [editDate,  setEditDate]  = useState(null);   // date string being edited
  const [editLog,  setEditLog]  = useState({});     // log_data for that date
  const [editSaving,setEditSaving]=useState(false);
  const [exporting,setExporting]= useState(false);
  const [exportMonth, setExportMonth] = useState(new Date().getMonth());
  const [exportYear,  setExportYear]  = useState(new Date().getFullYear());
  const saveTimer = useRef(null);

  useEffect(()=>{
    const el=document.createElement("style");
    el.textContent=CSS; document.head.appendChild(el);
    return()=>el.remove();
  },[]);

  useEffect(()=>{
    (async()=>{
      setSyncState("loading");
      try{
        const [mRow, hist, bps] = await Promise.all([
          db.getMedLog(todayStr()),
          db.getMedHistory(120),
          db.getBpLogs(200),
        ]);
        if(mRow?.log_data) setMedLog(mRow.log_data);
        setMedHist(hist);
        setBpLogs(bps);
        setSyncState("ok");
      }catch(e){
        setSyncState("error");
        // fallback to localStorage
        try{
          const m=localStorage.getItem(`med:${todayStr()}`);
          const h=localStorage.getItem("med_history");
          const b=localStorage.getItem("bp_logs");
          if(m) setMedLog(JSON.parse(m));
          if(h) setMedHist(JSON.parse(h));
          if(b) setBpLogs(JSON.parse(b));
        }catch(_){}
      }
      setLoading(false);
      setNotifOk(typeof Notification!=="undefined"&&Notification.permission==="granted");
    })();
  },[]);

  useEffect(()=>{
    if(!notifOk) return;
    const iv=setInterval(()=>{
      const h=new Date().getHours(),m=new Date().getMinutes();
      if(h===8&&m===0)  new Notification("🌸 Good Morning, Aparajita!",{body:"Time for your morning medications 💜"});
      if(h===22&&m===0) new Notification("🌙 Evening, Aparajita",{body:"Don't forget your night medications 🌿"});
    },60000);
    return()=>clearInterval(iv);
  },[notifOk]);

  const syncToSupabase = useCallback((logData, taken, total, pct)=>{
    if(saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async()=>{
      setSyncState("loading");
      try{
        await db.upsertMedLog(todayStr(), logData, taken, total, pct);
        // update med history record for today
        const today = todayStr();
        setMedHist(prev=>{
          const updated=[{date:today,taken,total,pct},...prev.filter(d=>d.date!==today)];
          return updated;
        });
        setSyncState("ok");
      }catch(e){
        setSyncState("error");
        localStorage.setItem(`med:${todayStr()}`,JSON.stringify(logData));
      }
    },800);
  },[]);

  const toggleMed = useCallback((id, countableMeds)=>{
    const updated={...medLog,[id]:!medLog[id]};
    setMedLog(updated);
    setPopId(id); setTimeout(()=>setPopId(null),320);
    const taken=countableMeds.filter(m=>updated[m.id]).length;
    const total=countableMeds.length;
    const pct=total>0?taken/total:0;
    syncToSupabase(updated, taken, total, pct);
  },[medLog, syncToSupabase]);

  const addBp = useCallback(async()=>{
    if(!bpForm.sys||!bpForm.dia) return;
    const entry={
      date: todayStr(),
      time_str: new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}),
      systolic:  parseInt(bpForm.sys),
      diastolic: parseInt(bpForm.dia),
      pulse:     bpForm.pulse?parseInt(bpForm.pulse):null,
      notes:     bpForm.notes||null,
    };
    // optimistic update
    const displayEntry={...entry, id:Date.now(), displayDate:fmtDate(entry.date), time:entry.time_str};
    setBpLogs(prev=>[displayEntry,...prev]);
    setBpForm({sys:"",dia:"",pulse:"",notes:"",
      date:new Date().toISOString().split("T")[0],
      time:new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:false}),
    });
    setBpSaved(true); setTimeout(()=>setBpSaved(false),2200);
    try{ await db.insertBpLog(entry); }
    catch(e){ localStorage.setItem("bp_logs_pending", JSON.stringify(entry)); }
  },[bpForm]);

  const handleExport = useCallback(async()=>{
    setExporting(true);
    try{
      const {meds, bps} = await db.exportMonth(exportYear, exportMonth+1);
      if(meds.length>0){
        downloadCSV(
          `aparajita_meds_${MONTHS[exportMonth]}_${exportYear}.csv`,
          meds,
          ["date","taken","total","pct","updated_at"]
        );
      }
      if(bps.length>0){
        setTimeout(()=>downloadCSV(
          `aparajita_bp_${MONTHS[exportMonth]}_${exportYear}.csv`,
          bps,
          ["date","time_str","systolic","diastolic","pulse","notes","created_at"]
        ),300);
      }
      if(meds.length===0&&bps.length===0) alert("No data found for that month.");
    }catch(e){ alert("Export failed. Check your connection."); }
    setExporting(false);
  },[exportMonth, exportYear]);

  // ── Derived ─────────────────────────────────────────────────

  const openEdit = useCallback(async(date) => {
    setEditDate(date);
    setEditLog({});
    try { const row=await db.getMedLog(date); if(row?.log_data) setEditLog(row.log_data); } catch(e){}
  },[]);

  const saveEdit = useCallback(async() => {
    if(!editDate) return;
    setEditSaving(true);
    const isSun = new Date(editDate+"T12:00:00").getDay()===0;
    const dayMeds = MEDS.filter(m=>!m.sundayOnly||isSun);
    const taken=dayMeds.filter(m=>editLog[m.id]).length;
    const total=dayMeds.length;
    const pct=total>0?taken/total:0;
    try {
      await db.upsertMedLog(editDate,editLog,taken,total,pct);
      setMedHist(prev=>[{date:editDate,taken,total,pct},...prev.filter(d=>d.date!==editDate)]);
    } catch(e){}
    setEditSaving(false);
    setEditDate(null);
  },[editDate,editLog]);

  const countableMeds  = MEDS.filter(m=>!m.sundayOnly||isSunday());
  const morning        = MEDS.filter(m=>m.slot==="morning");
  const afternoon      = MEDS.filter(m=>m.slot==="afternoon");
  const night          = MEDS.filter(m=>m.slot==="night");
  const taken    = countableMeds.filter(m=>medLog[m.id]).length;
  const total    = countableMeds.length;
  const pct      = total>0?taken/total:0;
  const C=2*Math.PI*44, offset=C*(1-pct);

  // Streak from history
  const sortedHist=[...medHist].sort((a,b)=>b.date<a.date?-1:1);
  let streak=0;
  const today=todayStr();
  for(let i=0;i<sortedHist.length;i++){
    const d=sortedHist[i];
    const daysAgo=Math.round((new Date(today)-new Date(d.date))/864e5);
    if(daysAgo===i&&d.pct>=1) streak++;
    else break;
  }

  const earnedBadges=BADGES.filter(b=>b.check(streak,medHist));

  const last7=Array.from({length:7},(_,i)=>{
    const d=new Date(); d.setDate(d.getDate()-6+i);
    const ds=d.toISOString().split("T")[0];
    const rec=medHist.find(h=>h.date===ds);
    return{day:fmtDay(ds),pct:rec?Math.round(rec.pct*100):null,date:ds};
  });

  const heatDays=Array.from({length:35},(_,i)=>{
    const d=new Date(); d.setDate(d.getDate()-34+i);
    const ds=d.toISOString().split("T")[0];
    const rec=medHist.find(h=>h.date===ds);
    return{date:ds,pct:rec?.pct};
  });

  const latest=bpLogs[0];
  const chartData=[...bpLogs].slice(0,20).reverse().map(b=>({
    date:b.displayDate||b.date?.slice(5),
    Systolic:b.systolic, Diastolic:b.diastolic,
  }));
  const q=getDailyQuote();
  const dateDisp=new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"});

  if(loading) return(
    <div className="ap-root" style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",gap:"1rem"}}>
      <Flower/>
      <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:"1.4rem",color:"var(--muted)"}}>Loading Aparajita's journal…</div>
    </div>
  );

  const SyncBadge=()=>(
    <div style={{textAlign:"center",fontSize:".65rem",color:"var(--muted)",letterSpacing:".04em",marginTop:"-.4rem"}}>
      <span className={`sync-dot ${syncState}`}/>
      {syncState==="ok"?"Synced to cloud ☁️":syncState==="loading"?"Syncing…":"Offline — saved locally"}
    </div>
  );

  return(
    <div className="ap-root">
      {["p1","p2","p3","p4","p5","p6","p7"].map(c=><div key={c} className={`petal ${c}`}/>)}

      <header className="ap-header">
        <Flower/>
        <div className="ap-name">Aparajita</div>
        <div className="ap-subtitle">Health &amp; Wellness Journal</div>
        <div className="ap-date">{dateDisp}</div>
      </header>

      <nav className="ap-tabs">
        {[["today","🌸 Today"],["progress","🏆 Progress"],["bp","❤️ BP Log"],["bphist","📋 BP History"]].map(([k,l])=>(
          <button key={k} className={`ap-tab${tab===k?" active":""}`} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </nav>

      {/* ═══ TODAY ═══ */}
      {tab==="today"&&(
        <div className="page">
          <SyncBadge/>
          {!notifOk&&(
            <button className="btn-notif" onClick={async()=>{
              if("Notification"in window){const p=await Notification.requestPermission();setNotifOk(p==="granted");}
            }}>
              <span style={{fontSize:"1.4rem"}}>🔔</span>
              <div><div style={{fontSize:".82rem",fontWeight:600,color:"#C4ADFF"}}>Enable Reminders</div>
              <div style={{fontSize:".68rem",color:"var(--muted)"}}>8:00 AM &amp; 10:00 PM daily</div></div>
              <span style={{marginLeft:"auto",fontSize:".75rem",color:"var(--purple)"}}>Allow →</span>
            </button>
          )}
          {notifOk&&<div style={{textAlign:"center",fontSize:".7rem",color:"var(--green)",letterSpacing:".05em"}}>✓ Reminders active — 8 AM &amp; 10 PM</div>}

          {/* Ring */}
          <div className="card" style={{padding:"1.4rem",display:"flex",alignItems:"center",gap:"1.4rem"}}>
            <svg width="90" height="90" viewBox="0 0 96 96" style={{flexShrink:0}}>
              <circle cx="48" cy="48" r="44" fill="none" stroke="rgba(180,142,255,.1)" strokeWidth="6"/>
              <circle cx="48" cy="48" r="44" fill="none" stroke={pct===1?"#4ECCA3":"#B48EFF"}
                strokeWidth="6" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset}
                transform="rotate(-90 48 48)" style={{transition:"stroke-dashoffset .6s ease"}}/>
              <text x="48" y="44" textAnchor="middle" fill="#EEE8FF" fontSize="16" fontFamily="Cormorant Garamond" fontWeight="500">{taken}/{total}</text>
              <text x="48" y="58" textAnchor="middle" fill="#8878A8" fontSize="8" fontFamily="DM Sans">taken</text>
            </svg>
            <div style={{flex:1}}>
              <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:"1.4rem",color:"var(--text)",lineHeight:1.2}}>
                {pct===1?"All done today! 🎉":pct>.5?"Almost there 💜":"Morning routine"}
              </div>
              <div style={{fontSize:".72rem",color:"var(--muted)",marginTop:".3rem"}}>{total-taken} remaining today</div>
              {streak>0&&(
                <div style={{display:"inline-flex",alignItems:"center",gap:".35rem",marginTop:".5rem",background:"rgba(247,201,72,.1)",border:"1px solid rgba(247,201,72,.25)",borderRadius:"20px",padding:".2rem .65rem"}}>
                  <span>🔥</span><span style={{fontSize:".72rem",color:"#F7C948",fontWeight:600}}>{streak}-day streak</span>
                </div>
              )}
            </div>
          </div>

          {/* Med + Wellness + Skincare sections */}
          {[
            { label:"🌅 Morning",          slot:"morning"   },
            { label:"☀️ Afternoon",         slot:"afternoon" },
            { label:"🌙 Night · Dinner",    slot:"night"     },
          ].map(({label, slot})=>{
            const meds    = MEDS.filter(m=>m.slot===slot);
            const wItems  = WELLNESS.filter(w=>w.slot===slot);
            const skItems = SKINCARE.filter(s=>s.slot===slot);
            if(!meds.length&&!wItems.length&&!skItems.length) return null;
            return(
              <div key={slot}>
                <div className="sec">{label}</div>
                <div style={{display:"flex",flexDirection:"column",gap:".45rem"}}>
                  {/* Meds */}
                  {meds.map(m=>{
                    const locked=m.sundayOnly&&!isSunday();
                    return(
                      <div key={m.id}
                        className={`med-row${(medLog[m.id]||locked)?" taken":""}`}
                        style={locked?{opacity:.48,cursor:"default"}:{}}
                        onClick={()=>!locked&&toggleMed(m.id,countableMeds)}>
                        <div className={`check${medLog[m.id]?" done":""}${popId===m.id?" pop":""}`}
                          style={{borderColor:medLog[m.id]?"#4ECCA3":locked?"var(--dim)":m.color}}>
                          {medLog[m.id]&&"✓"}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:".9rem",fontWeight:600,color:(medLog[m.id]||locked)?"var(--dim)":"var(--text)",textDecoration:medLog[m.id]?"line-through":"none",display:"flex",alignItems:"center",gap:".4rem",flexWrap:"wrap"}}>
                            {m.name}
                            {m.isPowder&&<span style={{fontSize:".55rem",background:"rgba(78,204,163,.15)",color:"#4ECCA3",border:"1px solid rgba(78,204,163,.3)",borderRadius:"8px",padding:".1rem .35rem"}}>powder</span>}
                            {m.duration&&<span style={{fontSize:".55rem",background:"rgba(180,142,255,.1)",color:"var(--purple)",border:"1px solid rgba(180,142,255,.25)",borderRadius:"8px",padding:".1rem .35rem"}}>{m.duration}</span>}
                          </div>
                          <div style={{fontSize:".67rem",color:"var(--dim)",marginTop:".1rem"}}>
                            {m.note||m.generic}
                            {m.doctor&&<span style={{opacity:.7}}> · {m.doctor}</span>}
                          </div>
                          {locked&&<div style={{fontSize:".6rem",color:"#F7C948",marginTop:".15rem"}}>☀️ Only on Sundays</div>}
                        </div>
                        <div style={{width:8,height:8,borderRadius:"50%",background:m.color,flexShrink:0,boxShadow:`0 0 6px ${m.color}`}}/>
                      </div>
                    );
                  })}
                  {/* Wellness (water, egg) */}
                  {wItems.map(w=>{
                    const done=!!medLog[w.id];
                    return(
                      <div key={w.id} className={`wellness-row${done?" wdone":""}`}
                        onClick={()=>toggleMed(w.id,countableMeds)}>
                        <div className={`wellness-check${done?" wdone":""}`}>{done&&"✓"}</div>
                        <span style={{fontSize:"1.1rem"}}>{w.icon}</span>
                        <div style={{flex:1}}>
                          <div style={{fontSize:".85rem",fontWeight:600,color:done?"var(--dim)":"var(--green)",textDecoration:done?"line-through":"none"}}>{w.label}</div>
                          <div style={{fontSize:".65rem",color:"var(--dim)"}}>{w.note}</div>
                        </div>
                      </div>
                    );
                  })}
                  {/* Skincare */}
                  {skItems.length>0&&(
                    <div style={{marginTop:".2rem",display:"flex",flexDirection:"column",gap:".35rem"}}>
                      {skItems.map(s=>{
                        const done=!!medLog[s.id];
                        return(
                          <div key={s.id} className={`sk-row${done?" skdone":""}`}
                            onClick={()=>toggleMed(s.id,countableMeds)}>
                            <div className={`sk-check${done?" skdone":""}`}>{done&&"✓"}</div>
                            <span style={{fontSize:"1.05rem"}}>{s.icon}</span>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:".85rem",fontWeight:600,color:done?"var(--dim)":"#FF9CC2",textDecoration:done?"line-through":"none",display:"flex",alignItems:"center",gap:".3rem",flexWrap:"wrap"}}>
                                {s.label}
                                <span style={{fontSize:".52rem",background:"rgba(255,156,194,.1)",color:"#FF9CC2",border:"1px solid rgba(255,156,194,.25)",borderRadius:"6px",padding:".1rem .3rem"}}>{s.duration}</span>
                              </div>
                              <div style={{fontSize:".63rem",color:"var(--dim)"}}>{s.note}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Quote */}
          <div className="card" style={{padding:"1.4rem 1.3rem",background:"linear-gradient(135deg,rgba(55,15,110,.35),rgba(180,142,255,.06))",borderColor:"rgba(180,142,255,.2)",textAlign:"center",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:"-10px",left:"10px",fontFamily:"Cormorant Garamond,serif",fontSize:"6rem",color:"rgba(180,142,255,.1)",lineHeight:1,userSelect:"none",pointerEvents:"none"}}>"</div>
            <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:"1.15rem",fontWeight:400,fontStyle:"italic",color:"#D4BFFF",lineHeight:1.55,position:"relative",zIndex:1}}>{q.text}</div>
            {q.author&&<div style={{fontSize:".65rem",color:"var(--muted)",marginTop:".7rem",letterSpacing:".1em",textTransform:"uppercase"}}>— {q.author}</div>}
            <div style={{fontSize:".6rem",color:"var(--dim)",marginTop:".5rem"}}>✦ refreshes daily ✦</div>
          </div>
        </div>
      )}

      {/* ═══ PROGRESS ═══ */}
      {tab==="progress"&&(
        <div className="page">
          {/* Stats */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:".65rem"}}>
            {[
              {label:"Streak",     value:`${streak}🔥`, sub:"days"},
              {label:"Total Days", value:medHist.length, sub:"logged"},
              {label:"Pills",      value:totalPills(medHist), sub:"taken"},
            ].map((s,i)=>(
              <div key={i} className="card" style={{padding:"1rem .7rem",textAlign:"center"}}>
                <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:"1.6rem",color:"var(--purple)",lineHeight:1}}>{s.value}</div>
                <div style={{fontSize:".58rem",color:"var(--muted)",marginTop:".25rem",letterSpacing:".06em",textTransform:"uppercase"}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* 7-day chart */}
          <div className="card" style={{padding:"1.2rem"}}>
            <div className="sec">📊 Last 7 Days</div>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={last7} margin={{top:4,right:4,left:-28,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" vertical={false}/>
                <XAxis dataKey="day" tick={{fill:"#4A3D65",fontSize:9}} axisLine={false} tickLine={false}/>
                <YAxis domain={[0,100]} tick={{fill:"#4A3D65",fontSize:9}} axisLine={false} tickLine={false}/>
                <ReferenceLine y={100} stroke="rgba(78,204,163,.2)" strokeDasharray="4 4"/>
                <Tooltip content={({active,payload,label})=>active&&payload?.length?(
                  <div className="ct"><div className="ct-label">{label}</div>
                  <div style={{color:"#B48EFF"}}>{payload[0].value!=null?`${payload[0].value}% complete`:"No data"}</div></div>
                ):null}/>
                <Bar dataKey="pct" radius={[6,6,0,0]}>
                  {last7.map((d,i)=>(
                    <Cell key={i} fill={d.pct===null?"rgba(255,255,255,0.06)":d.pct===100?"#4ECCA3":d.pct>=50?"#B48EFF":"#F5A623"}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Heatmap */}
          <div className="card" style={{padding:"1.2rem"}}>
            <div className="sec">📅 35-Day Heatmap</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"4px",marginBottom:".7rem"}}>
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=>(
                <div key={d} style={{fontSize:".55rem",color:"var(--dim)",textAlign:"center"}}>{d}</div>
              ))}
              {heatDays.map((d,i)=>(
                <div key={i} className="heat-cell" style={{background:heatColor(d.pct)}}
                  title={`${d.date}: ${d.pct!=null?Math.round(d.pct*100)+"% complete":"no data"}`}/>
              ))}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:".6rem",justifyContent:"center",flexWrap:"wrap"}}>
              {[{c:heatColor(undefined),l:"No data"},{c:heatColor(0),l:"0%"},{c:heatColor(0.4),l:"<50%"},{c:heatColor(0.8),l:"<100%"},{c:heatColor(1),l:"Perfect"}].map((x,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:".25rem"}}>
                  <div style={{width:10,height:10,borderRadius:2,background:x.c}}/>
                  <span style={{fontSize:".58rem",color:"var(--dim)"}}>{x.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Daily log */}
          <div>
            <div className="sec">💊 Daily Log <span style={{fontSize:".7rem",color:"var(--dim)",fontFamily:"DM Sans",fontWeight:400}}>— last 30 days</span></div>
            {Array.from({length:showDays},(_,i)=>{
              const d=new Date(); d.setDate(d.getDate()-i);
              const ds=d.toISOString().split("T")[0];
              const rec=medHist.find(h=>h.date===ds);
              const isToday=ds===todayStr();
              if(rec){
                const s=rec.pct>=1?"#4ECCA3":rec.pct>=.5?"#B48EFF":"#F5A623";
                const bar=Math.round((rec.pct||0)*100);
                return(
                  <div key={ds} className="card fade-up" style={{padding:".9rem 1rem",marginBottom:".5rem",display:"flex",alignItems:"center",gap:"1rem"}}>
                    <div style={{flexShrink:0,textAlign:"center",minWidth:48}}>
                      <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:"1.5rem",color:s,lineHeight:1}}>{fmtDate(ds).split(" ")[0]}</div>
                      <div style={{fontSize:".6rem",color:"var(--dim)"}}>{fmtDate(ds).split(" ")[1]}</div>
                      {isToday&&<div style={{fontSize:".5rem",color:"var(--purple)",fontWeight:600,marginTop:".1rem"}}>TODAY</div>}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:".3rem"}}>
                        <span style={{fontSize:".72rem",color:"var(--text)"}}>{rec.taken}/{rec.total} meds</span>
                        <span style={{fontSize:".72rem",color:s,fontWeight:600}}>{bar}%</span>
                      </div>
                      <div style={{height:5,borderRadius:3,background:"rgba(255,255,255,.06)",overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${bar}%`,background:s,borderRadius:3,transition:"width .4s ease"}}/>
                      </div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:".4rem"}}>
                      <span style={{fontSize:"1.1rem"}}>{rec.pct>=1?"🎯":rec.pct>=.5?"💪":"💊"}</span>
                      <button className="edit-btn" onClick={e=>{e.stopPropagation();openEdit(ds);}}>Edit</button>
                    </div>
                  </div>
                );
              } else {
                return(
                  <div key={ds} style={{padding:".75rem 1rem",marginBottom:".5rem",display:"flex",alignItems:"center",gap:"1rem",borderRadius:12,border:"1px dashed rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.01)",opacity:.7}}>
                    <div style={{flexShrink:0,textAlign:"center",minWidth:48}}>
                      <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:"1.5rem",color:"var(--dim)",lineHeight:1}}>{fmtDate(ds).split(" ")[0]}</div>
                      <div style={{fontSize:".6rem",color:"var(--dim)"}}>{fmtDate(ds).split(" ")[1]}</div>
                      {isToday&&<div style={{fontSize:".5rem",color:"var(--purple)",fontWeight:600,marginTop:".1rem"}}>TODAY</div>}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:".72rem",color:"var(--dim)"}}>No log recorded</div>
                      <div style={{height:5,borderRadius:3,background:"rgba(255,255,255,.04)",marginTop:".4rem"}}/>
                    </div>
                    <button className="edit-btn" style={{background:"rgba(78,204,163,.07)",borderColor:"rgba(78,204,163,.2)",color:"var(--green)"}} onClick={e=>{e.stopPropagation();openEdit(ds);}}>
                      + Add
                    </button>
                  </div>
                );
              }
            })}
          </div>
            <button
              onClick={()=>setShowDays(d=>d+30)}
              style={{width:"100%",padding:".75rem",marginTop:".25rem",background:"rgba(255,255,255,.03)",border:"1px dashed rgba(180,142,255,.18)",borderRadius:12,color:"var(--muted)",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:".75rem",letterSpacing:".06em"}}>
              ↓ Show 30 more days
            </button>

          {/* Badges */}
          <div>
            <div className="sec">🏆 Achievements</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:".6rem"}}>
              {BADGES.map(b=>{
                const earned=earnedBadges.find(e=>e.id===b.id);
                return(
                  <div key={b.id} className={`badge-card ${earned?"earned":"locked"}`}>
                    <span style={{fontSize:"1.6rem"}}>{b.icon}</span>
                    <div style={{fontSize:".68rem",fontWeight:600,color:earned?"var(--purple)":"var(--dim)"}}>{b.name}</div>
                    <div style={{fontSize:".56rem",color:"var(--dim)",lineHeight:1.3}}>{b.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monthly Export */}
          <div className="card" style={{padding:"1.2rem"}}>
            <div className="sec">📤 Export Monthly Data</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".65rem",marginBottom:".8rem"}}>
              <div>
                <label className="inp-label">Month</label>
                <select className="inp" value={exportMonth} onChange={e=>setExportMonth(Number(e.target.value))}>
                  {MONTHS.map((m,i)=><option key={i} value={i}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="inp-label">Year</label>
                <select className="inp" value={exportYear} onChange={e=>setExportYear(Number(e.target.value))}>
                  {[2024,2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <button className="btn-export" style={{width:"100%",justifyContent:"center"}} onClick={handleExport} disabled={exporting}>
              {exporting?"⏳ Exporting…":"⬇️ Download CSV for "+MONTHS[exportMonth]+" "+exportYear}
            </button>
            <div style={{fontSize:".62rem",color:"var(--dim)",marginTop:".5rem",textAlign:"center"}}>Downloads med log + BP readings as separate CSV files</div>
          </div>
        </div>
      )}

      {/* ═══ BP LOG ═══ */}
      {tab==="bp"&&(
        <div className="page">
          {latest&&(()=>{
            const s=getBpStatus(latest.systolic,latest.diastolic);
            return(
              <div className="card" style={{padding:"1.4rem",textAlign:"center"}}>
                <div style={{fontSize:".65rem",color:"var(--muted)",letterSpacing:".12em",textTransform:"uppercase",marginBottom:".5rem"}}>Latest Reading</div>
                <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:"3.2rem",fontWeight:300,color:s.color,lineHeight:1}}>
                  {latest.systolic}<span style={{fontSize:"1.4rem",color:"var(--dim)"}}>/{latest.diastolic}</span>
                </div>
                <div style={{fontSize:".72rem",color:"var(--muted)",marginTop:".25rem"}}>{latest.date} · {latest.time_str||latest.time}</div>
                <div style={{marginTop:".5rem"}}><span className="bp-badge" style={{background:`${s.color}22`,color:s.color,border:`1px solid ${s.color}44`}}>{s.label}</span></div>
                {latest.pulse&&<div style={{fontSize:".72rem",color:"var(--muted)",marginTop:".4rem"}}>💓 {latest.pulse} bpm</div>}
                {latest.notes&&<div style={{fontSize:".72rem",color:"var(--muted)",marginTop:".3rem",fontStyle:"italic"}}>"{latest.notes}"</div>}
              </div>
            );
          })()}

          {chartData.length>1&&(
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

          <div className="card" style={{padding:"1.2rem"}}>
            <div className="sec">➕ Log Reading</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".65rem",marginBottom:".65rem"}}>
              {/* Date & Time */}
              <div>
                <label className="inp-label">Date</label>
                <input className="inp" type="date" value={bpForm.date||todayStr()} onChange={e=>setBpForm({...bpForm,date:e.target.value})} style={{colorScheme:"dark"}}/>
              </div>
              <div>
                <label className="inp-label">Time</label>
                <input className="inp" type="time" value={bpForm.time||""} onChange={e=>setBpForm({...bpForm,time:e.target.value})} style={{colorScheme:"dark"}}/>
              </div>
              {[{key:"sys",label:"Systolic *",ph:"120"},{key:"dia",label:"Diastolic *",ph:"80"},{key:"pulse",label:"Pulse (bpm)",ph:"72"},{key:"notes",label:"Notes",ph:"After rest…",type:"text"}].map(f=>(
                <div key={f.key} style={f.key==="notes"?{gridColumn:"span 2"}:{}}>
                  <label className="inp-label">{f.label}</label>
                  <input className="inp" type={f.type||"number"} placeholder={f.ph}
                    value={bpForm[f.key]} onChange={e=>setBpForm({...bpForm,[f.key]:e.target.value})}
                    onKeyDown={e=>e.key==="Enter"&&addBp()}/>
                </div>
              ))}
            </div>
            <button className={`btn-primary${bpSaved?" success":""}`} onClick={addBp}>
              {bpSaved?"✓ Saved!":"Save Reading"}
            </button>
          </div>

          <div className="card" style={{padding:"1rem"}}>
            <div style={{fontSize:".65rem",color:"var(--muted)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:".5rem"}}>BP Reference</div>
            {[{l:"Normal",r:"< 120/80",c:"#4ECCA3"},{l:"Elevated",r:"120–129 / < 80",c:"#F7C948"},{l:"Stage 1 High",r:"130–139 / 80–89",c:"#F5A623"},{l:"Stage 2 High",r:"≥ 140 / ≥ 90",c:"#FF6B6B"}].map((t,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:".32rem 0",borderBottom:i<3?"1px solid rgba(255,255,255,.04)":"none"}}>
                <span style={{fontSize:".76rem",color:t.c}}>{t.l}</span>
                <span style={{fontSize:".68rem",color:"var(--dim)"}}>{t.r}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ BP HISTORY ═══ */}
      {tab==="bphist"&&(
        <div className="page">
          <div className="sec">❤️ BP History</div>
          {bpLogs.length===0?(
            <div style={{textAlign:"center",padding:"3rem 1rem",fontFamily:"Cormorant Garamond,serif",fontSize:"1.2rem",color:"var(--dim)"}}>
              No readings yet.<br/><span style={{fontSize:".8rem",fontFamily:"DM Sans"}}>Log your first BP reading 💜</span>
            </div>
          ):bpLogs.map((bp,i)=>{
            const s=getBpStatus(bp.systolic,bp.diastolic);
            return(
              <div key={bp.id||i} className="card" style={{padding:".95rem 1rem",display:"flex",justifyContent:"space-between",alignItems:"center",gap:"1rem"}}>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:"1.7rem",color:s.color,lineHeight:1}}>
                    {bp.systolic}<span style={{fontSize:".9rem",color:"var(--dim)"}}>/{bp.diastolic}</span>
                  </div>
                  <div style={{fontSize:".62rem",color:"var(--dim)",marginTop:".18rem"}}>
                    {bp.date} · {bp.time_str||bp.time}{bp.pulse?` · 💓 ${bp.pulse} bpm`:""}
                  </div>
                  {bp.notes&&<div style={{fontSize:".67rem",color:"var(--muted)",marginTop:".18rem",fontStyle:"italic"}}>"{bp.notes}"</div>}
                </div>
                <span className="bp-badge" style={{background:`${s.color}22`,color:s.color,border:`1px solid ${s.color}44`,whiteSpace:"nowrap",flexShrink:0}}>{s.label}</span>
              </div>
            );
          })}
          {bpLogs.length>0&&(
            <div style={{textAlign:"center",fontSize:".68rem",color:"var(--dim)",paddingBottom:".5rem"}}>
              {bpLogs.length} reading{bpLogs.length!==1?"s":""} · stored in Supabase ☁️
            </div>
          )}
        </div>
      )}

      <div style={{height:"2rem",background:"linear-gradient(to top,rgba(55,15,110,.2),transparent)",pointerEvents:"none"}}/>

      {/* ═══ EDIT PAST DAY MODAL ═══ */}
      {editDate && (
        <div className="modal-overlay" onClick={()=>setEditDate(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Edit {fmtDate(editDate)}</div>
                <div style={{fontSize:".65rem",color:"var(--muted)",marginTop:".15rem"}}>Tap to toggle · changes save to cloud</div>
              </div>
              <button className="modal-close" onClick={()=>setEditDate(null)}>✕</button>
            </div>

            {[
              {label:"🌅 Morning",   meds:MEDS.filter(m=>m.slot==="morning")},
              {label:"☀️ Afternoon", meds:MEDS.filter(m=>m.slot==="afternoon")},
              {label:"🌙 Night",     meds:MEDS.filter(m=>m.slot==="night")},
            ].map(({label,meds})=>meds.length===0?null:(
              <div key={label} style={{marginBottom:"1rem"}}>
                <div style={{fontSize:".65rem",color:"var(--muted)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:".45rem"}}>{label}</div>
                <div style={{display:"flex",flexDirection:"column",gap:".4rem"}}>
                  {meds.map(m=>{
                    const locked=m.sundayOnly&&new Date(editDate+"T12:00:00").getDay()!==0;
                    if(locked) return null;
                    const isTaken=!!editLog[m.id];
                    return(
                      <div key={m.id}
                        className={`med-row${isTaken?" taken":""}`}
                        onClick={()=>setEditLog(prev=>({...prev,[m.id]:!prev[m.id]}))}>
                        <div className={`check${isTaken?" done":""}`} style={{borderColor:isTaken?"#4ECCA3":m.color}}>
                          {isTaken&&"✓"}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:".88rem",fontWeight:600,color:isTaken?"var(--dim)":"var(--text)",textDecoration:isTaken?"line-through":"none",display:"flex",alignItems:"center",gap:".4rem"}}>
                            {m.name}
                            {m.isPowder&&<span style={{fontSize:".55rem",background:"rgba(78,204,163,.15)",color:"#4ECCA3",border:"1px solid rgba(78,204,163,.3)",borderRadius:"8px",padding:".1rem .35rem"}}>powder</span>}
                            {m.duration&&<span style={{fontSize:".55rem",background:"rgba(180,142,255,.1)",color:"var(--purple)",border:"1px solid rgba(180,142,255,.25)",borderRadius:"8px",padding:".1rem .35rem"}}>{m.duration}</span>}
                          </div>
                          <div style={{fontSize:".65rem",color:"var(--dim)"}}>{m.note}</div>
                        </div>
                        <div style={{width:8,height:8,borderRadius:"50%",background:m.color,boxShadow:`0 0 6px ${m.color}`}}/>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <button
              className={`btn-primary${editSaving?"":" "}`}
              style={{marginTop:".5rem",background:editSaving?"linear-gradient(135deg,#065F46,#4ECCA3)":undefined}}
              onClick={saveEdit}
              disabled={editSaving}>
              {editSaving?"✓ Saving…":"Save Changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
