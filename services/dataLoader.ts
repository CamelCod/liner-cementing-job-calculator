// CSV data loader for casing/liner and drill pipe tables. Designed to fetch from /tables/*.csv at runtime
// and gracefully fall back to provided defaults if the files are not found.

export interface CLRow { od: string; wt: string; id: string }
export interface DPMeasure { od: string; wt: string; id: string }
export interface DPMaterial { grade: string; yieldPsi: number }

function splitLine(line: string): string[] {
  // Prefer comma if present, else split on whitespace
  if (line.includes(',')) {
    return line.split(',').map((s) => s.trim());
  }
  return line.trim().split(/\s+/);
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = splitLine(lines[0] || '').map(normalizeHeader);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i] || '');
    if (cells.length === 0) continue;
    const row: Record<string, string> = {};
    for (let j = 0; j < header.length && j < cells.length; j++) {
  // Strip a single pair of wrapping quotes if present
  const headerKey = header[j];
  const cellValue = cells[j];
  if (headerKey && cellValue) {
    row[headerKey] = cellValue.replace(/(^"|"$)/g, '');
  }
    }
    rows.push(row);
  }
  return rows;
}

function withBase(p: string): string {
  // Ensure correct path under Vite base (GitHub Pages subpath)
  const base = import.meta?.env?.BASE_URL || '/';
  return base.replace(/\/?$/, '/') + p.replace(/^\//, '');
}

async function fetchText(path: string): Promise<string | null> {
  try {
    // Add a cache-busting query param so updates appear immediately in prod (Pages/CDN)
    const baseUrl = withBase(path);
    const ver = ((typeof import.meta !== 'undefined' && (import.meta as any).env && ((import.meta as any).env.VITE_BUILD_ID || (import.meta as any).env.VITE_APP_VERSION))
      || (typeof window !== 'undefined' && (window as any).__BUILD_ID__))
      ? (((import.meta as any).env?.VITE_BUILD_ID) || ((import.meta as any).env?.VITE_APP_VERSION) || (window as any).__BUILD_ID__)
      : Date.now().toString();
    const bustUrl = baseUrl + (baseUrl.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(String(ver));
    const res = await fetch(bustUrl, { cache: 'no-store' });
    if (!res.ok) return null;
    const txt = await res.text();
    return txt;
  } catch {
    return null;
  }
}

export async function loadCasingLinerTable(fallback: CLRow[]): Promise<CLRow[]> {
  const txt = await fetchText('tables/casing_liner_standard_table.csv');
  if (!txt) return fallback;
  const rows = parseCSV(txt);
  const result: CLRow[] = [];
  for (const r of rows) {
    // Expect columns like: OD, Weight, ID (any case/spacing)
    const od = r['od'];
    const wt = r['weight'] || r['wt'];
    const id = r['id'];
    if (!od || !wt || !id) continue;
    result.push({ od: od.trim(), wt: wt.trim(), id: id.trim() });
  }
  return result.length ? result : fallback;
}

export async function loadDrillPipeMeasures(fallback: DPMeasure[]): Promise<DPMeasure[]> {
  const txt = await fetchText('tables/drill_pipes_standard_table_measures.csv');
  if (!txt) return fallback;
  const rows = parseCSV(txt);
  const result: DPMeasure[] = [];
  for (const r of rows) {
    const od = r['od'];
    const wt = r['weight'] || r['wt'];
    const id = r['id'];
    if (!od || !wt || !id) continue;
    result.push({ od: od.trim(), wt: wt.trim(), id: id.trim() });
  }
  return result.length ? result : fallback;
}

export async function loadDrillPipeMaterials(fallbackGrades: string[]): Promise<{ materials: DPMaterial[]; grades: string[] }> {
  const txt = await fetchText('tables/drill_pipes_standard_table_material.csv');
  if (!txt) return { materials: fallbackGrades.map((g) => ({ grade: g, yieldPsi: NaN })), grades: fallbackGrades };
  const rows = parseCSV(txt);
  const materials: DPMaterial[] = [];
  for (const r of rows) {
    // The materials CSV likely has two columns: Grade and Yield (psi)
    const values = Object.values(r).filter((v) => v && v.trim().length > 0);
    if (values.length >= 2) {
      const g = values[0]?.trim();
      const y = values[1]?.replace(/[ ,]/g, '');
      const yieldPsi = parseFloat(y || '');
      if (g) materials.push({ grade: g, yieldPsi: isFinite(yieldPsi) ? yieldPsi : NaN });
    }
  }
  const grades = materials.length ? materials.map((m) => m.grade) : fallbackGrades;
  return { materials: materials.length ? materials : fallbackGrades.map((g) => ({ grade: g, yieldPsi: NaN })), grades };
}
