# Auto-Seed on Deployment - Documentation

**Feature:** Automatic Database Seeding on Render Deployment
**No Shell Access Required:** ✅
**Status:** Fully Implemented

---

## Overview

The NPS ERP System now automatically seeds essential data during deployment on Render, eliminating the need for manual shell access or post-deployment setup.

### What Gets Seeded Automatically

1. ✅ **Admin User** - Default credentials for immediate access
2. ✅ **Document Sequences** - All 13 document types (Enquiry, Quotation, SO, PO, etc.)
3. ✅ **Idempotent** - Safe to run multiple times without errors

---

## How It Works

### Deployment Flow

```
Render Deployment Starts
         ↓
1. Clone Repository
         ↓
2. Install Dependencies (npm ci)
         ↓
3. Generate Prisma Client
         ↓
4. Run Database Migrations
         ↓
5. 🌱 AUTO-SEED DATABASE ← NEW!
   - Create admin user
   - Create document sequences
   - Log results
         ↓
6. Build Next.js Application
         ↓
7. Start Production Server
         ↓
✅ Application Ready!
```

### Build Command (in render.yaml)

```bash
npm ci &&
npx prisma generate &&
npx prisma migrate deploy &&
npx ts-node --compiler-options '{"module":"commonjs"}' prisma/seed-production.ts &&
npm run build
```

---

## Files Created

### 1. Production Seed Script
**File:** `prisma/seed-production.ts`

**Features:**
- ✅ Creates admin user if not exists
- ✅ Creates 13 document sequences
- ✅ Idempotent (safe to re-run)
- ✅ Configurable admin password via env var
- ✅ Clear console output
- ✅ Error handling

**Code Highlights:**
```typescript
// Check if admin exists before creating
const existingAdmin = await prisma.user.findUnique({
  where: { email: adminEmail },
});

if (!existingAdmin) {
  // Create new admin
  await prisma.user.create({...});
  console.log('✅ Admin user created');
} else {
  console.log('ℹ️  Admin user already exists');
}
```

### 2. Updated render.yaml
**Changes:**
- Added seed script to buildCommand
- Added ADMIN_PASSWORD environment variable
- Seed runs after migrations, before build

### 3. Package.json Script
**New Script:**
```json
{
  "scripts": {
    "seed:prod": "ts-node --compiler-options {\"module\":\"commonjs\"} prisma/seed-production.ts"
  }
}
```

---

## Configuration

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `ADMIN_PASSWORD` | `Admin@123` | Admin user password |

**Security Best Practice:**
```yaml
# In render.yaml or Render Dashboard
- key: ADMIN_PASSWORD
  value: YourSecurePassword123!
```

### Default Credentials

**After Deployment:**
```
Email: admin@erp.com
Password: Admin@123 (or custom if ADMIN_PASSWORD set)
```

**⚠️ CRITICAL:** Change password immediately after first login!

---

## What Gets Created

### 1. Admin User

```typescript
{
  name: 'System Administrator',
  email: 'admin@erp.com',
  passwordHash: '...bcrypt hash...',
  role: 'ADMIN',
  isActive: true
}
```

### 2. Document Sequences (13 types)

| Document Type | Prefix | Starting # | Financial Year |
|---------------|--------|------------|----------------|
| ENQUIRY | ENQ | 0 | 25 (FY 2025-26) |
| QUOTATION | QT | 0 | 25 |
| SALES_ORDER | SO | 0 | 25 |
| PURCHASE_REQUISITION | PR | 0 | 25 |
| PURCHASE_ORDER | PO | 0 | 25 |
| GOODS_RECEIPT_NOTE | GRN | 0 | 25 |
| INSPECTION | INS | 0 | 25 |
| NCR | NCR | 0 | 25 |
| PACKING_LIST | PL | 0 | 25 |
| DISPATCH_NOTE | DN | 0 | 25 |
| INVOICE | INV | 0 | 25 |
| PAYMENT_RECEIPT | PR | 0 | 25 |
| LAB_LETTER | LL | 0 | 25 |

**Example Document Numbers:**
- First enquiry: `ENQ/25/00001`
- First quotation: `QT/25/00001`
- First sales order: `SO/25/00001`

---

## Deployment Output

### Expected Console Output

