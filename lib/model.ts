export type Task = {
  id: string;
  client: string;
  row: number;
  change: string;
  type: string;
  givenDate: string;
  approval: string;
  status: string;
  deliverDate: string;
  dueDate: string;
  assignee: string;
  lastModified?: string;
};

export const headers = [
  'Changes',
  'Type',
  'Given Date',
  'Approval',
  'Status',
  'Deliver Date',
  'Due Date',
  'Assignee',
  'Last Modified'
];

export const clean = (v: unknown) => (v == null ? '' : String(v));

export function normalizeDate(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'number' && v > 20000 && v < 100000) {
    const d = new Date(Date.UTC(1899, 11, 30) + v * 86400000);
    return d.toISOString().slice(0, 10);
  }
  const s = clean(v).trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // DD/MM/YYYY or D/M/YYYY (e.g. 24/10/2024 or 7/1/2025)
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    const year = dmy[3];
    return `${year}-${month}-${day}`;
  }

  // YYYY/MM/DD
  const ymd = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymd) {
    const year = ymd[1];
    const month = ymd[2].padStart(2, '0');
    const day = ymd[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const p = Date.parse(s);
  if (!isNaN(p)) {
    return new Date(p).toISOString().slice(0, 10);
  }
  return s;
}

export function formatDisplayDate(dateStr: string): string {
  if (!dateStr || dateStr.trim() === '') return '—';
  const norm = normalizeDate(dateStr);
  if (/^\d{4}-\d{2}-\d{2}$/.test(norm)) {
    const [y, m, d] = norm.split('-');
    return `${d}/${m}/${y}`;
  }
  return dateStr;
}

export function toSheetDate(dateStr: string): string {
  if (!dateStr || dateStr.trim() === '') return '';
  const norm = normalizeDate(dateStr);
  if (/^\d{4}-\d{2}-\d{2}$/.test(norm)) {
    const [y, m, d] = norm.split('-');
    return `${d}/${m}/${y}`;
  }
  return dateStr;
}

export function formatDateTime(dateStr?: string): string {
  if (!dateStr || !dateStr.trim()) return '—';
  const s = dateStr.trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    const [, y, mon, d, hr, min] = m;
    if (hr && min) {
      return `${d}/${mon}/${y} ${hr}:${min}`;
    }
    return `${d}/${mon}/${y}`;
  }
  return s;
}

export function parseSheets(sheets: { name: string; values: unknown[][] }[]): Task[] {
  return sheets.flatMap((s) => {
    if (!s.values.length) return [];
    const h = s.values[0].map((x) => clean(x).trim().toLowerCase());
    const col = (names: string[]) => h.findIndex((x) => names.includes(x));
    const ix = {
      change: col(['changes', 'change', 'task', 'description']),
      type: col(['type', 'types']),
      givenDate: col(['given date', 'given date ', 'givendate', 'date']),
      approval: col(['approval']),
      status: col(['status']),
      deliverDate: col(['deliver date', 'delivery date', 'deliverdate']),
      dueDate: col(['due date', 'duedate']),
      assignee: col(['assignee']),
      lastModified: col(['last modified', 'last updated', 'modified', 'updated at', 'updated', 'timestamp'])
    };
    if (ix.change < 0) return [];
    return s.values
      .slice(1)
      .map((r, i) => {
        const get = (key: keyof typeof ix) => (ix[key] < 0 ? '' : clean(r[ix[key]]));
        return {
          id: `${s.name}:${i + 2}`,
          client: s.name,
          row: i + 2,
          change: get('change'),
          type: get('type'),
          givenDate: normalizeDate(ix.givenDate < 0 ? '' : r[ix.givenDate]),
          approval: get('approval'),
          status: get('status'),
          deliverDate: normalizeDate(ix.deliverDate < 0 ? '' : r[ix.deliverDate]),
          dueDate: normalizeDate(ix.dueDate < 0 ? '' : r[ix.dueDate]),
          assignee: get('assignee'),
          lastModified: get('lastModified')
        };
      })
      .filter((x) => x.change.trim());
  });
}

export const isDone = (s: string) =>
  ['done', 'completed', 'complete', 'delivered', 'closed'].includes(s.trim().toLowerCase());

export const isOverdue = (t: Task) => {
  if (!t.dueDate || isDone(t.status)) return false;
  const norm = normalizeDate(t.dueDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(norm)) return false;
  return norm < new Date().toLocaleDateString('en-CA');
};
