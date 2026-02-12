# Production Deployment Guide - NPS ERP System

**Version:** 1.0
**Date:** February 12, 2026
**Project:** National Pipe & Supply ERP System
**Technology Stack:** Next.js 16.1.6, PostgreSQL, Prisma ORM v7, NextAuth.js

---

## Table of Contents

1. [Pre-Deployment Checklist](#1-pre-deployment-checklist)
2. [Infrastructure Requirements](#2-infrastructure-requirements)
3. [Environment Setup](#3-environment-setup)
4. [Database Setup & Migration](#4-database-setup--migration)
5. [Application Deployment](#5-application-deployment)
6. [Security Configuration](#6-security-configuration)
7. [Performance Optimization](#7-performance-optimization)
8. [Backup & Disaster Recovery](#8-backup--disaster-recovery)
9. [Monitoring & Logging](#9-monitoring--logging)
10. [Go-Live Checklist](#10-go-live-checklist)
11. [Post-Deployment Tasks](#11-post-deployment-tasks)
12. [Rollback Procedures](#12-rollback-procedures)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Pre-Deployment Checklist

### 1.1 UAT Completion

- [ ] All 12 UAT test scenarios executed and passed (see UAT_TEST_SCENARIOS.md)
- [ ] UAT sign-off obtained from all stakeholders
- [ ] All critical bugs fixed and re-tested
- [ ] User acceptance documentation signed
- [ ] Training completed for all user roles (7 roles)

### 1.2 Data Readiness

- [ ] Master data migration scripts tested and validated
- [ ] Product Spec Master (234 records) migrated
- [ ] Pipe Size Master (271 records) migrated
- [ ] Current inventory (36+ items) with heat numbers migrated
- [ ] Customer master data migrated
- [ ] Vendor master data migrated
- [ ] User accounts created for all users (minimum 10 users)
- [ ] Document sequences configured for Indian FY (Apr-Mar)
- [ ] Email templates customized with company branding

### 1.3 Documentation

- [ ] User Training Manual reviewed (USER_TRAINING_MANUAL.md)
- [ ] API documentation prepared (if needed for integrations)
- [ ] System architecture diagram finalized
- [ ] Database schema documented
- [ ] Admin manual prepared
- [ ] Backup and recovery procedures documented

### 1.4 Technical Readiness

- [ ] Code review completed
- [ ] Security audit completed
- [ ] Performance testing completed (50+ concurrent users)
- [ ] Load testing completed
- [ ] SSL/TLS certificates procured
- [ ] Domain name configured (e.g., erp.nps.com)
- [ ] Email server configured (SMTP)
- [ ] Backup infrastructure ready

---

## 2. Infrastructure Requirements

### 2.1 Recommended Server Specifications

**Production Server:**
- **CPU:** 8 cores (Intel Xeon or AMD EPYC)
- **RAM:** 32 GB minimum (64 GB recommended for 50+ users)
- **Storage:** 500 GB SSD (NVMe preferred for database)
- **OS:** Ubuntu 22.04 LTS or Windows Server 2022
- **Network:** 1 Gbps network interface
- **Uptime:** 99.9% SLA

**Database Server (if separate):**
- **CPU:** 8 cores
- **RAM:** 32 GB minimum
- **Storage:** 1 TB SSD with RAID 10 for redundancy
- **OS:** Ubuntu 22.04 LTS or Windows Server 2022

**Backup Server:**
- **Storage:** 2 TB minimum (for 7+ years of data retention)
- **Backup Software:** Automated daily backups

### 2.2 Cloud Hosting Options

**Option 1: AWS (Amazon Web Services)**
- **Compute:** EC2 t3.xlarge (4 vCPU, 16 GB RAM) for app server
- **Database:** RDS for PostgreSQL (db.t3.xlarge)
- **Storage:** EBS SSD volumes
- **Backup:** AWS Backup or RDS automated backups
- **CDN:** CloudFront for static assets
- **Monitoring:** CloudWatch
- **Estimated Cost:** $400-600/month

**Option 2: DigitalOcean**
- **Droplet:** Premium Intel 16 GB / 4 vCPUs
- **Database:** Managed PostgreSQL (4 GB RAM)
- **Storage:** Block Storage volumes
- **Backup:** Automated daily backups
- **CDN:** DigitalOcean Spaces + CDN
- **Estimated Cost:** $150-250/month

**Option 3: Azure**
- **Compute:** Standard B4ms (4 vCPUs, 16 GB RAM)
- **Database:** Azure Database for PostgreSQL (4 vCores)
- **Storage:** Premium SSD
- **Backup:** Azure Backup
- **CDN:** Azure CDN
- **Estimated Cost:** $400-600/month

**Option 4: On-Premise Server**
- Suitable for companies with existing IT infrastructure
- Requires dedicated IT staff for maintenance
- One-time hardware cost: ₹5-8 lakhs
- Annual maintenance: ₹50,000-1,00,000

### 2.3 Network Requirements

- **Bandwidth:** Minimum 50 Mbps dedicated internet
- **Static IP Address:** Required for domain mapping
- **Firewall:** Hardware or software firewall
- **VPN:** Optional for remote access
- **Ports to Open:**
  - 443 (HTTPS) - Public
  - 5432 (PostgreSQL) - Internal only
  - 22 (SSH) - Restricted to admin IPs

---

## 3. Environment Setup

### 3.1 Operating System Configuration

**For Ubuntu 22.04 LTS:**

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential build tools
sudo apt install -y build-essential curl git

# Install Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show v10.x.x

# Install PM2 (Process Manager)
sudo npm install -g pm2

# Install PostgreSQL 16
sudo apt install -y postgresql-16 postgresql-contrib-16

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Install Nginx (Reverse Proxy)
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

**For Windows Server 2022:**

1. Download and install Node.js 20.x LTS from https://nodejs.org
2. Download and install PostgreSQL 16 from https://www.postgresql.org/download/windows/
3. Install IIS (Internet Information Services) or Nginx for Windows
4. Install PM2 globally: `npm install -g pm2-windows-service`

### 3.2 Database Setup

**Create Production Database:**

```sql
-- Connect to PostgreSQL as superuser
sudo -u postgres psql

-- Create production database
CREATE DATABASE nps_erp_prod;

-- Create application database user
CREATE USER erp_app_user WITH ENCRYPTED PASSWORD 'YOUR_SECURE_PASSWORD_HERE';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE nps_erp_prod TO erp_app_user;

-- Connect to the database
\c nps_erp_prod

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO erp_app_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO erp_app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO erp_app_user;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Exit
\q
```

**Configure PostgreSQL for Remote Access (if needed):**

```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/16/main/postgresql.conf

# Change listen_addresses
listen_addresses = 'localhost'  # For single-server setup
# OR
listen_addresses = '*'  # For separate DB server (use with caution)

# Edit pg_hba.conf for authentication
sudo nano /etc/postgresql/16/main/pg_hba.conf

# Add this line (adjust IP range as needed)
host  nps_erp_prod  erp_app_user  10.0.0.0/24  scram-sha-256

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### 3.3 Environment Variables

Create production `.env` file:

```bash
# Navigate to application directory
cd /var/www/nps-erp

# Create .env file
nano .env
```

**Production Environment Variables:**

```env
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://erp.nps.com
PORT=3000

# Database (Prisma v7 - connection URL goes in prisma.config.ts)
DATABASE_URL=postgresql://erp_app_user:YOUR_SECURE_PASSWORD@localhost:5432/nps_erp_prod?schema=public
SHADOW_DATABASE_URL=postgresql://erp_app_user:YOUR_SECURE_PASSWORD@localhost:5432/nps_erp_shadow?schema=public

# Database Connection Pool
DB_POOL_MIN=10
DB_POOL_MAX=50
DB_CONNECTION_TIMEOUT=30000
DB_IDLE_TIMEOUT=10000

# NextAuth.js
NEXTAUTH_URL=https://erp.nps.com
NEXTAUTH_SECRET=YOUR_LONG_RANDOM_SECRET_KEY_HERE_MINIMUM_32_CHARS

# Session
SESSION_TIMEOUT=28800  # 8 hours in seconds
SESSION_MAX_AGE=86400  # 24 hours in seconds

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=erp@nps.com
SMTP_PASSWORD=YOUR_EMAIL_PASSWORD
SMTP_FROM=nps-erp@nps.com
SMTP_FROM_NAME=NPS ERP System

# File Upload
MAX_FILE_SIZE=10485760  # 10 MB in bytes
UPLOAD_DIR=/var/www/nps-erp/uploads
ALLOWED_FILE_TYPES=.pdf,.jpg,.jpeg,.png,.xlsx,.xls

# Logging
LOG_LEVEL=info
LOG_FILE=/var/www/nps-erp/logs/app.log
LOG_MAX_SIZE=10m
LOG_MAX_FILES=30

# Security
BCRYPT_ROUNDS=12
JWT_EXPIRY=24h
RATE_LIMIT_WINDOW=900000  # 15 minutes in ms
RATE_LIMIT_MAX_REQUESTS=100

# Backup
BACKUP_DIR=/var/backups/nps-erp
BACKUP_RETENTION_DAYS=90

# Feature Flags (optional)
ENABLE_E_INVOICE=true
ENABLE_GST_PORTAL_INTEGRATION=false
ENABLE_ANALYTICS=true
```

**IMPORTANT SECURITY NOTES:**
- Replace all `YOUR_*` placeholders with actual secure values
- Generate `NEXTAUTH_SECRET` using: `openssl rand -base64 32`
- Use strong database password (min 16 characters, mixed case, numbers, special chars)
- Never commit `.env` file to version control
- Set file permissions: `chmod 600 .env`

---

## 4. Database Setup & Migration

### 4.1 Deploy Application Code

```bash
# Create application directory
sudo mkdir -p /var/www/nps-erp
sudo chown -R $USER:$USER /var/www/nps-erp

# Clone repository (or upload code)
cd /var/www/nps-erp
git clone <repository-url> .

# OR upload via SCP/FTP
# scp -r /local/path/erp/* user@server:/var/www/nps-erp/

# Install dependencies
npm ci --production

# Copy environment file
cp .env.example .env
nano .env  # Edit with production values
```

### 4.2 Run Database Migrations

```bash
# Install Prisma CLI (if not in dependencies)
npm install -g prisma

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Verify migration
npx prisma migrate status

# Expected output: "Database schema is up to date!"
```

### 4.3 Seed Master Data

```bash
# Run seed script to populate master data
npx prisma db seed

# Verify seeded data
npx prisma studio  # Opens Prisma Studio on localhost:5555
# OR use psql to verify
psql -U erp_app_user -d nps_erp_prod -c "SELECT COUNT(*) FROM \"ProductSpec\";"
# Should show 234 records
```

**Seed Script Verification Checklist:**
- [ ] 234 Product Specifications seeded
- [ ] 271 Pipe Sizes seeded (CS/AS + SS/DS)
- [ ] 36 Inventory items seeded with heat numbers
- [ ] 11 Test types seeded
- [ ] 13 Document sequences initialized (FY 2026-27)
- [ ] Admin user created (admin@erp.com)
- [ ] Sample customers and vendors seeded (if applicable)

### 4.4 Data Migration from Excel

If migrating existing data from Excel files:

```bash
# Create migration scripts directory
mkdir -p /var/www/nps-erp/scripts/migration

# Run customer migration
node scripts/migration/migrate-customers.js

# Run vendor migration
node scripts/migration/migrate-vendors.js

# Run inventory migration
node scripts/migration/migrate-inventory.js

# Validation report
node scripts/migration/validate-migration.js > migration-report.txt

# Review report for any errors
cat migration-report.txt
```

**Migration Validation:**
- Verify 100% data accuracy (PRD requirement)
- Check for duplicate entries
- Validate foreign key relationships
- Verify heat numbers imported correctly
- Check MTC date conversions (Excel serial to Date)
- Validate GST numbers format
- Review migration report for warnings/errors

---

## 5. Application Deployment

### 5.1 Build Production Application

```bash
# Navigate to application directory
cd /var/www/nps-erp

# Build Next.js application
npm run build

# Test build locally
npm run start

# Verify application runs on http://localhost:3000
# Press Ctrl+C to stop
```

### 5.2 Deploy with PM2 (Recommended)

**Create PM2 Ecosystem File:**

```bash
# Create ecosystem.config.js
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'nps-erp',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/nps-erp',
    instances: 4,  // Number of instances (or 'max' for all CPU cores)
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/www/nps-erp/logs/pm2-error.log',
    out_file: '/var/www/nps-erp/logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '2G',
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

**Start Application with PM2:**

```bash
# Create logs directory
mkdir -p /var/www/nps-erp/logs

# Start application
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs nps-erp

# Monitor
pm2 monit

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup systemd
# Follow the instructions printed by the command

# Verify startup configuration
sudo systemctl status pm2-$USER
```

### 5.3 Configure Nginx Reverse Proxy

**Create Nginx Configuration:**

```bash
sudo nano /etc/nginx/sites-available/nps-erp
```

```nginx
# Upstream to PM2 cluster
upstream nps_erp_backend {
    least_conn;
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
    keepalive 64;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name erp.nps.com;

    # Let's Encrypt verification
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name erp.nps.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/erp.nps.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/erp.nps.com/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/erp.nps.com/chain.pem;

    # SSL Settings (Mozilla Intermediate Configuration)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # Logging
    access_log /var/log/nginx/nps-erp-access.log;
    error_log /var/log/nginx/nps-erp-error.log;

    # Max Upload Size (for MTC PDFs)
    client_max_body_size 20M;

    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    # Proxy to Next.js
    location / {
        proxy_pass http://nps_erp_backend;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
    }

    # Static files caching
    location /_next/static/ {
        proxy_pass http://nps_erp_backend;
        proxy_cache_valid 200 60m;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Uploaded files (MTCs, attachments)
    location /uploads/ {
        alias /var/www/nps-erp/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
}
```

**Enable Configuration and Restart Nginx:**

```bash
# Test configuration
sudo nginx -t

# Enable site
sudo ln -s /etc/nginx/sites-available/nps-erp /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Restart Nginx
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx
```

### 5.4 SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d erp.nps.com

# Follow prompts and select redirect HTTP to HTTPS

# Test auto-renewal
sudo certbot renew --dry-run

# Certificate auto-renews via cron job
sudo systemctl status certbot.timer
```

---

## 6. Security Configuration

### 6.1 Firewall Configuration (UFW)

```bash
# Enable UFW
sudo ufw enable

# Allow SSH (change 22 to your SSH port if different)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Block PostgreSQL from public (allow only localhost)
sudo ufw deny 5432/tcp

# Check status
sudo ufw status verbose
```

### 6.2 Database Security

```sql
-- Connect to PostgreSQL
sudo -u postgres psql

-- Change postgres superuser password
ALTER USER postgres WITH PASSWORD 'STRONG_SUPERUSER_PASSWORD';

-- Restrict erp_app_user to only necessary privileges
REVOKE ALL ON SCHEMA public FROM public;
GRANT USAGE ON SCHEMA public TO erp_app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO erp_app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO erp_app_user;

-- Do NOT grant CREATE, DROP, or ALTER privileges to application user

-- Exit
\q
```

**PostgreSQL Configuration Hardening:**

```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/16/main/postgresql.conf

# Set secure parameters
ssl = on
password_encryption = scram-sha-256
log_connections = on
log_disconnections = on
log_duration = on
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '

# Edit pg_hba.conf
sudo nano /etc/postgresql/16/main/pg_hba.conf

# Ensure only scram-sha-256 authentication
local   all             all                                     scram-sha-256
host    all             all             127.0.0.1/32            scram-sha-256
host    all             all             ::1/128                 scram-sha-256

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### 6.3 Application Security Hardening

**Set Proper File Permissions:**

```bash
# Application directory
sudo chown -R www-data:www-data /var/www/nps-erp

# Environment file (sensitive)
chmod 600 /var/www/nps-erp/.env

# Uploads directory (writable by app)
chmod 750 /var/www/nps-erp/uploads
chown -R www-data:www-data /var/www/nps-erp/uploads

# Logs directory
chmod 750 /var/www/nps-erp/logs
chown -R www-data:www-data /var/www/nps-erp/logs

# Remove write permissions from code
chmod -R 550 /var/www/nps-erp/src
chmod -R 550 /var/www/nps-erp/node_modules
```

**Rate Limiting (Nginx):**

Add to Nginx configuration:

```nginx
# Rate limiting configuration
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;

# In server block, add:
location /api/auth/ {
    limit_req zone=login_limit burst=5 nodelay;
    proxy_pass http://nps_erp_backend;
}

location /api/ {
    limit_req zone=api_limit burst=20 nodelay;
    proxy_pass http://nps_erp_backend;
}
```

### 6.4 Enable Audit Logging

Ensure audit logging is enabled in the application:

```javascript
// Verify in src/lib/audit.ts or middleware
// All create/update/delete operations should log:
// - User ID
// - Timestamp
// - Action (CREATE/UPDATE/DELETE)
// - Module
// - Old and new values
// - IP address
```

### 6.5 Regular Security Updates

```bash
# Enable automatic security updates (Ubuntu)
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# Manual updates (run monthly)
sudo apt update
sudo apt upgrade -y
sudo apt autoremove -y

# Update Node.js dependencies (after testing)
cd /var/www/nps-erp
npm audit
npm audit fix

# Rebuild and restart
npm run build
pm2 restart nps-erp
```

---

## 7. Performance Optimization

### 7.1 Database Performance

**Create Indexes:**

```sql
-- Connect to database
psql -U erp_app_user -d nps_erp_prod

-- Quotation indexes
CREATE INDEX IF NOT EXISTS idx_quotation_customer ON "Quotation"("customerId");
CREATE INDEX IF NOT EXISTS idx_quotation_date ON "Quotation"("quotationDate" DESC);
CREATE INDEX IF NOT EXISTS idx_quotation_status ON "Quotation"("status");
CREATE INDEX IF NOT EXISTS idx_quotation_no ON "Quotation"("quotationNo");

-- Sales Order indexes
CREATE INDEX IF NOT EXISTS idx_so_customer ON "SalesOrder"("customerId");
CREATE INDEX IF NOT EXISTS idx_so_quotation ON "SalesOrder"("quotationId");
CREATE INDEX IF NOT EXISTS idx_so_status ON "SalesOrder"("status");

-- Purchase Order indexes
CREATE INDEX IF NOT EXISTS idx_po_vendor ON "PurchaseOrder"("vendorId");
CREATE INDEX IF NOT EXISTS idx_po_date ON "PurchaseOrder"("poDate" DESC);

-- Inventory indexes (critical for heat number search)
CREATE INDEX IF NOT EXISTS idx_inventory_heat ON "Inventory"("heatNo");
CREATE INDEX IF NOT EXISTS idx_inventory_status ON "Inventory"("status");
CREATE INDEX IF NOT EXISTS idx_inventory_mtc_date ON "Inventory"("mtcDate");

-- GRN indexes
CREATE INDEX IF NOT EXISTS idx_grn_po ON "GRN"("poId");
CREATE INDEX IF NOT EXISTS idx_grn_date ON "GRN"("receivedDate" DESC);

-- Inspection indexes
CREATE INDEX IF NOT EXISTS idx_inspection_grn ON "Inspection"("grnId");
CREATE INDEX IF NOT EXISTS idx_inspection_result ON "Inspection"("overallResult");

-- Audit Trail indexes (critical for search)
CREATE INDEX IF NOT EXISTS idx_audit_user ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS idx_audit_date ON "AuditLog"("timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_audit_module ON "AuditLog"("module");
CREATE INDEX IF NOT EXISTS idx_audit_document ON "AuditLog"("documentNo");

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_quotation_customer_date ON "Quotation"("customerId", "quotationDate" DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_product_status ON "Inventory"("productSpecId", "status");

-- Full-text search index for heat numbers (if needed)
CREATE INDEX IF NOT EXISTS idx_inventory_heat_trgm ON "Inventory" USING gin(("heatNo") gin_trgm_ops);
```

**PostgreSQL Performance Tuning:**

```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/16/main/postgresql.conf

# Memory settings (adjust based on server RAM)
shared_buffers = 8GB  # 25% of total RAM
effective_cache_size = 24GB  # 75% of total RAM
maintenance_work_mem = 2GB
work_mem = 50MB

# Connection settings
max_connections = 200
shared_preload_libraries = 'pg_stat_statements'

# Write performance
wal_buffers = 16MB
checkpoint_completion_target = 0.9
max_wal_size = 4GB

# Query planning
random_page_cost = 1.1  # For SSD
effective_io_concurrency = 200  # For SSD

# Logging
log_min_duration_statement = 1000  # Log slow queries (>1s)

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### 7.2 Application Performance

**Enable Next.js Caching:**

Ensure caching headers are set in `next.config.js`:

```javascript
// next.config.js
module.exports = {
  compress: true,
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
```

**Database Connection Pooling:**

Verify Prisma connection pool in `src/lib/prisma.ts`:

```typescript
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 50,  // Maximum connections
  min: 10,  // Minimum connections
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 30000,
});

const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });
```

### 7.3 Monitoring Performance

**Enable PostgreSQL Statistics:**

```sql
-- Enable pg_stat_statements extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slow queries
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

---

## 8. Backup & Disaster Recovery

### 8.1 Database Backup Strategy

**Daily Automated Backup Script:**

```bash
# Create backup script
sudo nano /usr/local/bin/backup-nps-erp.sh
```

```bash
#!/bin/bash
# NPS ERP Database Backup Script

# Configuration
DB_NAME="nps_erp_prod"
DB_USER="erp_app_user"
BACKUP_DIR="/var/backups/nps-erp"
RETENTION_DAYS=90
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/nps_erp_backup_$DATE.sql.gz"

# Create backup directory if not exists
mkdir -p $BACKUP_DIR

# Perform backup
echo "Starting backup at $(date)"
pg_dump -U $DB_USER -d $DB_NAME -F c | gzip > $BACKUP_FILE

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "Backup successful: $BACKUP_FILE"
    echo "Backup size: $(du -h $BACKUP_FILE | cut -f1)"
else
    echo "Backup failed!" >&2
    exit 1
fi

# Delete old backups
find $BACKUP_DIR -name "nps_erp_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "Deleted backups older than $RETENTION_DAYS days"

# Upload to cloud (optional - AWS S3 example)
# aws s3 cp $BACKUP_FILE s3://your-bucket/erp-backups/

echo "Backup completed at $(date)"
```

```bash
# Make script executable
sudo chmod +x /usr/local/bin/backup-nps-erp.sh

# Test backup script
sudo /usr/local/bin/backup-nps-erp.sh

# Add to crontab for daily execution at 2 AM
sudo crontab -e

# Add this line:
0 2 * * * /usr/local/bin/backup-nps-erp.sh >> /var/log/nps-erp-backup.log 2>&1
```

### 8.2 Application Files Backup

```bash
# Create app files backup script
sudo nano /usr/local/bin/backup-nps-erp-files.sh
```

```bash
#!/bin/bash
# NPS ERP Application Files Backup Script

BACKUP_DIR="/var/backups/nps-erp/files"
APP_DIR="/var/www/nps-erp"
DATE=$(date +%Y%m%d)
BACKUP_FILE="$BACKUP_DIR/nps_erp_files_$DATE.tar.gz"

mkdir -p $BACKUP_DIR

# Backup uploads and logs
tar -czf $BACKUP_FILE \
    $APP_DIR/uploads \
    $APP_DIR/logs \
    $APP_DIR/.env

echo "Application files backed up to $BACKUP_FILE"

# Delete old file backups (keep 30 days)
find $BACKUP_DIR -name "nps_erp_files_*.tar.gz" -mtime +30 -delete
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/backup-nps-erp-files.sh

# Add to weekly crontab (Sundays at 3 AM)
sudo crontab -e
0 3 * * 0 /usr/local/bin/backup-nps-erp-files.sh >> /var/log/nps-erp-files-backup.log 2>&1
```

### 8.3 Disaster Recovery Procedure

**Restore Database from Backup:**

```bash
# List available backups
ls -lh /var/backups/nps-erp/

# Restore from specific backup
gunzip -c /var/backups/nps-erp/nps_erp_backup_20260212_020000.sql.gz | \
  pg_restore -U erp_app_user -d nps_erp_prod --clean --if-exists

# OR create new database and restore
createdb -U postgres nps_erp_restored
gunzip -c /var/backups/nps-erp/nps_erp_backup_20260212_020000.sql.gz | \
  pg_restore -U erp_app_user -d nps_erp_restored
```

**Restore Application Files:**

```bash
# Stop application
pm2 stop nps-erp

# Restore files
tar -xzf /var/backups/nps-erp/files/nps_erp_files_20260212.tar.gz -C /

# Restart application
pm2 restart nps-erp
```

### 8.4 Off-site Backup (Cloud Storage)

**AWS S3 Backup:**

```bash
# Install AWS CLI
sudo apt install -y awscli

# Configure AWS credentials
aws configure

# Modify backup script to upload to S3
# Add to /usr/local/bin/backup-nps-erp.sh:
aws s3 cp $BACKUP_FILE s3://your-company-backups/nps-erp/$(basename $BACKUP_FILE)

# Set lifecycle policy on S3 bucket to archive to Glacier after 90 days
```

---

## 9. Monitoring & Logging

### 9.1 Application Monitoring

**PM2 Monitoring:**

```bash
# Real-time monitoring
pm2 monit

# View logs
pm2 logs nps-erp

# View specific log lines
pm2 logs nps-erp --lines 100

# Log errors only
pm2 logs nps-erp --err

# Save logs to file
pm2 logs nps-erp --out /var/log/nps-erp-app.log
```

**PM2 Plus (Optional - Advanced Monitoring):**

```bash
# Sign up at https://pm2.io
# Link PM2 to PM2 Plus
pm2 link YOUR_SECRET_KEY YOUR_PUBLIC_KEY

# Get real-time metrics, error tracking, and alerts
```

### 9.2 Database Monitoring

**Monitor Database Size:**

```sql
-- Database size query
SELECT
  pg_database.datname,
  pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
WHERE datname = 'nps_erp_prod';

-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;

-- Active connections
SELECT count(*) FROM pg_stat_activity WHERE datname = 'nps_erp_prod';
```

**Monitor Slow Queries:**

```sql
-- Install pg_stat_statements if not already
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Reset statistics
SELECT pg_stat_statements_reset();

-- After some time, check slow queries
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### 9.3 Log Management

**Centralized Logging:**

```bash
# Create log directory
sudo mkdir -p /var/log/nps-erp

# Configure log rotation
sudo nano /etc/logrotate.d/nps-erp
```

```
/var/log/nps-erp/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

**Error Monitoring (Sentry - Optional):**

```bash
# Install Sentry SDK
npm install @sentry/nextjs

# Configure in next.config.js
# See: https://docs.sentry.io/platforms/javascript/guides/nextjs/
```

### 9.4 Health Check Endpoint

Create API endpoint for health checks:

```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    // Check disk space (if needed)
    // Check external services (email, etc.)

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      uptime: process.uptime(),
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error.message,
    }, { status: 503 });
  }
}
```

**Monitor Health Endpoint:**

```bash
# Add to crontab for automated checks
*/5 * * * * curl -f https://erp.nps.com/api/health || echo "Health check failed" | mail -s "ERP Health Check Alert" admin@nps.com
```

---

## 10. Go-Live Checklist

### 10.1 Pre-Go-Live (1 week before)

- [ ] All UAT tests passed and signed off
- [ ] Production environment fully configured
- [ ] Database migrated and validated (100% accuracy)
- [ ] SSL certificate installed and verified
- [ ] Backup system tested and verified
- [ ] All user accounts created with correct roles
- [ ] Email notifications tested
- [ ] PDF generation tested (all three formats)
- [ ] Performance testing completed (50+ concurrent users)
- [ ] Security audit completed
- [ ] Training completed for all users
- [ ] User manuals distributed
- [ ] Support team trained
- [ ] Rollback plan prepared
- [ ] Go-live communication sent to all users

### 10.2 Go-Live Day

- [ ] **Morning: Data Freeze**
  - [ ] Stop all data entry in legacy system (Excel)
  - [ ] Take final backup of Excel files
  - [ ] Run final data migration
  - [ ] Validate migrated data (100% check)

- [ ] **Afternoon: System Activation**
  - [ ] Start production application
  - [ ] Verify all services running (app, database, nginx)
  - [ ] Test login for all user roles
  - [ ] Test critical workflows (enquiry, quotation, SO)
  - [ ] Generate test quotation and verify PDF
  - [ ] Send test email notification
  - [ ] Check heat number traceability

- [ ] **User Access**
  - [ ] Send go-live email with login credentials
  - [ ] Provide helpdesk number/email
  - [ ] Assign superusers for on-ground support

- [ ] **Monitoring**
  - [ ] Monitor application logs continuously
  - [ ] Monitor database connections
  - [ ] Monitor server resources (CPU, RAM, disk)
  - [ ] Track user login activity

### 10.3 First Week Support

- [ ] Daily morning system health check
- [ ] Review application logs for errors
- [ ] Monitor user feedback and issues
- [ ] Provide on-site/remote support (8 AM - 8 PM)
- [ ] Daily meeting with key users for feedback
- [ ] Document all issues and resolutions
- [ ] Daily backup verification
- [ ] Performance monitoring

---

## 11. Post-Deployment Tasks

### 11.1 Immediate (Week 1)

- [ ] Monitor system stability daily
- [ ] Collect user feedback
- [ ] Fix critical bugs immediately
- [ ] Provide user support (extended hours)
- [ ] Verify data accuracy
- [ ] Check audit trail logging
- [ ] Review system performance metrics

### 11.2 Short-term (Month 1)

- [ ] Address non-critical bugs
- [ ] Fine-tune performance based on usage
- [ ] Conduct refresher training if needed
- [ ] Review and optimize database queries
- [ ] Adjust backup retention policies
- [ ] Review security logs
- [ ] Collect feature enhancement requests

### 11.3 Long-term (Ongoing)

- [ ] Monthly security updates
- [ ] Quarterly performance reviews
- [ ] Annual security audit
- [ ] Backup restoration drill (every 6 months)
- [ ] User satisfaction surveys
- [ ] Plan for feature enhancements
- [ ] Review and update documentation

---

## 12. Rollback Procedures

### 12.1 When to Rollback

Rollback if any of the following occur within first 24 hours:
- Critical data loss or corruption
- System performance degradation (>10 seconds page load)
- Authentication/authorization failures affecting all users
- Data integrity issues (incorrect calculations, missing records)
- Complete system downtime exceeding 1 hour

### 12.2 Rollback Steps

```bash
# 1. Stop production application
pm2 stop nps-erp

# 2. Restore database from pre-go-live backup
# (Assumes backup taken just before go-live)
dropdb -U postgres nps_erp_prod
createdb -U postgres nps_erp_prod
gunzip -c /var/backups/nps-erp/pre-golive-backup.sql.gz | \
  pg_restore -U erp_app_user -d nps_erp_prod

# 3. Restore application files (if needed)
tar -xzf /var/backups/nps-erp/files/pre-golive-files.tar.gz -C /

# 4. Verify database and files
psql -U erp_app_user -d nps_erp_prod -c "SELECT COUNT(*) FROM \"Quotation\";"

# 5. Restart application in maintenance mode
# (Display message: "System under maintenance. Back soon.")

# 6. Communicate to users
# Send email notification about rollback
```

### 12.3 Post-Rollback Actions

- Analyze root cause of failure
- Fix critical issues in staging environment
- Conduct thorough testing
- Schedule new go-live date
- Communicate lessons learned to team

---

## 13. Troubleshooting

### 13.1 Application Won't Start

**Symptoms:** PM2 shows app in "errored" state

```bash
# Check logs
pm2 logs nps-erp --err --lines 50

# Common causes:
# 1. Database connection failure
#    - Verify DATABASE_URL in .env
#    - Check PostgreSQL is running: sudo systemctl status postgresql
#    - Test connection: psql -U erp_app_user -d nps_erp_prod

# 2. Missing environment variables
#    - Check .env file exists and has correct values
#    - Verify NEXTAUTH_SECRET is set

# 3. Port already in use
#    - Check port 3000: sudo lsof -i :3000
#    - Kill process: sudo kill -9 <PID>

# 4. Node modules issue
#    - Reinstall: rm -rf node_modules package-lock.json && npm install
#    - Rebuild: npm run build

# Restart app
pm2 restart nps-erp
```

### 13.2 Slow Performance

**Symptoms:** Pages loading >5 seconds

```bash
# Check server resources
htop  # or top

# Check database connections
psql -U erp_app_user -d nps_erp_prod -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
psql -U erp_app_user -d nps_erp_prod -c "
SELECT query, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
"

# Check PM2 memory usage
pm2 monit

# Solutions:
# 1. Add missing indexes (see Section 7.1)
# 2. Increase database connection pool
# 3. Scale to more PM2 instances
# 4. Add more RAM to server
```

### 13.3 Database Connection Errors

**Symptoms:** "Can't reach database server" errors

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# If stopped, start it
sudo systemctl start postgresql

# Check connections
psql -U erp_app_user -d nps_erp_prod -c "SELECT version();"

# Check max connections
psql -U postgres -c "SHOW max_connections;"

# Check current connections
psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# If at max, increase in postgresql.conf
sudo nano /etc/postgresql/16/main/postgresql.conf
# Set: max_connections = 300
sudo systemctl restart postgresql
```

### 13.4 PDF Generation Fails

**Symptoms:** Quotation PDF download errors

```bash
# Check logs for errors
pm2 logs nps-erp | grep -i "pdf"

# Common causes:
# 1. @react-pdf/renderer issue
#    - Check version: npm list @react-pdf/renderer
#    - Reinstall: npm install @react-pdf/renderer

# 2. Font missing (for custom fonts)
#    - Verify font files in /public/fonts/

# 3. Memory issue (large PDFs)
#    - Increase Node.js memory: NODE_OPTIONS=--max-old-space-size=4096
#    - Edit ecosystem.config.js and add to env

# 4. Timeout
#    - Increase Nginx proxy timeout (see Section 5.3)
```

### 13.5 Email Notifications Not Sending

**Symptoms:** Users not receiving quotation emails

```bash
# Check SMTP configuration in .env
cat /var/www/nps-erp/.env | grep SMTP

# Test SMTP connection manually
telnet smtp.gmail.com 587

# Check application logs for email errors
pm2 logs nps-erp | grep -i "email\|smtp"

# Common causes:
# 1. Incorrect SMTP credentials
# 2. Gmail "Less secure apps" setting (if using Gmail)
#    - Enable 2FA and use App Password instead
# 3. Firewall blocking port 587
#    - Check: sudo ufw status
#    - Allow: sudo ufw allow out 587/tcp
# 4. Email rate limiting
#    - Check SMTP provider limits
```

### 13.6 User Cannot Login

**Symptoms:** "Invalid credentials" error for valid users

```bash
# Check user exists in database
psql -U erp_app_user -d nps_erp_prod -c "SELECT id, email, role FROM \"User\" WHERE email = 'user@example.com';"

# Check user is active
psql -U erp_app_user -d nps_erp_prod -c "SELECT isActive FROM \"User\" WHERE email = 'user@example.com';"

# Reset user password (if needed)
# Use admin panel or run script to hash new password and update

# Check NEXTAUTH_URL is correct
cat /var/www/nps-erp/.env | grep NEXTAUTH_URL

# Check session secret
cat /var/www/nps-erp/.env | grep NEXTAUTH_SECRET

# Clear browser cookies and try again
```

---

## Support Contacts

**Technical Support:**
- Email: support@nps.com
- Phone: +91-217-2345678 Ext. 50
- Hours: Mon-Sat, 9 AM - 6 PM IST

**Emergency Hotline (Critical Issues):**
- Phone: +91-9876543210 (24/7)
- Email: critical@nps.com

**Deployment Team:**
- Lead Developer: [Name], [Email], [Phone]
- Database Admin: [Name], [Email], [Phone]
- System Admin: [Name], [Email], [Phone]

---

**Document Version:** 1.0
**Last Updated:** February 12, 2026
**Maintained by:** NPS ERP Technical Team

---

**End of Production Deployment Guide**
