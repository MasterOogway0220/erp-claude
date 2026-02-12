# Render Deployment Guide - NPS ERP System

**Date:** February 12, 2026
**Platform:** Render.com
**Application:** NPS ERP (Next.js + PostgreSQL + Prisma)

---

## Quick Start - Deploy in 10 Minutes

### Option 1: One-Click Blueprint Deployment (Easiest)

1. **Push code to GitHub:**
   ```bash
   git add .
   git commit -m "Ready for Render deployment"
   git push origin master
   ```

2. **Deploy on Render:**
   - Go to [dashboard.render.com](https://dashboard.render.com)
   - Click **"New +"** → **"Blueprint"**
   - Connect your GitHub repository
   - Select `nps-erp` repo
   - Click **"Apply"**
   - Wait 5-10 minutes for deployment

3. **Access your app:**
   ```
   https://nps-erp-web.onrender.com/login

   Login: admin@erp.com
   Password: Admin@123
   ```

### Option 2: Manual Setup (More Control)

See detailed instructions below.

---

## Prerequisites

✅ Render account (free tier available)
✅ GitHub account
✅ Code pushed to GitHub repository
✅ Build passes locally (`npm run build`)

---

## Deployment Architecture

```
┌─────────────────────────────────────┐
│   Render Cloud Infrastructure       │
├─────────────────────────────────────┤
│                                     │
│  ┌──────────────────────────────┐  │
│  │  nps-erp-web (Web Service)   │  │
│  │  - Next.js 16                │  │
│  │  - Node.js Runtime           │  │
│  │  - Auto-scaling              │  │
│  │  - SSL Certificate           │  │
│  └──────────┬───────────────────┘  │
│             │                       │
│  ┌──────────▼───────────────────┐  │
│  │  nps-erp-db (PostgreSQL)     │  │
│  │  - PostgreSQL 15             │  │
│  │  - Managed Backups           │  │
│  │  - Connection Pooling        │  │
│  └──────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

---

## Method 1: Blueprint Deployment (Recommended)

### Files Created for Deployment

1. **render.yaml** - Service configuration
2. **src/app/api/health/route.ts** - Health check endpoint
3. **.env.production.example** - Environment variables reference

### Step-by-Step Instructions

#### 1. Verify Local Setup

```bash
# In your project directory E:\erp
cd /e/erp

# Check all deployment files exist
ls render.yaml
ls src/app/api/health/route.ts
ls .env.production.example

# Verify build works
npm run build

# Check TypeScript compilation
npx tsc --noEmit
```

#### 2. Commit and Push to GitHub

```bash
# Add all files
git add .

# Commit with deployment files
git commit -m "feat: Add Render deployment configuration

- Add render.yaml for infrastructure as code
- Add health check endpoint at /api/health
- Add production environment example
- Ready for production deployment"

# Push to GitHub
git push origin master
```

#### 3. Deploy on Render

1. **Create Render Account:**
   - Visit [render.com](https://render.com)
   - Sign up with GitHub
   - Verify email

2. **Create New Blueprint:**
   - Click **"New +"** in dashboard
   - Select **"Blueprint"**
   - Choose **"Connect a repository"**
   - Authorize GitHub access
   - Select your repository: `nps-erp`

3. **Review Blueprint:**
   - Render detects `render.yaml`
   - Reviews services to create:
     - **Database:** nps-erp-db (PostgreSQL)
     - **Web Service:** nps-erp-web (Next.js)

4. **Configure Service Names (Optional):**
   - Keep default names or customize
   - Note: If you change web service name, update NEXTAUTH_URL

5. **Apply Blueprint:**
   - Click **"Apply"** button
   - Render creates database first
   - Then deploys web service
   - Monitor build logs (5-10 minutes)

#### 4. Monitor Deployment

**Build Progress:**
```
✓ Cloning repository
✓ Installing dependencies (npm ci)
✓ Generating Prisma Client
✓ Running database migrations
✓ Building Next.js application
✓ Starting production server
```

**Expected Build Time:** 5-10 minutes

#### 5. Verify Deployment

```bash
# Test health endpoint
curl https://nps-erp-web.onrender.com/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2026-02-12T10:30:00.000Z",
  "database": "connected",
  "service": "nps-erp"
}
```

#### 6. Access Application

```
URL: https://nps-erp-web.onrender.com/login

Credentials:
Email: admin@erp.com
Password: Admin@123

