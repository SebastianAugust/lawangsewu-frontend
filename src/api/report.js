import api from "./axios";

// `branchId` is optional: pass a branch id to scope the report to one cabang,
// or null/undefined for the owner "Semua Cabang" (all branches) view.
export const getDailyReport = (date, branchId) =>
  api.get("/reports/daily", { params: { date, branch_id: branchId || undefined } });

export const getWeeklyReport = (date, branchId) =>
  api.get("/reports/weekly", { params: { date, branch_id: branchId || undefined } });

export const getMonthlyReport = (month, year, branchId) =>
  api.get("/reports/monthly", {
    params: { month, year, branch_id: branchId || undefined },
  });

// Pure date helper (no network) — returns the 7 ISO date strings
// (Mon..Sun) of the week containing `dateStr`. Kept for the date picker UX.
export const getWeekRange = (dateStr) => {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    dates.push(`${yyyy}-${mm}-${dd}`);
  }
  return { start: dates[0], end: dates[6], dates };
};
