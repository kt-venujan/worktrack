# Apptimate Work Tracker — Google Sheets Edition

# WorkTrack

**A Web-Based Task and Change Request Management System**

WorkTrack is a lightweight task management application developed using **Next.js, TypeScript, and Google Sheets API**. It provides a centralized interface for managing client requests, monitoring task progress, and tracking delivery deadlines.

The application transforms traditional spreadsheet-based workflows into a structured web-based management system while retaining Google Sheets as its primary data source.

## Overview

WorkTrack is designed to simplify the administration of client change requests and operational tasks. It enables authorized users to manage multiple clients, maintain task records, monitor outstanding work, and update progress through a unified dashboard.

By integrating with Google Sheets API, the application supports spreadsheet-based data management without requiring a dedicated relational database.

## Key Features

- **Centralized Dashboard:** Overview of total, pending, completed, and overdue tasks.
- **Client Management:** Organize and manage requests across multiple client worksheets.
- **Task Management:** Create, view, update, and delete task records.
- **Deadline Monitoring:** Track delivery deadlines and identify overdue tasks.
- **Status Tracking:** Monitor task progress throughout its lifecycle.
- **Search and Filtering:** Locate requests based on client, status, and keywords.
- **Google Sheets Integration:** Synchronize task records through Google Sheets API.
- **Authentication:** Google OAuth authentication with configurable email-based access restrictions.
- **Lightweight Architecture:** Operates without a dedicated relational database.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | Next.js, React |
| Programming Language | TypeScript |
| Styling | Tailwind CSS |
| Backend | Next.js API Routes |
| Data Storage | Google Sheets |
| API Integration | Google Sheets API |
| Authentication | NextAuth.js, Google OAuth |
| Deployment | Vercel (optional) |

## System Architecture

```text
                  WorkTrack
               Web Application
                      |
              Authentication
                Google OAuth
                      |
                Next.js API
                      |
             Task Management
                      |
              Google Sheets API
                      |
              Google Spreadsheet
                      |
          +-----------+-----------+
          |           |           |
       Client A    Client B    Client C
```

## Project Structure

```text
worktrack/
├── app/
│   ├── api/              # Backend API endpoints
│   └── ...               # Application routes
├── components/           # Reusable UI components
├── lib/                  # Integrations and utilities
├── public/               # Static assets
├── .env.example          # Environment configuration template
├── package.json          # Project dependencies
└── README.md             # Project documentation
```

## Installation and Configuration

### Prerequisites

- Node.js and npm
- Google Cloud project
- Google Sheets API enabled
- Google OAuth credentials
- Google service account with spreadsheet access

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/worktrack.git
cd worktrack
npm install
```

### 2. Configure Google Cloud

1. Create a project in Google Cloud Console.
2. Enable the Google Sheets API.
3. Create a service account.
4. Grant the service account Editor access to the required spreadsheet.
5. Configure the Google OAuth consent screen.
6. Create OAuth credentials for a web application.

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=

ALLOWED_EMAILS=

GOOGLE_SHEET_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
```

Store credentials securely. Never commit environment files containing secrets to version control.

### 4. Start the Development Server

```bash
npm run dev
```

Access the application at:

`http://localhost:3000`

## Task Management Workflow

1. A change request or task is recorded for a client.
2. The application retrieves the relevant records from Google Sheets.
3. Authorized users review and update task information through the dashboard.
4. Task status, descriptions, and deadlines can be modified.
5. Changes are written back to the corresponding spreadsheet.
6. Updated information becomes available when the dashboard refreshes.

## Security Considerations

- Google OAuth is used for user authentication.
- Access can be restricted to approved email addresses.
- Spreadsheet operations are performed through server-side API integration.
- Service account credentials are stored in environment variables.
- Sensitive configuration files must be excluded from version control.

Production deployments should additionally enforce server-side authorization, input validation, and appropriate access controls.

## Future Enhancements

- Role-based access control
- Task assignment and ownership
- Priority classification
- Automated deadline notifications
- Activity history and audit logging
- Advanced reporting and analytics
- Stable task identifiers and concurrent editing protection

## License

This project is proprietary. All rights reserved.

---

**WorkTrack**  
*Task and Change Request Management System*