⚠️ IMPORTANT: Change password immediately after first login!
```

---

## Method 2: Manual Deployment

### Step 1: Create PostgreSQL Database

1. **New PostgreSQL Service:**
   - Dashboard → **"New +"** → **"PostgreSQL"**

2. **Configuration:**
   ```
   Name: nps-erp-db
   Database: nps_erp_production
   User: nps_erp_user
   Region: Singapore (or nearest)
   PostgreSQL Version: 15
   Plan: Starter ($7/month) or Free
   ```

3. **Create Database:**
   - Click **"Create Database"**
   - Wait for provisioning (2-3 minutes)
   - Copy **Internal Database URL**

### Step 2: Create Web Service

1. **New Web Service:**
   - Dashboard → **"New +"** → **"Web Service"**

2. **Connect Repository:**
   - Connect GitHub
   - Select `nps-erp` repository
   - Branch: `master`

3. **Configure Build:**
   ```
   Name: nps-erp-web
   Region: Singapore (same as database!)
   Branch: master
   Runtime: Node

   Build Command:
   npm ci && npx prisma generate && npx prisma migrate deploy && npm run build

   Start Command:
   npm start
   ```

4. **Environment Variables:**
   Click **"Advanced"** → **"Add Environment Variable"**

   ```env
   NODE_ENV=production

   DATABASE_URL=[Paste Internal Database URL from Step 1]

   SHADOW_DATABASE_URL=[Same as DATABASE_URL]

   NEXTAUTH_URL=https://nps-erp-web.onrender.com

   NEXTAUTH_SECRET=[Generate - see below]

   JWT_SECRET=[Generate - see below]

   NODE_OPTIONS=--max-old-space-size=4096
   ```

5. **Generate Secrets:**
   ```bash
   # Run locally to generate secure random secrets:
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   # Copy output for NEXTAUTH_SECRET

   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   # Copy output for JWT_SECRET
   ```

6. **Health Check:**
   - Health Check Path: `/api/health`
   - Check Interval: 30 seconds

7. **Create Service:**
   - Click **"Create Web Service"**
   - Monitor build logs

---

## Post-Deployment Configuration

### 1. Database Seeding

**Option A: Via Render Shell**
```bash
# Open Shell in web service dashboard
npx tsx prisma/seed.ts
```

**Option B: Manual Seed Script**
```bash
# In Render shell, run:
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function seed() {
  const hash = await bcrypt.hash('Admin@123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@erp.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@erp.com',
      passwordHash: hash,
      role: 'ADMIN',
    },
  });
  console.log('Admin created');
  process.exit(0);
}

seed();
"
```

### 2. Import Master Data

```bash
# In Render shell:

# Customer import
npx tsx scripts/migration/migrate-customers.ts

# Product specifications
npx tsx scripts/migration/migrate-product-specs.ts

# Size master
npx tsx scripts/migration/migrate-sizes.ts

# Inventory (optional)
npx tsx scripts/migration/migrate-inventory.ts
```

### 3. Security Configuration

✅ **Change admin password immediately**
✅ **Review user roles**
✅ **Enable 2FA on Render account**
✅ **Set up monitoring alerts**

---

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@host/db` |
| `SHADOW_DATABASE_URL` | Migrations database | Same as DATABASE_URL |
| `NEXTAUTH_URL` | Application URL | `https://nps-erp-web.onrender.com` |
| `NEXTAUTH_SECRET` | Auth encryption key | Random 32-byte hex |
| `JWT_SECRET` | JWT signing key | Random 32-byte hex |
| `NODE_OPTIONS` | Node memory limit | `--max-old-space-size=4096` |

---

## Troubleshooting

### Build Fails

**Error: "Cannot find module '@prisma/client'"**
```bash
Solution: Ensure build command includes:
npx prisma generate
```

**Error: "FATAL: password authentication failed"**
```bash
Solution: Use INTERNAL database URL, not external
Check: DATABASE_URL starts with internal hostname
```

**Error: "JavaScript heap out of memory"**
```bash
Solution: Add environment variable:
NODE_OPTIONS=--max-old-space-size=4096
```

### Runtime Errors

**Error: "Unauthorized" on login**
```bash
Check:
1. NEXTAUTH_SECRET is set
2. JWT_SECRET is set
3. NEXTAUTH_URL matches your domain
```

**Error: "Health check failing"**
```bash
Check:
1. Database is running (green status)
2. DATABASE_URL is correct
3. View logs for database connection errors
```

**Error: "502 Bad Gateway"**
```bash
Solution:
1. Check if service is running
2. View logs for startup errors
3. Verify build completed successfully
```

### Performance Issues

**Slow first request (Free tier)**
```
Cause: Free services sleep after 15 min inactivity
Solution:
1. Upgrade to Starter plan ($7/mo) - no sleep
2. Or use cron job to keep alive every 10 min
```

**Database connection timeouts**
```bash
Solution: Add to DATABASE_URL:
?connection_limit=10&pool_timeout=20
```

