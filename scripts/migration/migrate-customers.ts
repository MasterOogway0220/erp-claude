/**
 * Customer Data Migration Script
 * Migrates customer data from Excel to PostgreSQL database
 *
 * Usage: npx ts-node scripts/migration/migrate-customers.ts <excel-file-path>
 */

import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CustomerRow {
  'Customer Code': string;
  'Customer Name': string;
  'Contact Person': string;
  'Address': string;
  'City': string;
  'State': string;
  'Pincode': string;
  'Phone': string;
  'Email': string;
  'GST Number': string;
  'PAN Number': string;
  'Credit Limit': string | number;
  'Payment Terms': string;
  'Type': string; // Domestic / Export
}

/**
 * Read and parse Excel file
 */
function readExcelFile(filePath: string): CustomerRow[] {
  console.log(`Reading Excel file: ${filePath}`);

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const data: CustomerRow[] = XLSX.utils.sheet_to_json(worksheet, {
    defval: '',
    raw: false, // Get formatted values
  });

  console.log(`Found ${data.length} rows in Excel`);
  return data;
}

/**
 * Clean and normalize data
 */
function cleanData(row: CustomerRow): any {
  // Clean header names (remove trailing spaces and line breaks)
  const cleanRow: any = {};
  for (const key in row) {
    const cleanKey = key.trim().replace(/\r\n/g, ' ');
    cleanRow[cleanKey] = row[key as keyof CustomerRow];
  }

  // Trim all string values
  for (const key in cleanRow) {
    if (typeof cleanRow[key] === 'string') {
      cleanRow[key] = cleanRow[key].trim();
    }
  }

  return {
    name: cleanRow['Customer Name'],
    contactPerson: cleanRow['Contact Person'] || null,
    addressLine1: cleanRow['Address'] || null,
    city: cleanRow['City'] || null,
    state: cleanRow['State'] || null,
    pincode: cleanRow['Pincode'] || null,
    phone: cleanRow['Phone'] || null,
    email: cleanRow['Email'] ? cleanRow['Email'].toLowerCase() : null,
    gstNo: cleanRow['GST Number'] || null,
    paymentTerms: cleanRow['Payment Terms'] || 'Standard',
  };
}

/**
 * Generate customer code if missing
 */
function generateCustomerCode(customerName: string): string {
  const prefix = customerName
    .split(' ')
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase();

  const timestamp = Date.now().toString().slice(-6);
  return `CUST-${prefix}-${timestamp}`;
}

/**
 * Validate customer data
 */
function validateCustomer(customer: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!customer.name || customer.name.length < 3) {
    errors.push('Customer name is required (min 3 characters)');
  }

  if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
    errors.push(`Invalid email format: ${customer.email}`);
  }

  if (customer.gstNo && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(customer.gstNo)) {
    errors.push(`Invalid GST number format: ${customer.gstNo}`);
  }

  if (customer.panNo && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(customer.panNo)) {
    errors.push(`Invalid PAN number format: ${customer.panNo}`);
  }

  if (customer.phone && !/^[6-9]\d{9}$/.test(customer.phone.replace(/[^0-9]/g, ''))) {
    errors.push(`Invalid phone number format: ${customer.phone}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Migrate customers to database
 */
async function migrateCustomers(filePath: string) {
  console.log('=== Customer Data Migration Started ===\n');

  try {
    // Read Excel
    const rows = readExcelFile(filePath);

    const results = {
      total: rows.length,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as Array<{ row: number; name: string; errors: string[] }>,
    };

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2; // Excel row number (header is row 1)
      const row = rows[i];

      console.log(`\nProcessing row ${rowNum}: ${row['Customer Name']}`);

      try {
        // Clean data
        const customer = cleanData(row);

        // Validate
        const validation = validateCustomer(customer);
        if (!validation.isValid) {
          console.error(`  ❌ Validation failed:`, validation.errors);
          results.failed++;
          results.errors.push({
            row: rowNum,
            name: customer.name,
            errors: validation.errors,
          });
          continue;
        }

        // Check if customer already exists (by name)
        const existing = await prisma.customerMaster.findFirst({
          where: {
            name: customer.name,
          },
        });

        if (existing) {
          console.log(`  ⚠️  Customer already exists. Skipping.`);
          results.skipped++;
          continue;
        }

        // Create customer
        await prisma.customerMaster.create({
          data: customer,
        });

        console.log(`  ✅ Customer created successfully`);
        results.success++;
      } catch (error: any) {
        console.error(`  ❌ Error:`, error.message);
        results.failed++;
        results.errors.push({
          row: rowNum,
          name: row['Customer Name'],
          errors: [error.message],
        });
      }
    }

    // Print summary
    console.log('\n=== Migration Summary ===');
    console.log(`Total rows: ${results.total}`);
    console.log(`✅ Success: ${results.success}`);
    console.log(`⚠️  Skipped (duplicates): ${results.skipped}`);
    console.log(`❌ Failed: ${results.failed}`);

    if (results.errors.length > 0) {
      console.log('\n=== Errors ===');
      results.errors.forEach(err => {
        console.log(`\nRow ${err.row}: ${err.name}`);
        err.errors.forEach(e => console.log(`  - ${e}`));
      });
    }

    // Generate validation report
    await generateValidationReport(results);

    console.log('\n=== Migration Complete ===');
  } catch (error: any) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Generate validation report
 */
async function generateValidationReport(results: any) {
  const fs = require('fs').promises;
  const path = require('path');

  const reportPath = path.join(process.cwd(), 'migration-reports', `customer-migration-${Date.now()}.json`);

  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(results, null, 2), 'utf8');

  console.log(`\n📄 Validation report saved to: ${reportPath}`);
}

// Run migration
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: npx ts-node scripts/migration/migrate-customers.ts <excel-file-path>');
  process.exit(1);
}

const excelFilePath = args[0];
migrateCustomers(excelFilePath).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