```
🌱 Starting production seed...

✅ Admin user created: admin@erp.com
⚠️  WARNING: Using default password. Set ADMIN_PASSWORD env var for security.

✅ Document sequences: 13 created, 0 existing

✅ Production seed completed successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Admin Email: admin@erp.com
🔑 Admin Password: Admin@123 (default)
📋 Document Sequences: 13
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  IMPORTANT: Change admin password after first login!

🚀 Application ready for use!

✅ Seed script completed
```

### On Subsequent Deployments

```
🌱 Starting production seed...

ℹ️  Admin user already exists: admin@erp.com
✅ Document sequences: 0 created, 13 existing

✅ Production seed completed successfully!
```

---

## Testing Locally

### Test Seed Script

```bash
# Run production seed locally
npm run seed:prod

# Or with custom password
ADMIN_PASSWORD="MySecure123!" npm run seed:prod
```

### Verify Seeded Data

```bash
# Open Prisma Studio
npx prisma studio

# Check tables:
# - User (should have admin@erp.com)
# - DocumentSequence (should have 13 records)
```

---

## Idempotency Explained

**Idempotent** = Safe to run multiple times

### How It's Achieved

1. **Admin User:**
   ```typescript
   // Check existence first
   const existing = await prisma.user.findUnique({
     where: { email: adminEmail }
   });

   if (!existing) {
     // Only create if doesn't exist
     await prisma.user.create({...});
   }
   ```

2. **Document Sequences:**
   ```typescript
   // Check each sequence
   for (const seq of sequences) {
     const existing = await prisma.documentSequence.findUnique({
       where: { documentType: seq.documentType }
     });

     if (!existing) {
       // Only create if doesn't exist
       await prisma.documentSequence.create({...});
     }
   }
   ```

### Why This Matters

- ✅ Re-deploying won't fail due to duplicate data
- ✅ Re-running seed won't reset counters
- ✅ Safe for continuous deployment
- ✅ No manual cleanup needed

---

## Security Considerations

### 1. Custom Admin Password

**Recommended for Production:**

```yaml
# In render.yaml
envVars:
  - key: ADMIN_PASSWORD
    value: "YourVerySecurePassword123!"
```

**Or in Render Dashboard:**
- Go to service settings
- Environment variables
- Edit `ADMIN_PASSWORD`
- Set secure password
- Deploy

### 2. Post-Deployment

After first deployment:
1. ✅ Login with admin credentials
2. ✅ Go to Settings → Profile
3. ✅ Change password immediately
4. ✅ Create additional admin users if needed
5. ✅ Consider disabling default admin

### 3. Password Requirements

The system enforces password policy:
- ✅ Minimum 8 characters
- ✅ At least 1 uppercase letter
- ✅ At least 1 lowercase letter
- ✅ At least 1 number
- ✅ At least 1 special character

**Recommended:** Use a password manager to generate strong passwords.

---

## Troubleshooting

### Seed Fails During Build

**Symptom:** Build fails with "Seed script failed"

**Check:**
1. Database connection
   - Verify DATABASE_URL is set
   - Check database is running (green status)

2. View build logs
   - Look for specific error message
   - Check Prisma connection errors

**Common Issues:**

**Error: "Cannot connect to database"**
```
Solution: Database not ready yet
Fix: Render handles this automatically, retry deploy
```

**Error: "Unique constraint violation"**
```
Solution: Admin user already exists (this is OK!)
Fix: Seed handles this gracefully, check logs
```

### Admin Login Fails

**Symptom:** "Invalid credentials" error

**Check:**
1. **Email:** Must be exactly `admin@erp.com`
2. **Password:** Check ADMIN_PASSWORD env var
3. **Default:** `Admin@123` if not set

**Debug:**
```bash
# Check Render logs for seed output
# Look for: "Admin user created" or "Admin user already exists"
```

### Document Numbers Start at 00001 Instead of Custom

**This is expected behavior:**
- Sequences start at 0 (currentNumber)
- First document gets number 1
- Format: PREFIX/FY/00001

**To change starting number:**
- Update in database after first deploy
- Or modify seed script before deployment

---

## Advanced Configuration

### Customize Seeded Data

Edit `prisma/seed-production.ts`:

```typescript
// Change admin email
const adminEmail = 'admin@yourcompany.com';

// Change financial year
const financialYear = '26'; // For FY 2026-27

// Add more sequences
sequences.push({
  documentType: 'CUSTOM_DOC',
  prefix: 'CD',
  financialYear: '25',
});
```

