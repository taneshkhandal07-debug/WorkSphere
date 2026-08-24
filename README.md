# WorkSphere

<div align="center">

  ![Next.js](https://img.shields.io/badge/Next.js-16.3.1-black?style=for-the-badge&logo=next.js)
  ![Prisma](https://img.shields.io/badge/Prisma-ORM_v7-2D3748?style=for-the-badge&logo=prisma)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)
  ![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel)
  ![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)

  <br />

  ### 🌐 **Live Demo:** [work-sphere-sandy.vercel.app](https://work-sphere-sandy.vercel.app/)

  **One Workspace. Every Workflow.**
  *A unified, full-stack enterprise collaboration and workforce management platform.*

</div>

---

## 📌 Executive Summary

**WorkSphere** is an enterprise-grade digital workspace engineered to streamline organizational communication, task management, workforce attendance tracking, file sharing, and administrative control within a single seamless dashboard.

Designed for high performance, serverless portability, and aesthetic excellence, WorkSphere features stateless AES-256 encrypted authentication, hybrid WebSocket / REST polling real-time chat, dynamic Kanban boards, and role-based access control (RBAC).

---

## ✨ Key Features

- 🔐 **Stateless AES-256 Session Auth:** High-security encrypted session tokens stored in HTTP-only cookies, ensuring seamless operation across Vercel serverless environments.
- 📋 **Interactive Kanban & Task Board:** Drag-and-drop workflow statuses (`Backlog`, `To Do`, `In Progress`, `Review`, `Done`), subtask checklists, and priority tagging.
- 💬 **Real-Time Communication:** Hybrid messaging with WebSocket real-time broadcast server (`ws://`) and automatic fallback to HTTP REST polling.
- ⏱️ **Workforce Attendance Tracker:** Daily session check-in/check-out timers with duration metrics and organization-wide HR logs.
- 📁 **File & Asset Management:** Secure file upload and retrieval API with automatic `/tmp` directory fallback for Vercel ephemeral storage.
- 👑 **Role-Based Access Control (RBAC):** Dedicated views and permissions for **Super Admin**, **HR Manager**, **Manager**, **Employee**, and **Pending** account statuses.
- 📊 **Analytics & Audit Logging:** Comprehensive administrative dashboard featuring system metrics, active users, department stats, and system audit logs.

---

## 🛠️ Technology Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | [Next.js 16 (App Router)](https://nextjs.org/) | React 19 framework using Turbopack for fast SSR & static generation |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) | End-to-end type safety and interface definitions |
| **Database ORM**| [Prisma ORM v7](https://www.prisma.io/) | Database modeling with `@prisma/adapter-better-sqlite3` driver adapter |
| **Styling** | Vanilla CSS Design System | Modern design tokens, glassmorphism, dark palette, and CSS variables |
| **Icons & Charts**| [Lucide React](https://lucide.dev/) & [Recharts](https://recharts.org/) | Clean iconography and dynamic visual data charts |
| **Real-Time Layer**| WebSocket / Node `ws` | Dedicated broadcast server on port `3001` with client-side polling fallback |

---

## 🚀 Quick Start Guide

Follow these steps to run WorkSphere locally on your machine:

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/taneshkhandal07-debug/WorkSphere.git
cd WorkSphere
npm install
```

### 2. Configure Environment Variables
Verify or create a `.env` file in the root directory:
```env
DATABASE_URL="file:./dev.db"
SESSION_SECRET="worksphere_default_secret_key_session_signing_auth_9988"
# Optional: Set custom WebSocket URL if running a external WS server
NEXT_PUBLIC_WS_URL="ws://localhost:3001"
```

### 3. Initialize & Seed Database
Generate compiled Prisma Client artifacts and seed the SQLite database with test accounts:
```bash
# Generate Prisma Client & sync schema
npx prisma generate
npx prisma db push

# Seed default test accounts
npx tsx prisma/seed.ts
```

### 4. Start Development Servers
Start the Next.js development server (and optionally the real-time WebSocket server):
```bash
# Terminal 1: Next.js Web App
npm run dev

# Terminal 2 (Optional for local WebSockets):
node socket-server.js
```
Open your browser and navigate to **[http://localhost:3000](http://localhost:3000)**.

---

## 🔑 Seeded Test Accounts

You can sign in using any of the pre-configured role accounts:

| Role | Email Address | Password | Account Status | Permissions / Access Level |
| :--- | :--- | :--- | :--- | :--- |
| 👑 **Super Admin** | `admin@worksphere.com` | `Password1234` | `ACTIVE` | Full platform administration, audit logs, system stats |
| 👔 **HR Manager** | `hr@worksphere.com` | `Password1234` | `ACTIVE` | Directory management, pending account approvals |
| 🎯 **Manager** | `manager@worksphere.com` | `Password1234` | `ACTIVE` | Project planning, team assignment, task boards |
| 🧑‍💻 **Employee** | `employee@worksphere.com` | `Password1234` | `ACTIVE` | Daily attendance check-in, task updates, messaging |
| ⏳ **Pending User** | `pending@worksphere.com` | `Password1234` | `PENDING` | Redirected to "Awaiting HR Approval" review screen |

---

## 🌐 Vercel Deployment Guide

WorkSphere is fully configured for seamless 1-click deployment on **Vercel**:

1. Push your repository to **GitHub**.
2. Import the repository into your **Vercel Dashboard**.
3. **Build Configuration** (automatically detected via `vercel.json`):
   - **Framework Preset:** Next.js
   - **Build Command:** `npm run build`
   - **Install Command:** `npm install`
4. Set Environment Variables in Vercel:
   - `DATABASE_URL`: `"file:./dev.db"` (or your production PostgreSQL / Prisma Postgres URL)
   - `SESSION_SECRET`: Your production secret string
5. Click **Deploy**.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
