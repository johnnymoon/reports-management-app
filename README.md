# Reports Management App

A React + Express + MongoDB application for managing the `Reports` collection.

## Requirements
- Node.js 18 or newer
- MongoDB connection string

## Setup

1. Extract the ZIP.
2. In `server`, copy `.env.example` to `.env` and set `MONGODB_URI`.
3. From the project root, install dependencies:

```bash
npm install
npm run install:all
```

4. Start the backend and frontend:

```bash
npm run dev
```

Frontend: http://localhost:5173  
Backend: http://localhost:3000

The Vite development server proxies `/api` requests to the backend.

## API endpoints

- `POST /api/create-reports-collection` — create the collection if it does not exist
- `GET /api/reports` — list all reports
- `GET /api/reports/:id` — retrieve one report
- `POST /api/reports` — create a report
- `PUT /api/reports/:id` — update supplied report fields
- `DELETE /api/reports/:id` — delete a report

## Fields

- `ReportType` (string)
- `ReportTitle` (string)
- `ReportDescription` (string)
- `ReportDate` (date)
- `ReportLocation` (string)
- `ReportLGA` (string)
- `ReportState` (string)
- `ReportRegion` (string)

The API requires all eight fields when creating a report. Updates are partial: only supplied fields are changed.

## Notes
- The app connects to database `testDB` and collection `Reports` by default.
- Change `DB_NAME` in `server/.env` if required.
- The collection creation endpoint uses MongoDB JSON Schema validation.
- Deletion is permanent in this starter app. Consider implementing soft-delete/audit history for real incident-management use.
- Configure CORS, authentication, authorization, rate limiting, backups, and HTTPS before production deployment.
