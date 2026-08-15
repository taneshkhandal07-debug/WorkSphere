# WorkSphere

> **One Workspace. Every Workflow.**

WorkSphere is a unified full-stack enterprise collaboration and workforce management platform that combines team communication, task boards, attendance logs, files, and admin utilities into a cohesive digital workspace.

---

## Technology Stack

* **Frontend Framework:** Next.js (App Router) with TypeScript
* **Database Layer:** Prisma ORM v7 with SQLite database driver adapter
* **Styling:** Custom Vanilla CSS Design System (variables / design tokens)
* **Icons:** Lucide React
* **Analytics & Graphs:** Recharts

---

## Installation & Setup

Follow these steps to run WorkSphere locally on your machine:

### 1. Install Dependencies
Install all NPM packages (including Prisma adapters and TypeScript definitions):
```bash
npm install
```

### 2. Configure Environment Variables
A default `.env` file is generated in the root directory. Confirm it contains the database connection URL pointing to your SQLite file:
```env
DATABASE_URL="file:./dev.db"
```

### 3. Initialize the Database
Generate the compiled Prisma Client and sync the database models (this will create a local `dev.db` file in the project root):
```bash
npx prisma generate
npx prisma db push
```

### 4. Seed Test Accounts
Populate the database with test accounts for each key employee role (all accounts share the password `password123`):
```bash
npx tsx prisma/seed.ts
```

### 5. Start the Development Server
Start the local Next.js development server:
```bash
npm run dev
```
Open your browser and navigate to [http://localhost:3000](http://localhost:3000).

---

## Seeded Test Accounts

Use these credentials to sign in and test different user roles and account statuses:

| Role | Email Address | Password | Status | Access |
|---|---|---|---|---|
| **Super Admin** | `admin@worksphere.com` | `password123` | `ACTIVE` | Full administration, analytics, logs, permissions |
| **HR Manager** | `hr@worksphere.com` | `password123` | `ACTIVE` | Account approvals, directory review, updates |
| **Manager** | `manager@worksphere.com` | `password123` | `ACTIVE` | Project planning, task board assignments |
| **Employee** | `employee@worksphere.com` | `password123` | `ACTIVE` | Session check-in, task updates, messaging |
| **Pending User** | `pending@worksphere.com` | `password123` | `PENDING` | Redirected to **Awaiting Approval** review card |