### Add Additional Users

```typescript
// In seed-production.ts, add after admin:
const users = [
  { name: 'Sales Manager', email: 'sales@erp.com', role: 'SALES' },
  { name: 'Purchase Manager', email: 'purchase@erp.com', role: 'PURCHASE' },
];

for (const user of users) {
  const existing = await prisma.user.findUnique({
    where: { email: user.email }
  });

  if (!existing) {
    await prisma.user.create({
      data: {
        ...user,
        passwordHash: await hash('Welcome@123', 10),
        isActive: true,
      },
    });
  }
}
```

### Seed Master Data

For large datasets (customers, products), consider:

**Option 1: Separate seed scripts**
```bash
# Create prisma/seed-masters.ts
# Add to buildCommand after seed-production
```

**Option 2: Post-deployment import**
```bash
# Create API endpoints for import
# Upload Excel files via UI
# Run migration scripts via API
```

---

## Comparison: Before vs After

### Before (Manual Seeding)

```
❌ Deploy on Render
❌ Wait for build
❌ Request shell access (not available on free/starter)
❌ OR use workarounds
❌ Manually run seed commands
❌ Verify data created
❌ High chance of errors
```

### After (Auto-Seeding)

```
✅ Deploy on Render
✅ Automatic seeding during build
✅ No shell access needed
✅ No manual commands
✅ Data ready immediately
✅ Consistent results
✅ Zero manual effort
```

---

## Monitoring

### Build Logs

Watch for seed output in Render build logs:

**Success Indicators:**
- ✅ "Starting production seed..."
- ✅ "Admin user created" or "already exists"
- ✅ "Document sequences: X created"
- ✅ "Production seed completed successfully"
- ✅ "Seed script completed"

**Failure Indicators:**
- ❌ "Production seed failed"
- ❌ "Seed script failed"
- ❌ Database connection errors

### Health Check

After deployment:
```bash
# Check health endpoint
curl https://your-app.onrender.com/api/health

# Should return:
{
  "status": "healthy",
  "database": "connected"
}
```

### Verify Login

```bash
# Try logging in
URL: https://your-app.onrender.com/login
Email: admin@erp.com
Password: Admin@123 (or custom)
```

---

## Best Practices

### 1. Use Custom Admin Password
```yaml
ADMIN_PASSWORD: "YourSecurePassword123!"
```

### 2. Change Password After First Login
- Don't rely on default password
- Set a strong, unique password
- Use password manager

### 3. Create Additional Admins
- Don't use single admin account
- Create named accounts for each admin
- Enable audit trail

### 4. Document Your Password
- Store in password manager
- Share securely with team
- Don't commit to git

### 5. Test Locally First
```bash
npm run seed:prod
```

---

## FAQ

**Q: What happens if I deploy twice?**
A: Seed is idempotent - it checks for existing data and only creates if missing. No errors, no duplicates.

**Q: Can I change the admin email?**
A: Yes, edit `prisma/seed-production.ts` before deployment. Or create additional admins after deployment.

**Q: What if I forget the admin password?**
A: Reset via database or redeploy with new ADMIN_PASSWORD. Consider password reset feature in future.

**Q: Can I add more users in seed?**
A: Yes, edit seed script to add more users. See "Advanced Configuration" section.

**Q: Does this work with free tier?**
A: Yes! That's the whole point - no shell access needed.

**Q: How do I import customers/products?**
A: Use migration scripts via API endpoints or create separate seed scripts.

**Q: Can I disable auto-seed?**
A: Yes, remove seed command from render.yaml buildCommand. Not recommended for first deploy.

---

## Summary

### ✅ Benefits

- No shell access required
- Automatic setup on every deploy
- Idempotent and safe
- Configurable via environment variables
- Clear logging and error handling
- Production-ready from deployment

### 🎯 Result

**Deploy once, everything works immediately:**
- Admin user ready
- Document sequences configured
- Login and start using the system
- Zero manual configuration

---

**Feature Status:** ✅ Production Ready
**Shell Access Required:** ❌ No
**Manual Steps Required:** ❌ No
**Deployment Time:** Same as before (~10 min)
**Setup Time Saved:** 15-30 minutes

---

**Documentation Version:** 1.0
**Last Updated:** February 12, 2026
**Status:** Complete and Tested

---

**End of Auto-Seed Documentation**
