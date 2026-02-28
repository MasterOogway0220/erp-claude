/**
 * Standalone script to seed Offer Term Templates from the TERMS & CONDITION MASTER Excel.
 * Run with: npx tsx prisma/seed-offer-terms.ts
 *
 * Upserts terms by (termName + quotationType) — safe to re-run.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

const url = new URL(process.env.DATABASE_URL!);
const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: url.port ? parseInt(url.port) : 3306,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1),
  connectionLimit: 5,
});
const prisma = new PrismaClient({ adapter });

const domesticTerms = [
  { termName: "Price", termDefaultValue: "Ex-Godown, Navi Mumbai, India" },
  { termName: "Delivery", termDefaultValue: "As above FOR Site basis + QAP approval Period. LR date will be considered as the date of delivery." },
  { termName: "Payment", termDefaultValue: "100% within 30 days after receipt of materials." },
  { termName: "Offer validity", termDefaultValue: "1 week; further subject to our acceptance." },
  { termName: "Freight", termDefaultValue: "Extra at actual / To your account" },
  { termName: "TPI & Testing", termDefaultValue: "Inclusive (Testing as per HMEL Standard ITP: 9112-000-INP-614-008, REV. 01)" },
  { termName: "P & F charges", termDefaultValue: "NIL" },
  { termName: "Insurance", termDefaultValue: "To your account. Dispatch details will be shared immediately after dispatch." },
  { termName: "GST", termDefaultValue: "18% GST extra" },
  { termName: "Certification", termDefaultValue: "MTC as per EN 10204 - 3.1" },
  { termName: "Material origin", termDefaultValue: "EIL Approved Mill" },
  { termName: "Quantity tolerance", termDefaultValue: "-0/+1 R/L of 5 to 7 mtrs" },
  { termName: "Part orders", termDefaultValue: "Acceptable, subject to reconfirmation" },
  { termName: "LD Clause", termDefaultValue: "Acceptable, 0.5% per week, maximum 5%" },
];

const exportTerms = [
  { termName: "Currency", termDefaultValue: "USD ($)" },
  { termName: "Price", termDefaultValue: "Ex-work, Mumbai, India/ Jebel Ali, UAE" },
  { termName: "Delivery", termDefaultValue: "As above, ex-works, after receipt of PO" },
  { termName: "Payment", termDefaultValue: "100% within 30 Days from date of dispatch" },
  { termName: "Offer validity", termDefaultValue: "6 Days, subject to stock remain unsold" },
  { termName: "Packing", termDefaultValue: "Inclusive" },
  { termName: "Freight", termDefaultValue: "Extra at actual / To your account" },
  { termName: "Insurance", termDefaultValue: "Extra at actual / To your account" },
  { termName: "Certification", termDefaultValue: "Not Applicable" },
  { termName: "T/T charges", termDefaultValue: "To your account, Full Invoice amount to be remitted. No deduction of T/T charges acceptable." },
  { termName: "Third Party Inspection", termDefaultValue: "Not Applicable" },
  { termName: "Material origin", termDefaultValue: "International" },
  { termName: "Qty. Tolerance", termDefaultValue: "Not Applicable" },
  { termName: "Dimension Tolerance", termDefaultValue: "Not Applicable" },
  { termName: "Part orders", termDefaultValue: "Not Applicable" },
];

async function main() {
  console.log("Seeding Offer Term Templates...\n");

  let domesticCreated = 0, domesticUpdated = 0;
  let exportCreated = 0, exportUpdated = 0;

  // Upsert DOMESTIC terms
  for (let i = 0; i < domesticTerms.length; i++) {
    const term = domesticTerms[i];
    const existing = await prisma.offerTermTemplate.findFirst({
      where: { termName: term.termName, quotationType: "DOMESTIC" },
    });

    if (existing) {
      await prisma.offerTermTemplate.update({
        where: { id: existing.id },
        data: { termDefaultValue: term.termDefaultValue, sortOrder: i + 1, isActive: true },
      });
      domesticUpdated++;
    } else {
      await prisma.offerTermTemplate.create({
        data: { ...term, sortOrder: i + 1, quotationType: "DOMESTIC", isActive: true },
      });
      domesticCreated++;
    }
  }

  // Upsert EXPORT terms
  for (let i = 0; i < exportTerms.length; i++) {
    const term = exportTerms[i];
    const existing = await prisma.offerTermTemplate.findFirst({
      where: { termName: term.termName, quotationType: "EXPORT" },
    });

    if (existing) {
      await prisma.offerTermTemplate.update({
        where: { id: existing.id },
        data: { termDefaultValue: term.termDefaultValue, sortOrder: i + 1, isActive: true },
      });
      exportUpdated++;
    } else {
      await prisma.offerTermTemplate.create({
        data: { ...term, sortOrder: i + 1, quotationType: "EXPORT", isActive: true },
      });
      exportCreated++;
    }
  }

  console.log("DOMESTIC terms:", domesticCreated, "created,", domesticUpdated, "updated");
  console.log("EXPORT terms:", exportCreated, "created,", exportUpdated, "updated");
  console.log("\nDone!");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
