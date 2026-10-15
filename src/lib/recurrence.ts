// Pure date/recurrence helpers. Dates are "YYYY-MM-DD" strings (local calendar days).

export type ReturnStatus = "sem_frequencia" | "atrasado" | "hoje" | "proximo" | "em_dia";

export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(iso: string, days: number): string {
  const [y = 0, m = 1, d = 1] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function diffDays(a: string, b: string): number {
  const [ay = 0, am = 1, ad = 1] = a.split("-").map(Number);
  const [by = 0, bm = 1, bd = 1] = b.split("-").map(Number);
  return Math.round(
    (Date.UTC(ay, am - 1, ad) - Date.UTC(by, bm - 1, bd)) / 86400000,
  );
}

/** next = last visit + frequency. Null if either is missing (never invent a date). */
export function nextReturnDate(
  lastVisit: string | null | undefined,
  frequencyDays: number | null | undefined,
): string | null {
  if (!lastVisit || !frequencyDays || frequencyDays <= 0) return null;
  return addDays(lastVisit, frequencyDays);
}

export function returnStatus(
  lastVisit: string | null | undefined,
  frequencyDays: number | null | undefined,
  today: string = todayISO(),
): ReturnStatus {
  const next = nextReturnDate(lastVisit, frequencyDays);
  if (!next) return "sem_frequencia";
  const d = diffDays(next, today);
  if (d < 0) return "atrasado";
  if (d === 0) return "hoje";
  if (d <= 7) return "proximo";
  return "em_dia";
}

export function formatBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** Parses "26/09/2026", "2026-09-26" or a spreadsheet serial into ISO. */
export function parseDateFlexible(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number" && v > 20000 && v < 80000) {
    const dt = new Date(Date.UTC(1899, 11, 30) + v * 86400000);
    return dt.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const g3 = m[3] ?? "";
    const g2 = m[2] ?? "";
    const g1 = m[1] ?? "";
    const y = g3.length === 2 ? `20${g3}` : g3;
    return `${y}-${g2.padStart(2, "0")}-${g1.padStart(2, "0")}`;
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1] ?? ""}-${m[2] ?? ""}-${m[3] ?? ""}`;
  return null;
}

/** "25 Dias" -> 25 */
export function parseFrequency(v: unknown): number | null {
  if (v == null) return null;
  const m = String(v).match(/\d+/);
  if (!m) return null;
  const n = parseInt(m[0], 10);
  return n > 0 ? n : null;
}
