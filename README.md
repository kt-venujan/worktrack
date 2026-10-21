# WorkTrack 

**Web-Based Task & Change Request Management System**

WorkTrack is a lightweight, web-based task and change request management application built with **Next.js, React, TypeScript, and Google Sheets API**.

The application provides a centralized interface for managing client requests, tracking task progress, monitoring deadlines, and analyzing operational workloads. It replaces traditional spreadsheet-based workflows with a structured, interactive dashboard while retaining Google Sheets as the primary data source.

WorkTrack is designed for small teams and operational environments that require efficient task management without the complexity of a dedicated database infrastructure.

---

## Key Features

### Dashboard & Analytics

- Centralized overview of total, pending, in-progress, completed, and overdue tasks.
- Interactive task distribution visualization using native SVG.
- Workload analysis through responsive CSS-based bar charts.
- Task classification and approval status indicators.
- Client-wise task summaries and operational metrics.
- Deadline monitoring for upcoming and overdue requests.

### Client Management

- Manage multiple clients through a unified interface.
- Automatically organize tasks based on client-specific Google Sheets worksheets.
- View client-specific requests, statuses, and deadlines.
- Search and filter requests across different clients.

### Task & Change Request Management

- Create, view, update, and delete task records.
- Track request types, approval statuses, and progress.
- Record task descriptions, request dates, and delivery deadlines.
- Identify outstanding work and completed requests.
- Synchronize task modifications with Google Sheets.

### Authentication & Access Control

- Google OAuth authentication using NextAuth.js.
- Configurable email-based access restrictions.
- Server-side Google Sheets API integration.
- Environment-based credential management.

### Spreadsheet Integration

- Google Sheets serves as the primary data source.
- Supports multiple worksheets for individual clients.
- Retrieves task information through Google Sheets API.
- Updates spreadsheet records directly from the web application.
- Eliminates the requirement for a separate relational database.

---

## Technology Stack

| Component | Technology |
|---|---|
| Frontend Framework | Next.js |
| UI Library | React |
| Programming Language | TypeScript |
| Styling | Tailwind CSS, Vanilla CSS |
| Dashboard Visualizations | Native React, SVG, CSS |
| Icon Library | Lucide React |
| Backend | Next.js API Routes |
| Data Storage | Google Sheets |
| API Integration | Google Sheets API |
| Authentication | NextAuth.js, Google OAuth 2.0 |
| Hosting | Vercel (optional) |
| Version Control | Git, GitHub |

## Dashboard Visualizations

WorkTrack uses native React components, SVG, and CSS to render dashboard visualizations without introducing external charting libraries such as Chart.js, Recharts, or ApexCharts.

### Visualization Components

**Task Distribution — Donut Chart**

The task distribution chart is implemented using SVG `circle` elements and stroke calculations.

- Uses `stroke-dasharray` and `stroke-dashoffset`.
- Displays task distribution by status.
- Supports dynamic values derived from task records.
- Integrates with the application's styling system.

**Workload Analysis — Bar Chart**

The workload visualization uses responsive CSS Flexbox layouts.

- Displays task distribution across clients.
- Calculates bar widths proportionally.
- Adapts to different screen sizes.
- Supports dynamic data updates.

**Task Classification & Approval Indicators**

Task classifications and approval metrics are displayed using CSS-based progress indicators and metric components.

- Request type distribution.
- Approval status breakdown.
- Percentage-based progress indicators.
- Summary metric tiles.

### Design Advantages

- **Minimal Dependencies:** No dedicated charting packages required.
- **Performance:** Reduces additional JavaScript dependencies for simple visualizations.
- **Compatibility:** Uses standard React, SVG, and CSS capabilities.
- **Responsive Layouts:** Adapts to desktop and mobile screens.
- **Styling Flexibility:** Provides direct control over chart appearance.
- **Maintainability:** Keeps visualization logic within reusable application components.

This approach supports the application's current analytical requirements without introducing unnecessary dependencies.

---

## System Architecture

WorkTrack follows a layered architecture separating presentation, authentication, business logic, and data access.

```text
                    WorkTrack
                 Web Application
                        |
             +----------v----------+
             |   Next.js Frontend  |
             | Dashboard / Clients |
             | Task Management     |
             +----------+----------+
                        |
             +----------v----------+
             |   Authentication    |
             | Google OAuth        |
             | NextAuth.js         |
             +----------+----------+
                        |
             +----------v----------+
             |   Next.js Backend   |
             | API Routes          |
             | Task CRUD Logic     |
             +----------+----------+
                        |
             +----------v----------+
             |   Google Sheets API |
             | Service Account     |
             +----------+----------+
                        |
             +----------v----------+
             | Google Spreadsheet  |
             +----------+----------+
                        |
             +----------+----------+
             |          |          |
          Client A   Client B   Client C
```

### Architecture Overview

**Presentation Layer**

Provides the user interface for task management, client records, and dashboard analytics.

**Authentication Layer**

Authenticates users through Google OAuth and restricts access to approved accounts.

**Application Layer**

Handles task operations, request validation, status updates, and communication with the storage service.

**Data Access Layer**

Communicates with Google Sheets API to retrieve and modify spreadsheet records.

**Storage Layer**

Maintains task and client information in Google Sheets worksheets.

---

## Project Structure

```text
worktrack/
├── app/
│   ├── api/                  # Backend API routes
│   ├── layout.tsx            # Application layout
│   └── page.tsx              # Main application page
│
├── components/               # Reusable UI components
│
├── lib/                      # API integrations and utilities
│
├── public/                   # Static assets
│
├── .env.example              # Environment configuration template
├── .gitignore                # Git exclusion rules
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
└── README.md                 # Project documentation
```

