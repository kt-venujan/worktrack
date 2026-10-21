import 'server-only';
import { google } from 'googleapis';
import type { TaskStorage, TaskInput, SheetData } from './types';
import { headers, toSheetDate } from '../model';

const spreadsheetId = () => {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw Error('Missing GOOGLE_SHEET_ID');
  return id;
};

function api() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!email || !key) throw Error('Missing Google service account credentials');
  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return google.sheets({ version: 'v4', auth });
}

const quote = (name: string) => "'" + name.replace(/'/g, "''") + "'";

const values = (t: TaskInput) => [
  t.change,
  t.type,
  toSheetDate(t.givenDate),
  t.approval,
  t.status,
  toSheetDate(t.deliverDate),
  toSheetDate(t.dueDate),
  t.assignee
].map((x) => String(x ?? ''));

async function metadata() {
  const s = api();
  const r = await s.spreadsheets.get({
    spreadsheetId: spreadsheetId(),
    fields: 'sheets(properties(sheetId,title,gridProperties(rowCount)))'
  });
  return (
    r.data.sheets?.map((x) => ({
      name: x.properties?.title || '',
      sheetId: x.properties?.sheetId,
      rowCount: x.properties?.gridProperties?.rowCount || 0
    })) || []
  );
}

async function valid(client: string) {
  const sheets = await metadata();
  if (!sheets.some((s) => s.name === client)) throw Error('Unknown client');
  const s = api();
  const r = await s.spreadsheets.values.get({
    spreadsheetId: spreadsheetId(),
    range: `${quote(client)}!A1:H1`
  });
  const h = (r.data.values?.[0] || []).map((v) => String(v).trim().toLowerCase());
  if (!h.includes('changes') && !h.includes('change')) throw Error('Not a task worksheet');
  return h;
}

async function ensureHeaders(client: string, h: string[]) {
  const s = api();
  const missing = [6, 7].filter((i) => !h[i]);
  if (missing.length) {
    await s.spreadsheets.values.batchUpdate({
      spreadsheetId: spreadsheetId(),
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: missing.map((i) => ({
          range: `${quote(client)}!${String.fromCharCode(65 + i)}1`,
          values: [[headers[i]]]
        }))
      }
    });
  }
}

export class GoogleSheetsStorage implements TaskStorage {
  async listSheets(): Promise<SheetData[]> {
    const s = api();
    const names = (await metadata()).map((x) => x.name);
    if (!names.length) return [];
    const r = await s.spreadsheets.values.batchGet({
      spreadsheetId: spreadsheetId(),
      ranges: names.map((n) => `${quote(n)}!A1:H`),
      valueRenderOption: 'FORMATTED_VALUE'
    });
    return names.map((name, i) => ({
      name,
      values: (r.data.valueRanges?.[i]?.values || []) as unknown[][]
    }));
  }

  async create(client: string, task: TaskInput) {
    if (!task.change?.trim()) throw Error('Task description required');
    const h = await valid(client);
    await ensureHeaders(client, h);
    const s = api();
    const meta = await metadata();
    const sheetId = meta.find((x) => x.name === client)?.sheetId;
    const before = await s.spreadsheets.values.get({
      spreadsheetId: spreadsheetId(),
      range: `${quote(client)}!A:A`
    });
    const row = Math.max(2, (before.data.values || []).length + 1);

    // Copy formatting and data validation (dropdown chips) from the previous row
    if (row > 2 && sheetId !== undefined && sheetId !== null) {
      try {
        await s.spreadsheets.batchUpdate({
          spreadsheetId: spreadsheetId(),
          requestBody: {
            requests: [
              {
                copyPaste: {
                  source: {
                    sheetId,
                    startRowIndex: row - 2,
                    endRowIndex: row - 1,
                    startColumnIndex: 0,
                    endColumnIndex: 8
                  },
                  destination: {
                    sheetId,
                    startRowIndex: row - 1,
                    endRowIndex: row,
                    startColumnIndex: 0,
                    endColumnIndex: 8
                  },
                  pasteType: 'PASTE_FORMAT'
                }
              },
              {
                copyPaste: {
                  source: {
                    sheetId,
                    startRowIndex: row - 2,
                    endRowIndex: row - 1,
                    startColumnIndex: 0,
                    endColumnIndex: 8
                  },
                  destination: {
                    sheetId,
                    startRowIndex: row - 1,
                    endRowIndex: row,
                    startColumnIndex: 0,
                    endColumnIndex: 8
                  },
                  pasteType: 'PASTE_DATA_VALIDATION'
                }
              }
            ]
          }
        });
      } catch {
        // Fall back gracefully if previous row format copy fails
      }
    }

    await s.spreadsheets.values.update({
      spreadsheetId: spreadsheetId(),
      range: `${quote(client)}!A${row}:H${row}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [values(task)] }
    });
    return { row };
  }

  async update(client: string, row: number, task: TaskInput) {
    if (!Number.isSafeInteger(row) || row < 2 || !task.change?.trim()) throw Error('Invalid task');
    const h = await valid(client);
    await ensureHeaders(client, h);
    const s = api();
    const existing = await s.spreadsheets.values.get({
      spreadsheetId: spreadsheetId(),
      range: `${quote(client)}!A${row}:A${row}`
    });
    if (!existing.data.values?.[0]?.[0]) throw Error('Task no longer exists at this row; refresh');
    await s.spreadsheets.values.update({
      spreadsheetId: spreadsheetId(),
      range: `${quote(client)}!A${row}:H${row}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [values(task)] }
    });
  }

  async delete(client: string, row: number) {
    if (!Number.isSafeInteger(row) || row < 2) throw Error('Invalid row');
    await valid(client);
    const s = api();
    const m = await s.spreadsheets.get({
      spreadsheetId: spreadsheetId(),
      fields: 'sheets(properties(sheetId,title))'
    });
    const id = m.data.sheets?.find((x) => x.properties?.title === client)?.properties?.sheetId;
    if (id === undefined || id === null) throw Error('Sheet not found');
    await s.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId(),
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: id,
                dimension: 'ROWS',
                startIndex: row - 1,
                endIndex: row
              }
            }
          }
        ]
      }
    });
  }
}
