# Passport Automation System

A complete academic full-stack demonstration of a fictional Passport Automation System. It is **not connected to Passport Seva, government systems, or real credentials**.

## Features
- React + Vite responsive frontend with Tailwind CSS
- Node.js + Express REST API
- PostgreSQL + Prisma ORM
- JWT authentication + bcrypt password hashing
- Applicant and Admin role-based authorization
- Application CRUD and generated application numbers (`PAS-YYYY-00001`)
- Multi-step passport application workflow
- Demo document upload/metadata and admin verification
- Status timeline: Draft → Submitted → Document Verification → Police Verification → Approved → Dispatched → Delivered, plus Rejected
- Admin dashboard with Recharts statistics
- Search, status filtering and pagination
- Notifications on status changes
- Audit logs, user management and police verification view
- Seed/demo data
- Vercel + Render deployment configuration

## Architecture
```mermaid
flowchart LR
  A[React/Vite + Tailwind] -->|Axios REST| B[Express API]
  B --> C[JWT + bcrypt]
  B --> D[Prisma ORM]
  D --> E[(Neon PostgreSQL)]
  B --> F[Demo document metadata/uploads]
```

## Project structure
```text
passport-automation/
├── client/                 # React + Vite frontend
│   ├── src/components
│   ├── src/context
│   ├── src/layouts
│   ├── src/pages
│   └── src/services
├── server/                 # Express API
│   └── src/index.js
├── prisma/
│   ├── schema.prisma
│   └── seed.js
├── .env.example
└── render.yaml
```

## Demo credentials
**Admin**
- Email: `admin@passportdemo.com`
- Password: `Admin@123`

**Applicant**
- Email: `applicant@passportdemo.com`
- Password: `Applicant@123`

Other seeded applicants:
- `rahul@passportdemo.com` / `Applicant@123`
- `meera@passportdemo.com` / `Applicant@123`

## Local setup
### 1. PostgreSQL
Create a PostgreSQL database (Neon is recommended for deployment). Copy `.env.example` to `server/.env` and set:
```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/passportdb?sslmode=require"
JWT_SECRET="use-a-long-random-secret"
PORT=5000
CLIENT_URL="http://localhost:5173"
```

### 2. Backend
```bash
cd server
npm install
npx prisma generate
npx prisma db push
cd ..
npm install
npm run seed
cd server
npm start
```
API: `http://localhost:5000`

### 3. Frontend
Create `client/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```
Then:
```bash
cd client
npm install
npm run dev
```
Open `http://localhost:5173`.

## One-command development
From the root after installing root dependencies:
```bash
npm install
npm run install:all
npm run dev
```

## Deployment: Neon + Render + Vercel
### A. Neon PostgreSQL
1. Create a Neon PostgreSQL project.
2. Copy the pooled connection string into Render as `DATABASE_URL`.
3. Locally or from the Render shell, run:
```bash
npx prisma db push
node prisma/seed.js
```

### B. Render backend
Create a **Web Service** from this repository:
- Root Directory: `server`
- Build Command: `npm install && npx prisma generate && npx prisma db push`
- Start Command: `node src/index.js`
- Environment variables:
  - `DATABASE_URL` = Neon connection string
  - `JWT_SECRET` = long random secret
  - `CLIENT_URL` = your Vercel URL

After deployment, test:
```text
https://YOUR-RENDER-SERVICE.onrender.com/api/health
```

### C. Vercel frontend
Import the repository into Vercel:
- Root Directory: `client`
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment variable:
  - `VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com/api`

The included `client/vercel.json` keeps React routes working on refresh.

### D. Seed demo data in production
Run once from a machine with production `DATABASE_URL`:
```bash
cd passport-automation
DATABASE_URL="YOUR_NEON_URL" node prisma/seed.js
```
If using Render Shell, run:
```bash
node ../prisma/seed.js
```

## API summary
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register applicant |
| POST | `/api/auth/login` | Login and receive JWT |
| GET | `/api/auth/me` | Current user |
| GET | `/api/track/:applicationNumber` | Public status tracking |
| GET | `/api/applications` | Applicant/admin applications |
| POST | `/api/applications` | Create draft |
| PUT | `/api/applications/:id` | Update draft |
| DELETE | `/api/applications/:id` | Delete draft |
| POST | `/api/applications/:id/submit` | Submit application |
| GET | `/api/documents` | List documents |
| POST | `/api/documents` | Upload demo document |
| PUT | `/api/documents/:id/verify` | Admin document verification |
| PUT | `/api/applications/:id/status` | Admin status update |
| GET | `/api/admin/dashboard` | Admin statistics |
| GET | `/api/admin/applications` | Search/filter/pagination |
| GET | `/api/admin/users` | User management |
| GET | `/api/admin/police` | Police verification |
| GET | `/api/admin/audit-logs` | Audit logs |
| GET | `/api/notifications` | Applicant notifications |
| PUT | `/api/notifications/:id/read` | Mark notification read |

## Database models
`User`, `PassportApplication`, `Document`, `PoliceVerification`, `Notification`, and `AuditLog`, with Prisma relations, foreign keys and indexes.

## Presentation demo (5–10 minutes)
1. Open the public frontend URL.
2. Login as `applicant@passportdemo.com` / `Applicant@123`.
3. Show Applicant Dashboard and the seeded application `PAS-2026-00001`.
4. Open the application to show the progress tracker and documents.
5. Open **Documents** to show document records.
6. Logout and login as `admin@passportdemo.com` / `Admin@123`.
7. Show Admin Dashboard charts.
8. Open **Applications**, search `PAS-2026-00001` and open Review.
9. Change status to `APPROVED` and add a remark.
10. Logout and return to applicant; the notification/status is updated.

## Important academic note
All names, application numbers, documents and credentials are fictional demo data. Do not upload real identity documents to this project.

## Common errors
**`P1001 Can't reach database server`**: check `DATABASE_URL`, Neon database status, and SSL settings.

**Frontend says Network Error**: check `VITE_API_URL` and that Render `/api/health` responds.

**CORS error**: set `CLIENT_URL` to the deployed Vercel URL and redeploy backend.

**Prisma Client error**: run `npx prisma generate` in `server`.

**React route returns 404 after refresh on Vercel**: keep `client/vercel.json` in the project.
