# 🌿 Prakriti Estates

> **A High-Performance, Map-Centric Real Estate Monolith with PostGIS, Escrow Ledgers, and Integrated Architectural Engineering Services.**

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?logo=next.js)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-PostGIS-336791?logo=postgresql)](https://postgis.net/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4.0-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Mapbox](https://img.shields.io/badge/Mapbox-GL-000000?logo=mapbox)](https://www.mapbox.com/)
[![BullMQ](https://img.shields.io/badge/BullMQ-Redis-DC382D?logo=redis)](https://bullmq.io/)
[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?logo=github-actions)](https://github.com/features/actions)

---

## 📌 Executive Summary

**Prakriti Estates** is a production-grade, full-stack real estate platform designed for the Indian marketplace. Unlike traditional listing portals that merely post classified ads, Prakriti Estates integrates **geospatial search**, **state-governed tenancy cycles**, **Aadhaar/PAN KYC compliance**, an **immutable financial double-entry escrow ledger**, and **value-added engineering services** (Prakriti Consultants) into an unbreachable Next.js monolith.

---

## 🏗️ Core Architecture & Highlights

### 1. 🗺️ Map-Centric Geospatial Search
* **PostGIS Core:** Utilizes PostgreSQL PostGIS (`ST_MakeEnvelope`, `ST_DWithin`, `ST_SetSRID`) executed through sanitized raw SQL blocks in Prisma to query bounding boxes and radius proximity searches concurrently with categorical filters.
* **Client-Side Clustering:** Mapbox GL wrapped with `use-supercluster`, enabling 60fps clustering of thousands of properties across Delhi, Noida, and Gurgaon.
* **URL State Synchronization:** Real-time bidirectional viewport synchronization using Zod-parsed search parameters with 500ms debouncing.

### 2. 💰 Financial Escrow & Immutable Double-Entry Ledger
* **State Machine Isolation:** Financial transactions strictly move through `PENDING ➔ COMPLETED ➔ REFUNDED / DISPUTED` using serializable PostgreSQL transactions to eliminate double-spending or race conditions.
* **Immutable Ledgers:** Monies deposited for bookings (`ESCROW_HOLD`), platform fees (`PLATFORM_FEE_DEDUCTION`), and tax deductions are recorded as append-only `FinancialLedgerEntry` rows. Balances are never rewritten.
* **Dispute Resolution Engine:** Super Admins can resolve disputes (`REFUND_BUYER`, `RELEASE_TO_SELLER`, `PARTIAL_REFUND`) with idempotent checks that verify external payment gateway refunds prior to committing DB mutations.

### 3. 🏢 Tenancy Lifecycle, Invoicing & HRA Generation
* **Tenancy Management:** Links Tenant, Landlord, and Property with security deposits and rent agreements.
* **Dynamic Meter Tracking:** Utility invoices calculate previous and current meter readings against rates.
* **Legal HRA Rent Receipts:** Server-side PDF generation engine using `pdf-lib` that traverses the KYC verification graph to embed Landlord PAN numbers, issuing legally compliant receipts uploaded to S3 storage.
* **Maintenance State Machine:** Ticket workflow (`OPEN ➔ ACKNOWLEDGED ➔ IN_PROGRESS ➔ AWAITING_APPROVAL ➔ APPROVED ➔ RESOLVED`) with role-based cost authorization.

### 4. 📐 Value-Added Services (VAS) & Prakriti Consultants
* Integrated consulting division led by **Er. Aditya Jaiswal** (B.Tech HBTU Kanpur, M.Tech IIT Delhi).
* Dedicated service requests for **Vastu Audits**, **Structural Engineering**, **Space Frame Analysis**, and **3D Walkthroughs**.
* Automated cross-selling triggers when `LAND_PLOT` listings are transacted.

### 5. 📬 Transactional Outbox Pattern & Background Workers
* **Atomic Outbox (`withOutbox`):** Business mutations and event persistence occur within the exact same PostgreSQL transaction, guaranteeing zero event loss.
* **Queue Segmentation (BullMQ + Redis):** Segmented into `high-priority-notifications`, `document-generation`, `financial-reconciliation`, and `scheduled-tasks`.
* **Resilience:** Configured with 5-step exponential backoff (2s to 32s) and Dead Letter Queue (DLQ) auditing in PostgreSQL for failed external integrations.
* **Lock Expiration Engine:** Automated background worker that strictly expires stale property locks, returns inventory to `AVAILABLE`, and enforces financial forfeiture rules.

### 6. 🎨 Dynamic Theme Engine & Security
* Admin-controlled theme configuration (`ThemeConfiguration`) with strict hex/HSL validation to prevent CSS injection attacks.
* Dynamic DOM variable injection (`--theme-primary`, `--theme-secondary`) consumed natively by Tailwind CSS v4.
* **Super Admin Impersonation:** NextAuth JWT claim swapping with persistent, un-dismissible UI warning banner across all pages.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 16 (App Router), React 19, Tailwind CSS v4, Framer Motion, Lucide Icons |
| **Geospatial** | Mapbox GL JS, `use-supercluster`, PostGIS (`geography` & `geometry` types) |
| **Backend & ORM** | Next.js Server Actions, Route Handlers, Prisma ORM 5.22 |
| **Database** | PostgreSQL (Supabase with PostGIS extension enabled) |
| **Async Queues** | BullMQ, Redis (Upstash / IORedis) |
| **Authentication** | NextAuth.js (Stateless JWT with RBAC & Impersonation claims) |
| **Document Engine**| `pdf-lib` (pure JS server-side PDF generator) |
| **DevOps & CI/CD** | GitHub Actions, Multi-Stage Dockerfile |

---

## 🚀 Quick Start Guide

### Prerequisites
* **Node.js** >= 20.x
* **npm** >= 10.x
* **PostgreSQL** instance with PostGIS enabled (e.g., Supabase)
* **Redis** instance (e.g., Upstash or local Redis)
* **Mapbox Public Token**

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/prakriti-estates.git
cd prakriti-estates
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the project root:
```env
# Database (Supabase PostgreSQL + PostGIS)
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN="pk.your_mapbox_public_token"

# Authentication
NEXTAUTH_SECRET="your-super-secret-key-32-chars-minimum"
NEXTAUTH_URL="http://localhost:3000"

# Redis (BullMQ Queues)
REDIS_URL="redis://default:[PASSWORD]@[HOST]:6379"

# S3 Storage (Receipts & Photos)
AWS_REGION="ap-south-1"
AWS_ACCESS_KEY_ID="your_access_key"
AWS_SECRET_ACCESS_KEY="your_secret_key"
AWS_S3_BUCKET="prakriti-estates-receipts"
```

### 3. Initialize & Seed Database
```bash
# Push schema to database
npm run prisma:push

# Generate Prisma Client
npm run prisma:generate

# Seed test users, certified properties, and fee rules
npx tsx prisma/seed.ts
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🧪 Testing & Verification

Prakriti Estates includes an end-to-end integration test runner that exercises all core domain engines sequentially:

```bash
# Run the comprehensive integration test suite
npm run test
```

### Verified Test Suite Capabilities:
- [x] **Purchase Workflow:** Property locking, dynamic fee calculations, and Razorpay webhook processing.
- [x] **Lock Expiration Engine:** 48-hour TTL timeout enforcement and 50% escrow forfeiture calculation.
- [x] **Tenancy Invoicing:** Monthly billing generation with utility meter readings.
- [x] **Landlord Maintenance:** Ticket state transitions and cost approvals.
- [x] **Legal HRA Generation:** Dynamic PDF generation with Landlord PAN embedding and S3 upload.
- [x] **Dispute Resolution:** Idempotent escrow refunds and ledger credit/debit balances.

---

## 📁 Project Directory Structure

```text
prakriti-estates/
├── .github/
│   └── workflows/
│       └── ci-cd.yml           # GitHub Actions CI/CD Pipeline
├── prisma/
│   ├── schema.prisma           # Master PostgreSQL + PostGIS Schema
│   └── seed.ts                 # Database Seeding Script
├── src/
│   ├── app/
│   │   ├── (auth)/             # Authentication views
│   │   ├── admin/              # Super Admin dashboard & layouts
│   │   ├── api/
│   │   │   ├── properties/     # Search endpoints
│   │   │   └── webhooks/       # Payment & Escrow webhooks
│   │   ├── consultants/        # Prakriti Consultants architectural showcase
│   │   ├── search/             # Mapbox interactive search page
│   │   ├── globals.css         # Tailwind CSS v4 entry
│   │   └── layout.tsx          # Root Layout with Theme & Impersonation Banner
│   ├── components/
│   │   ├── Admin/              # Impersonation Banner & Admin tools
│   │   ├── Calculators/        # EMI Calculator
│   │   ├── Layout/             # SearchLayoutShell (Mobile bottom sheet + desktop sidebar)
│   │   ├── Map/                # PropertyMap (Mapbox GL with Supercluster)
│   │   └── Theme/              # Dynamic ThemeProvider (CSS Variable injection)
│   ├── infrastructure/
│   │   ├── auth/               # NextAuth configuration
│   │   └── database/           # Prisma Client singleton
│   └── modules/
│       ├── billing/            # BillingService & Monthly Invoicing
│       ├── notifications/      # NotificationService & channel abstractions
│       ├── outbox/             # Transactional Outbox pattern & event registry
│       ├── properties/         # PostGIS AdvancedSearchService
│       ├── tenancy/            # Tenancy, MaintenanceService, HraReceiptService
│       ├── theme/              # Theme validation & update Server Actions
│       ├── transactions/       # FeeEngineService & DisputeService
│       ├── workers/            # BullMQ QueueManager & OutboxSweeper
│       └── workflows/          # Master Rental & Purchase Orchestrators
├── Dockerfile                  # Multi-Stage Production Containerfile
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 🔄 CI/CD & Deployment

Every commit and pull request to `main` is validated via **GitHub Actions**:
1. **Prisma Validate:** Validates database schema definitions.
2. **Type Check:** Strict `tsc --noEmit` check.
3. **Next.js Production Build:** Verifies zero SSR or Turbopack compilation errors.
4. **Deploy:** Automated schema sync and containerized/Vercel production rollout.

---

## 📄 License

This project is licensed under the ISC License. See the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built with ❤️ for <b>Prakriti Estates</b>
</p>
