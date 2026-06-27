const URL  = "https://ooyjmamvvkttvfphdffi.supabase.co";
const KEY  = "sb_publishable_BWkgff1Yv8nWEoVQiQ3Nkw_BpW9VkI4";
const H    = { "apikey":KEY, "Authorization":`Bearer ${KEY}`, "Content-Type":"application/json" };
const get  = p => fetch(`${URL}/rest/v1/${p}`,{headers:H}).then(r=>r.json());
const post = (p,b,x={}) => fetch(`${URL}/rest/v1/${p}`,{method:"POST",headers:{...H,...x},body:JSON.stringify(b)});

export const db = {
  async getMedLog(date)       { const r=await get(`med_daily_logs?date=eq.${date}&select=*`).catch(()=>[]); return Array.isArray(r)?r[0]||null:null; },
  async getMedHistory(n=120)  { const r=await get(`med_daily_logs?select=date,taken,total,pct&order=date.desc&limit=${n}`).catch(()=>[]); return Array.isArray(r)?r:[]; },
  async upsertMedLog(date,logData,taken,total,pct) { return post("med_daily_logs",{date,log_data:logData,taken,total,pct,updated_at:new Date().toISOString()},{"Prefer":"resolution=merge-duplicates"}); },
  async getBpLogs(n=200)      { const r=await get(`bp_logs?select=*&order=created_at.desc&limit=${n}`).catch(()=>[]); return Array.isArray(r)?r:[]; },
  async insertBpLog(e)        { return post("bp_logs",e); },
  async exportMonth(y,m)      {
    const from=`${y}-${String(m).padStart(2,"0")}-01`, to=`${y}-${String(m).padStart(2,"0")}-31`;
    const [meds,bps]=await Promise.all([get(`med_daily_logs?date=gte.${from}&date=lte.${to}&order=date.asc`).catch(()=>[]),get(`bp_logs?date=gte.${from}&date=lte.${to}&order=created_at.asc`).catch(()=>[])]);
    return {meds:Array.isArray(meds)?meds:[],bps:Array.isArray(bps)?bps:[]};
  },
};