---

## Monitoring & Maintenance

### Health Monitoring

**Render Dashboard:**
- Real-time logs
- CPU/Memory usage
- Request metrics

**External Monitoring:**
```bash
# Set up UptimeRobot or similar
URL: https://your-app.onrender.com/api/health
Check every: 5 minutes
Alert on: 2 consecutive failures
```

### Database Backups

**Automatic (Paid plans):**
- Starter: Daily backups, 7-day retention
- Pro: Continuous backups

**Manual Backup:**
```bash
# Connect to database
pg_dump $DATABASE_URL > backup.sql

# Restore
psql $DATABASE_URL < backup.sql
```

### Logs

**View Real-time Logs:**
- Service → Logs → Live Logs

**Download Historical Logs:**
- Service → Logs → Download

### Scaling

**Vertical Scaling:**
- Starter: $7/mo (512MB RAM)
- Standard: $25/mo (2GB RAM)
- Pro: $85/mo (4GB RAM)

**Horizontal Scaling:**
- Available on Pro plan
- Add multiple instances
- Load balancing included

---

## Custom Domain Setup

### 1. Add Domain in Render

```
Service → Settings → Custom Domains
Add: erp.yourcompany.com
```

### 2. Update DNS Records

```
Type: CNAME
Name: erp (or @)
Value: nps-erp-web.onrender.com
TTL: 3600
```

### 3. Update Environment Variables

```
NEXTAUTH_URL=https://erp.yourcompany.com
```

### 4. SSL Certificate

- Automatic (Let's Encrypt)
- Free for all domains
- Auto-renewal

---

## Cost Breakdown

### Free Tier
```
Web Service: Free (with 15-min sleep)
PostgreSQL: Free (1GB, no backups)
Total: $0/month

Good for: Testing, demos
Not recommended for: Production
```

### Starter Tier (Recommended)
```
Web Service: $7/month (512MB RAM, no sleep)
PostgreSQL: $7/month (1GB, daily backups)
Total: $14/month

Good for: Small production, 10-50 users
```

### Standard Tier (Production)
```
Web Service: $25/month (2GB RAM)
PostgreSQL: $20/month (10GB storage)
Total: $45/month

Good for: Production, 50-200 users
```

---

## Deployment Checklist

### Pre-Deployment
- [x] All TypeScript errors fixed
- [x] Production build succeeds locally
- [x] Prisma schema validated
- [x] Environment variables documented
- [x] Health check endpoint created
- [x] render.yaml configured
- [x] Code pushed to GitHub

### During Deployment
- [ ] Create Render account
- [ ] Connect GitHub repository
- [ ] Deploy via Blueprint
- [ ] Monitor build logs
- [ ] Wait for deployment to complete

### Post-Deployment
- [ ] Verify health check passes
- [ ] Test database connection
- [ ] Login with admin credentials
- [ ] **Change admin password**
- [ ] Seed database with data
- [ ] Test core functionality
- [ ] Set up monitoring
- [ ] Configure custom domain (optional)

---

## Quick Command Reference

```bash
# Generate secret keys
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Test health endpoint
curl https://your-app.onrender.com/api/health

# Seed database (in Render shell)
npx tsx prisma/seed.ts

# View Prisma Studio (in Render shell)
npx prisma studio

# Run migrations (automatic in build)
npx prisma migrate deploy
```

---

## Security Best Practices

✅ Use strong NEXTAUTH_SECRET (32+ bytes)
✅ Use strong JWT_SECRET (32+ bytes)
✅ Change default admin password
✅ Enable 2FA on Render account
✅ Use Internal Database URL (not External)
✅ Review user permissions regularly
✅ Monitor audit logs
✅ Keep dependencies updated

---

## Support & Resources

- **Render Documentation:** https://render.com/docs
- **Render Community:** https://community.render.com
- **Prisma Docs:** https://www.prisma.io/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Project Documentation:** `/project_documents/`

---

## Next Steps

1. ✅ Review this deployment guide
2. ⏭️ Create Render account (if not done)
3. ⏭️ Push code to GitHub (if not done)
4. ⏭️ Deploy using Blueprint method
5. ⏭️ Verify health endpoint
6. ⏭️ Login and change admin password
7. ⏭️ Seed database with master data
8. ⏭️ Begin UAT on production URL
9. ⏭️ Set up monitoring
10. ⏭️ Configure custom domain (optional)

---

**Deployment Status:** ✅ Ready for Production
**Estimated Deployment Time:** 10-15 minutes
**Recommended Plan:** Starter ($14/month)

**Questions?** Check troubleshooting section or create GitHub issue.

---

**End of Render Deployment Guide**
