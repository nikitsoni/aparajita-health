// ── Supabase Client ──────────────────────────────────────────
const URL  = "https://ooyjmamvvkttvfphdffi.supabase.co";
const KEY  = "sb_publishable_BWkgff1Yv8nWEoVQiQ3Nkw_BpW9VkI4";

const H = {
  "apikey":        KEY,
  "Authorization": `Bearer ${KEY}`,
  "Content-Type":  "application/json",
};

const get  = (path) => fetch(`${URL}/rest/v1/${path}`, { headers: H }).then(r => r.json());
const post = (path, body, extra = {}) =>
  fetch(`${URL}/rest/v1/${path}`, { method:"POST", headers:{...H,...extra}, body:JSON.stringify(body) });

export const db = {

  // ── Med daily log ────────────────────────────────────────
  async getMedLog(date) {
    const rows = await get(`med_daily_logs?date=eq.${date}&select=*`);
    return Array.isArray(rows) ? (rows[0] || null) : null;
  },

  async getMedHistory(limit = 120) {
    const rows = await get(`med_daily_logs?select=date,taken,total,pct&order=date.desc&limit=${limit}`);
    return Array.isArray(rows) ? rows : [];
  },

  async upsertMedLog(date, logData, taken, total, pct) {
    return post("med_daily_logs", {
      date, log_data: logData, taken, total, pct,
      updated_at: new Date().toISOString(),
    }, { "Prefer": "resolution=merge-duplicates" });
  },

  // ── BP logs ──────────────────────────────────────────────
  async getBpLogs(limit = 200) {
    const rows = await get(`bp_logs?select=*&order=created_at.desc&limit=${limit}`);
    return Array.isArray(rows) ? rows : [];
  },

  async insertBpLog(entry) {
    return post("bp_logs", entry);
  },

  // ── Monthly export ───────────────────────────────────────
  async exportMonth(year, month) {
    const from = `${year}-${String(month).padStart(2,"0")}-01`;
    const to   = `${year}-${String(month).padStart(2,"0")}-31`;
    const [meds, bps] = await Promise.all([
      get(`med_daily_logs?date=gte.${from}&date=lte.${to}&order=date.asc`),
      get(`bp_logs?date=gte.${from}&date=lte.${to}&order=created_at.asc`),
    ]);
    return { meds: Array.isArray(meds)?meds:[], bps: Array.isArray(bps)?bps:[] };
  },
};
