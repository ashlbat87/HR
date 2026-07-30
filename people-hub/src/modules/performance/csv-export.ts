// CSV export helper (v0.8, Stage 7e). Builds a self-describing CSV: a metadata preamble
// (report title, timeframe, last-refreshed GST, population) then the data rows. Format-
// agnostic design (CSV now; Excel/PDF future). PD-025: exports always state timeframe +
// population.

function esc(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function nowGST(): string {
  const d = new Date(Date.now() + 4 * 3600 * 1000);
  const month = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getUTCMonth()];
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${d.getUTCDate()} ${month} ${d.getUTCFullYear()}, ${hh}:${mm} GST`;
}

export interface CsvMeta {
  title: string;
  timeframe: string;
  dimension?: string;
  population: number;
  extra?: [string, string][];
}

export function buildCsv(meta: CsvMeta, headers: string[], rows: (string | number | null)[][]): string {
  const lines: string[] = [];
  lines.push(`${esc("Report")},${esc(meta.title)}`);
  lines.push(`${esc("Timeframe")},${esc(meta.timeframe)}`);
  if (meta.dimension) lines.push(`${esc("Dimension")},${esc(meta.dimension)}`);
  lines.push(`${esc("Based on")},${esc(`${meta.population} reviews`)}`);
  lines.push(`${esc("Generated")},${esc(nowGST())}`);
  for (const [k, v] of meta.extra ?? []) lines.push(`${esc(k)},${esc(v)}`);
  lines.push("");
  lines.push(headers.map(esc).join(","));
  for (const r of rows) lines.push(r.map(esc).join(","));
  return lines.join("\r\n");
}

export function csvFilename(title: string, timeframe: string): string {
  const clean = `${title}_${timeframe}`.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return `${clean}.csv`;
}
