# ERP System

ERP system for ERP - a piping & tubular trading company. Built with Next.js 16, Prisma, and PostgreSQL.

## Tech Stack

- **Frontend:** Next.js 16.1.6 (Turbopack), React, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes, Prisma ORM 7.3
- **Database:** PostgreSQL
- **Auth:** NextAuth.js (JWT strategy)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables - create a `.env` file:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/nps_erp"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

3. Run database migrations:

```bash
npx prisma migrate deploy
```

4. Seed the database:

```bash
npx prisma db seed
```

5. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Default Admin Credentials

| Field    | Value          |
|----------|----------------|
| Email    | `admin@erp.com`  |
| Password | `Admin@123`    |

## Modules

| Module             | Description                                      |
|--------------------|--------------------------------------------------|
| **Dashboard**      | KPI cards with live metrics                      |
| **Masters**        | Products, Pipe Sizes, Customers, Vendors, Testing |
| **Enquiries**      | Customer enquiry management                      |
| **Quotations**     | Quotation creation, PDF generation, email        |
| **Sales**          | Sales orders, customer PO review, stock reservation |
| **Purchase**       | Purchase requisitions, purchase orders, vendor tracking |
| **Inventory**      | GRN, stock management, heat number tracking      |
| **Quality**        | Inspections, NCR register, MTC repository, lab letters |
| **Dispatch & Finance** | Packing lists, dispatch notes, invoices, payments |
| **Reports**        | Sales, inventory, vendor performance, NCR analysis, OTD, customer ageing |
| **Admin**          | User management, audit logs, traceability        |

## User Roles

| Role       | Access                                    |
|------------|-------------------------------------------|
| ADMIN      | Full access to all modules                |
| MANAGEMENT | Dashboard, reports, all operational modules |
| SALES      | Enquiries, quotations, sales orders       |
| PURCHASE   | Purchase requisitions, purchase orders    |
| QC         | Quality inspections, NCR, lab letters     |
| STORES     | Inventory, dispatch                       |
| ACCOUNTS   | Invoices, payments                        |