*The directory structure is a high-level overview. Individual files and routes may vary depending on the implementation.*

---

## Installation & Setup

### Prerequisites

Before running WorkTrack, ensure the following requirements are available:

- Node.js and npm
- Google account
- Google Cloud project
- Google Sheets API enabled
- Google OAuth credentials
- Google service account
- Google spreadsheet containing task records

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/worktrack.git
cd worktrack
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Google Cloud

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a Google Cloud project.
3. Enable the Google Sheets API.
4. Create a service account.
5. Generate service account credentials.
6. Configure the Google OAuth consent screen.
7. Create OAuth credentials for a web application.

For local development, configure the following authorized redirect URI:

```text
http://localhost:3000/api/auth/callback/google
```

If the OAuth application is in testing mode, add the required Google accounts as test users.

### 4. Configure Google Sheets

1. Upload the existing Excel workbook to Google Drive.
2. Convert the workbook into Google Sheets format.
3. Verify that all client worksheets and task records are preserved.
4. Share the spreadsheet with the service account email.
5. Grant the service account Editor permission.
6. Copy the Spreadsheet ID from the Google Sheets URL.

Example:

```text
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
```

The value between `/d/` and `/edit` is the Spreadsheet ID.

### 5. Configure Environment Variables

Create a `.env.local` file in the project root.

```env
# Google OAuth
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=

# Authorized Users
ALLOWED_EMAILS=

# Google Sheets
GOOGLE_SHEET_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=

# Service Account Credentials
GOOGLE_PRIVATE_KEY=
```

**Environment Variable Reference**

| Variable | Description |
|---|---|
| `GOOGLE_OAUTH_CLIENT_ID` | Google OAuth application client ID |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Google OAuth client secret |
| `NEXTAUTH_URL` | Application base URL |
| `NEXTAUTH_SECRET` | Secret used to protect authentication sessions |
| `ALLOWED_EMAILS` | Comma-separated list of authorized email addresses |
| `GOOGLE_SHEET_ID` | Target spreadsheet identifier |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Google service account email |
| `GOOGLE_PRIVATE_KEY` | Service account private key |

For `GOOGLE_PRIVATE_KEY`, preserve the newline formatting required by the application's credential parser.

**Important:** Never commit `.env.local`, private keys, OAuth secrets, or service account JSON credentials to GitHub.

### 6. Run the Development Server

```bash
npm run dev
```

Open:

http://localhost:3000

### 7. Production Build

```bash
npm run build
npm run start
```

A successful production build should be verified before deployment.

---

## Application Workflow

### Task Creation

1. An authorized user signs in.
2. The user selects the relevant client.
3. A new task or change request is created.
4. Task information is validated by the backend.
5. The record is saved to the corresponding Google Sheets worksheet.

### Task Updates

1. The user selects an existing task.
2. Task details, status, or deadline are modified.
3. The application sends the update to its backend.
4. The backend updates the relevant spreadsheet record.
5. The dashboard retrieves the latest information when refreshed.

### Deadline Monitoring

WorkTrack uses task due dates to classify work into relevant categories:

- **Upcoming:** Tasks with future deadlines.
- **Due Today:** Tasks scheduled for the current date.
- **Overdue:** Incomplete tasks with deadlines in the past.
- **Completed:** Tasks marked as completed.

Deadline calculations depend on the configured date format and application timezone.

---

## Data Management

Google Sheets acts as the primary data source for the application.

Each client can be represented by a separate worksheet containing its associated task records.

Typical task fields include:

| Field | Purpose |
|---|---|
| Task ID | Unique task identifier |
| Client | Associated client |
| Description | Task or change request details |
| Type | Request classification |
| Request Date | Date the request was received |
| Approval | Approval status |
| Status | Current task progress |
| Due Date | Expected completion deadline |
| Delivery Date | Actual delivery date |

The precise fields depend on the spreadsheet structure and implemented mapping.

For reliable multi-user operation, stable task identifiers and concurrent editing protection are recommended.

---

## Security

WorkTrack incorporates authentication and controlled spreadsheet access.

### Security Measures

- Google OAuth for user authentication.
- Email-based access restrictions.
- Server-side Google Sheets API operations.
- Environment-based credential storage.
- Separation of user authentication and spreadsheet access.

### Recommended Production Practices

- Enforce authorization on every protected API endpoint.
- Validate all incoming task data.
- Restrict spreadsheet access to authorized accounts.
- Use HTTPS for production deployments.
- Protect service account credentials.
- Maintain spreadsheet backups.
- Avoid exposing confidential client information.
- Implement audit logging and concurrency safeguards before wider team adoption.

---

## Deployment

WorkTrack can be deployed using a hosting platform compatible with Next.js, such as Vercel.

A production deployment requires:

1. A configured hosting environment.
2. Production environment variables.
3. An authorized Google OAuth redirect URI.
4. Google Sheets API access.
5. Appropriate authentication and access controls.

For production, update `NEXTAUTH_URL` to the deployed application URL and configure the matching OAuth callback URL in Google Cloud Console.

The application should be tested thoroughly before handling operational or confidential client records.

---

## Future Enhancements

Planned improvements may include:

- Role-based access control.
- Task assignment to individual team members.
- Priority classification and escalation.
- Automated deadline reminders.
- Email notifications.
- Activity history and audit logging.
- Advanced dashboard analytics.
- Client-specific reporting.
- Exportable reports.
- Stable task identifiers.
- Concurrent editing protection.
- Optional migration to a relational database for larger deployments.

---

## License

This project is proprietary and is not licensed for redistribution, modification, or commercial use without permission from the copyright holder.

All rights reserved.

---

**WorkTrack**  
*Task & Change Request Management System*
