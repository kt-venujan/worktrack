# Apptimate Work Tracker — Google Sheets Edition

Next.js dashboard using your existing Excel workbook **converted to a native Google Sheet**, with a separate tab for each client. No PostgreSQL, Microsoft Entra, or ExcelJS required.

## Setup

1. In Google Drive, upload `Apptimate Changes.xlsx`. Open it with Google Sheets, then choose **File → Save as Google Sheets**. Confirm the new file is a Google Sheet, not an `.xlsx` file. Keep the original as a backup. The included source workbook is in `data/` for reference only; the app does not use it at runtime.
2. In [Google Cloud Console](https://console.cloud.google.com/), create a project and enable **Google Sheets API**.
3. Under **APIs & Services → Credentials**, create a **Service Account** and a JSON key. Share the converted Google Sheet with the service account's `client_email` as **Editor**. Store its `private_key` only in `.env.local` or secure server environment variables; never commit the JSON key.
4. Configure the Google Auth Platform OAuth consent screen (External for personal Gmail; add yourself as a test user if in Testing). Create an **OAuth client ID** of type **Web application**. Add `http://localhost:3000/api/auth/callback/google` as an **authorized redirect URI**. Add `http://localhost:3000` as an authorized JavaScript origin.
5. Copy `.env.example` to `.env.local`, then fill all fields. `GOOGLE_SHEET_ID` is the segment after `/spreadsheets/d/` in your Google Sheets URL. Set `ALLOWED_EMAILS` to the Gmail addresses permitted to sign in. Generate `NEXTAUTH_SECRET` with `openssl rand -base64 32` or another cryptographically secure generator.
6. Run `npm install`, then `npm run dev`. Open http://localhost:3000 and sign in with an allowed Google account.

## Features

- Dashboard: total, pending, completed, overdue; overdue only works for tasks with a **Due Date**.
- Clients: one workspace per worksheet; blank/non-task worksheets ignored.
- Tasks: create, edit, delete (with confirmation), search, filter, assignee, status, due dates.
- API routes require authenticated, allowlisted Google sign-in; service account credentials never reach the browser.
- Existing worksheet names and columns A–F are preserved. Columns G and H become **Due Date** and **Assignee** on first edit or new task in each worksheet.
- Handles legacy `Type`/`Types`, `Deliver Date`/`Delivery Date`, and whitespace in header labels.

## Notes and limitations

- Google Sheets API is **not a relational database**. Concurrent edits and manual row insertions/deletions can change row numbers. Refresh before editing; avoid simultaneous structural edits. For heavy team usage, add immutable task IDs and optimistic concurrency checks before production.
- Delete removes the entire row in the selected worksheet; use a backup before testing destructive actions.
- Only spreadsheet columns A–H are edited. Google Sheets formulas, styles, and other columns are otherwise retained; deletions shift entire rows.
- Google API quotas apply. OAuth consent-screen verification may be required for wider public use; a small internal/test app is simpler.
- The app requires internet connectivity and secure hosting to be accessible online. For deployment, set `NEXTAUTH_URL` to the production HTTPS URL and register its OAuth callback URI. Keep all credentials server-side.
- `lib/storage/types.ts` defines the storage interface. A database adapter can be added later without rewriting UI.
- The initial workbook contains an unusual first header in `Global Vision`; review that worksheet manually because it is not recognized as a standard task sheet.
