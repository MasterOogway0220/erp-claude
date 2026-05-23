# Sales PRD — Plan 02: Step 1 (Register Client P.O.) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement PRD §2 (Step 1 — Register Client P.O.) end-to-end: schema, APIs, and form UI for the Client P.O. registration flow.

**Architecture:** Extend `ClientPurchaseOrder` and `ClientPOItem` in place with new fields. Add one new API endpoint for material-code customer history. Wire the existing `src/lib/fx/get-rate.ts` (Plan 01) into PO creation to freeze the exchange rate on each PO. Refactor the create form to derive currency from customer and surface the new fields. Extract pure totals calculation into `src/lib/calc/po-totals.ts` with vitest coverage.

**Tech Stack:** Next.js 16 (App Router) · Prisma 7 (MariaDB adapter) · TypeScript · Vitest

---

## Schema findings (confirmed against current code 2026-05-23)

| Field | Current state | Action |
|---|---|---|
| `ClientPurchaseOrder.currency` | exists (`String @default("INR")`) | Reuse as-is — derive from customer in API |
| `ClientPurchaseOrder.deliveryDate` | exists (`DateTime?`) | LEAVE — separate from CDD per PRD §2.6 "apart from existing delivery schedule" |
| `ClientPurchaseOrder.deliverySchedule` | exists (`String?`) | LEAVE |
| `ClientPurchaseOrder.cgst/sgst/igst/gstRate/isInterState` | exist | Reuse — gated by currency in API |
| `ClientPOItem.unitRate` | exists | Reuse — this is the "Negotiated Rate" per PRD §2.2 (UI label change only) |
| `ClientPOItem.qtyQuoted` | exists (`Decimal @db.Decimal(10,3)`) | DROP (§2.1) |
| `ClientPOItem.remark` | exists (`String?`) | LEAVE (general item remark) |
| "Already Ordered", "Balance" | NOT in schema (UI-computed) | Remove from UI only |
| "Quoted Rate" column | shows `quotationItem.unitRate` via JOIN | Remove column from UI |

**Net schema deltas:**
- `ClientPurchaseOrder`: ADD `committedDeliveryDate`, `isDomesticDelivery`, `shipmentAddress`, `exchangeRate`
- `ClientPOItem`: ADD `poSlNo`, `poItemCode`, `rateRemark`; DROP `qtyQuoted`

---

## File structure

```
prisma/schema.prisma                                       ← MODIFY
prisma/migrations/<timestamp>_step1_client_po_changes/...  ← CREATE (auto by prisma migrate)
src/lib/calc/po-totals.ts                                  ← CREATE: pure totals calculation
src/lib/calc/po-totals.test.ts                             ← CREATE: 3 vitest cases
src/app/api/client-purchase-orders/route.ts                ← MODIFY (accept new fields, freeze FX)
src/app/api/client-purchase-orders/[id]/route.ts           ← MODIFY (accept new fields on PATCH)
src/app/api/masters/material-codes/[id]/customer-history/route.ts  ← CREATE
src/app/(dashboard)/client-purchase-orders/page.tsx        ← MODIFY (title rename)
src/app/(dashboard)/client-purchase-orders/create/page.tsx ← MODIFY (form rewrite)
```

---

## Task 1: Schema migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_step1_client_po_changes/migration.sql` (auto-generated)

- [ ] **Step 1: Add new fields to `ClientPurchaseOrder` in `prisma/schema.prisma`**

Locate the `ClientPurchaseOrder` block (around line 1005). Add these 4 fields directly under the existing `currency` line (around line 1019):

```prisma
  committedDeliveryDate     DateTime?
  isDomesticDelivery        Boolean           @default(false)
  shipmentAddress           String?           @db.Text
  exchangeRate              Decimal?          @db.Decimal(12, 6)
```

- [ ] **Step 2: Add new fields to `ClientPOItem` and drop `qtyQuoted`**

Locate the `ClientPOItem` block (around line 1066). REMOVE the `qtyQuoted` line entirely. ADD these 3 fields below the existing `remark` line:

```prisma
  poSlNo                String?
  poItemCode            String?
  rateRemark            String?             @db.Text
```

- [ ] **Step 3: Run prisma migrate dev**

Run:
```bash
cd /Users/adi0220/projects/erp-claude && npx prisma migrate dev --name step1_client_po_changes
```

Expected: prisma generates a new migration directory under `prisma/migrations/`, applies it to the dev database, and regenerates the client. If prompted to confirm data loss (dropping `qtyQuoted`), accept — pre-launch data, drop-and-reseed is the agreed policy (Plan 01 spec patch confirms D3).

- [ ] **Step 4: Verify the migration SQL**

Check the generated migration file:
```bash
ls -t /Users/adi0220/projects/erp-claude/prisma/migrations/ | head -1
```

Then `cat` the `migration.sql` and confirm it contains:
- `ALTER TABLE ClientPurchaseOrder ADD COLUMN committedDeliveryDate DATETIME(3) NULL`
- `ALTER TABLE ClientPurchaseOrder ADD COLUMN isDomesticDelivery BOOLEAN NOT NULL DEFAULT 0`
- `ALTER TABLE ClientPurchaseOrder ADD COLUMN shipmentAddress TEXT NULL`
- `ALTER TABLE ClientPurchaseOrder ADD COLUMN exchangeRate DECIMAL(12,6) NULL`
- `ALTER TABLE ClientPOItem DROP COLUMN qtyQuoted`
- `ALTER TABLE ClientPOItem ADD COLUMN poSlNo VARCHAR(...) NULL`
- `ALTER TABLE ClientPOItem ADD COLUMN poItemCode VARCHAR(...) NULL`
- `ALTER TABLE ClientPOItem ADD COLUMN rateRemark TEXT NULL`

- [ ] **Step 5: Verify Prisma client regenerated**

```bash
cd /Users/adi0220/projects/erp-claude && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "error TS|qtyQuoted" | head -20
```

Expected: there WILL be TypeScript errors anywhere `qtyQuoted` is referenced (UI form, API routes). Capture these — they are the targets for Tasks 5–9. If errors are unrelated to qtyQuoted, investigate.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "$(cat <<'EOF'
feat: schema for Client P.O. Step 1 changes (PRD §2)

ClientPurchaseOrder: + committedDeliveryDate, isDomesticDelivery,
shipmentAddress, exchangeRate (frozen at PO creation).
ClientPOItem: + poSlNo, poItemCode, rateRemark; - qtyQuoted.

UI + API code edits to follow in subsequent commits.
EOF
)"
```

Do NOT push (push happens after all Plan 02 tasks).

---

## Task 2: Extract po-totals.ts pure calculation + tests

**Files:**
- Create: `src/lib/calc/po-totals.ts`
- Create: `src/lib/calc/po-totals.test.ts`

- [ ] **Step 1: Write the failing test file**

Create `src/lib/calc/po-totals.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computePOTotals } from "./po-totals";

describe("computePOTotals", () => {
  const baseItem = { qty: 10, unitRate: 100 }; // subtotal: 1000

  it("domestic INR with GST applies cgst+sgst when intra-state", () => {
    const result = computePOTotals({
      items: [baseItem],
      currency: "INR",
      isInternational: false,
      isDomesticDelivery: false,
      gstRate: 18,
      isInterState: false,
      charges: { freight: 0, packing: 0, insurance: 0, other: 0, testing: 0, tpi: 0 },
    });
    expect(result.subtotal).toBe(1000);
    expect(result.cgst).toBe(90);
    expect(result.sgst).toBe(90);
    expect(result.igst).toBe(0);
    expect(result.grandTotal).toBe(1180);
  });

  it("international USD has no GST", () => {
    const result = computePOTotals({
      items: [baseItem],
      currency: "USD",
      isInternational: true,
      isDomesticDelivery: false,
      gstRate: 18,
      isInterState: false,
      charges: { freight: 0, packing: 0, insurance: 0, other: 0, testing: 0, tpi: 0 },
    });
    expect(result.subtotal).toBe(1000);
    expect(result.cgst).toBe(0);
    expect(result.sgst).toBe(0);
    expect(result.igst).toBe(0);
    expect(result.grandTotal).toBe(1000);
  });

  it("international USD with domestic delivery re-enables GST", () => {
    const result = computePOTotals({
      items: [baseItem],
      currency: "USD",
      isInternational: true,
      isDomesticDelivery: true,
      gstRate: 18,
      isInterState: true,
      charges: { freight: 0, packing: 0, insurance: 0, other: 0, testing: 0, tpi: 0 },
    });
    expect(result.subtotal).toBe(1000);
    expect(result.igst).toBe(180);
    expect(result.cgst).toBe(0);
    expect(result.sgst).toBe(0);
    expect(result.grandTotal).toBe(1180);
  });
});
```

- [ ] **Step 2: Run to verify it fails (module missing)**

```bash
cd /Users/adi0220/projects/erp-claude && npm test -- src/lib/calc/po-totals.test.ts
```

Expected: FAIL with "Cannot find module './po-totals'".

- [ ] **Step 3: Write the implementation**

Create `src/lib/calc/po-totals.ts`:

```ts
export type POItem = { qty: number; unitRate: number };
export type POCharges = {
  freight: number;
  packing: number;
  insurance: number;
  other: number;
  testing: number;
  tpi: number;
};

export type POTotalsInput = {
  items: POItem[];
  currency: "INR" | "USD";
  isInternational: boolean;
  isDomesticDelivery: boolean;
  gstRate: number;
  isInterState: boolean;
  charges: POCharges;
};

export type POTotalsResult = {
  subtotal: number;
  additionalChargesTotal: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  grandTotal: number;
};

export function computePOTotals(input: POTotalsInput): POTotalsResult {
  const subtotal = input.items.reduce((sum, item) => sum + item.qty * item.unitRate, 0);
  const additionalChargesTotal =
    input.charges.freight +
    input.charges.packing +
    input.charges.insurance +
    input.charges.other +
    input.charges.testing +
    input.charges.tpi;
  const taxableAmount = subtotal + additionalChargesTotal;

  // GST applies only when GST is in effect:
  //   - Domestic customer (always)
  //   - International customer ONLY when isDomesticDelivery=true
  const gstApplies = !input.isInternational || input.isDomesticDelivery;
  let cgst = 0, sgst = 0, igst = 0;
  if (gstApplies && input.gstRate > 0) {
    if (input.isInterState) {
      igst = +(taxableAmount * input.gstRate / 100).toFixed(2);
    } else {
      const half = +(taxableAmount * input.gstRate / 200).toFixed(2);
      cgst = half;
      sgst = half;
    }
  }

  const grandTotal = +(taxableAmount + cgst + sgst + igst).toFixed(2);

  return { subtotal, additionalChargesTotal, taxableAmount, cgst, sgst, igst, grandTotal };
}
```

- [ ] **Step 4: Run tests**

```bash
cd /Users/adi0220/projects/erp-claude && npm test -- src/lib/calc/po-totals.test.ts
```

Expected: 3/3 pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/calc/po-totals.ts src/lib/calc/po-totals.test.ts
git commit -m "$(cat <<'EOF'
feat: extract pure po-totals calculation with GST logic

src/lib/calc/po-totals.ts is a pure function computing PO subtotal,
charges, GST (CGST/SGST or IGST), and grand total. GST applies when
the customer is domestic OR international-but-domestic-delivery
(matches PRD §2.4 toggle semantics). 3 vitest cases cover the three
real-world combinations.

Will be imported by the client-purchase-orders create form and API.
EOF
)"
```

---

## Task 3: Material-code customer-history API endpoint

**Files:**
- Create: `src/app/api/masters/material-codes/[id]/customer-history/route.ts`

- [ ] **Step 1: Implement the endpoint**

Create `src/app/api/masters/material-codes/[id]/customer-history/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: materialCodeId } = await params;
  const customerId = req.nextUrl.searchParams.get("customerId");
  if (!customerId) {
    return NextResponse.json({ error: "customerId is required" }, { status: 400 });
  }

  try {
    // Latest quotation item for this customer + material
    const lastQuoteItem = await prisma.quotationItem.findFirst({
      where: {
        materialCodeId,
        quotation: { customerId },
      },
      orderBy: { createdAt: "desc" },
      select: {
        unitRate: true,
        createdAt: true,
        quotation: { select: { quotationNo: true, quotationDate: true } },
      },
    });

    // Latest client-PO item for this customer + material via the quotation join
    const lastPOItem = await prisma.clientPOItem.findFirst({
      where: {
        quotationItem: { materialCodeId },
        clientPurchaseOrder: { customerId },
      },
      orderBy: { clientPurchaseOrder: { cpoDate: "desc" } },
      select: {
        unitRate: true,
        rateRemark: true,
        remark: true,
        clientPurchaseOrder: { select: { cpoNo: true, cpoDate: true } },
      },
    });

    return NextResponse.json({
      lastQuote: lastQuoteItem
        ? {
            rate: Number(lastQuoteItem.unitRate),
            quoteNo: lastQuoteItem.quotation.quotationNo,
            quotedAt: lastQuoteItem.quotation.quotationDate,
          }
        : null,
      lastPO: lastPOItem
        ? {
            rate: Number(lastPOItem.unitRate),
            poNo: lastPOItem.clientPurchaseOrder.cpoNo,
            orderedAt: lastPOItem.clientPurchaseOrder.cpoDate,
            remark: lastPOItem.rateRemark ?? lastPOItem.remark ?? null,
          }
        : null,
    });
  } catch (error) {
    console.error("customer-history error:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
```

**Note:** the endpoint references `materialCodeId` on `QuotationItem`. Before writing, run `grep -n "materialCodeId" /Users/adi0220/projects/erp-claude/prisma/schema.prisma | head -5` to confirm the field name. If the actual field is named differently (e.g., `materialCode` as a String code rather than an FK), adjust both queries accordingly. If neither exists, report BLOCKED.

- [ ] **Step 2: Smoke-test the route**

Run the dev server in background, hit the endpoint once with an arbitrary id, confirm it returns a JSON shape (likely `{ lastQuote: null, lastPO: null }` if no history exists):

```bash
cd /Users/adi0220/projects/erp-claude && npm run dev &
sleep 8
# Replace the ids below with actual ones from your db
curl -s "http://localhost:3000/api/masters/material-codes/<any-material-id>/customer-history?customerId=<any-customer-id>" -H "Cookie: <session-cookie-or-skip-if-public>"
```

You don't need a valid session for this smoke — a 401 confirms the route is wired up. A 200 with JSON shape confirms it works.

Kill the dev server:
```bash
pkill -f "next dev" || true
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/masters/material-codes/[id]/customer-history/route.ts
git commit -m "$(cat <<'EOF'
feat: add material-code customer-history endpoint (PRD §2.9)

GET /api/masters/material-codes/[id]/customer-history?customerId=…
Returns the latest QuotationItem and ClientPOItem for the given
customer+material pair. Used by the Client P.O. create form to
auto-fill past quote/PO/price/remarks when a material code is picked.
EOF
)"
```

---

## Task 4: Wire FX + new fields into Client P.O. APIs

**Files:**
- Modify: `src/app/api/client-purchase-orders/route.ts`
- Modify: `src/app/api/client-purchase-orders/[id]/route.ts`

- [ ] **Step 1: Read current shape of the POST handler**

Run:
```bash
cd /Users/adi0220/projects/erp-claude && wc -l src/app/api/client-purchase-orders/route.ts
cd /Users/adi0220/projects/erp-claude && head -80 src/app/api/client-purchase-orders/route.ts
```

Note the current request body shape and how items are constructed.

- [ ] **Step 2: Extend the POST handler**

In `src/app/api/client-purchase-orders/route.ts`:

a. Add import at top:
```ts
import { getRate } from "@/lib/fx/get-rate";
```

b. In the POST handler, after reading `body` and before the prisma.clientPurchaseOrder.create call:

```ts
// Resolve customer to derive currency + isInternational gate
const customer = await prisma.customerMaster.findUnique({
  where: { id: body.customerId },
  select: { customerType: true, defaultCurrency: true, currency: true },
});
if (!customer) {
  return NextResponse.json({ error: "Customer not found" }, { status: 400 });
}

const isInternational = customer.customerType === "INTERNATIONAL";
const resolvedCurrency = isInternational ? "USD" : "INR";

// Freeze FX rate on creation when currency is USD
let exchangeRate: number | null = null;
if (resolvedCurrency === "USD") {
  const fx = await getRate("USD", "INR");
  exchangeRate = fx?.rate ?? null;
}
```

c. In the `prisma.clientPurchaseOrder.create({ data: { … } })` block, add:

```ts
        currency:               resolvedCurrency,
        exchangeRate,
        committedDeliveryDate:  body.committedDeliveryDate ? new Date(body.committedDeliveryDate) : null,
        isDomesticDelivery:     Boolean(body.isDomesticDelivery),
        shipmentAddress:        body.shipmentAddress ?? null,
```

d. In the items-create block, ADD these fields and REMOVE `qtyQuoted`:

```ts
          poSlNo:        item.poSlNo ?? null,
          poItemCode:    item.poItemCode ?? null,
          rateRemark:    item.rateRemark ?? null,
```

If the current code passes `qtyQuoted: item.qtyQuoted` to the item create, REMOVE that line — the column no longer exists.

- [ ] **Step 3: Extend the PATCH handler**

In `src/app/api/client-purchase-orders/[id]/route.ts` PATCH handler:

a. Allow updating: `committedDeliveryDate`, `isDomesticDelivery`, `shipmentAddress` (currency + exchangeRate are frozen at create — do NOT allow PATCH to change them).

b. For item updates, allow: `poSlNo`, `poItemCode`, `rateRemark`. Remove any reference to `qtyQuoted`.

- [ ] **Step 4: Type-check**

```bash
cd /Users/adi0220/projects/erp-claude && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "error TS" | grep -E "client-purchase-orders" | head -20
```

Fix any errors in these files before proceeding. If there are errors elsewhere (UI files referencing qtyQuoted), leave them — those are addressed in later tasks.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/client-purchase-orders/route.ts src/app/api/client-purchase-orders/\[id\]/route.ts
git commit -m "$(cat <<'EOF'
feat: wire intl currency + FX + new fields into Client P.O. APIs

POST /api/client-purchase-orders now derives currency from the
customer's customerType (INTERNATIONAL→USD, else INR) and freezes
exchangeRate via getRate() at PO creation when USD. Accepts and
persists committedDeliveryDate, isDomesticDelivery, shipmentAddress,
and per-item poSlNo/poItemCode/rateRemark. Drops qtyQuoted.

PATCH allows mutating the delivery-side fields and item-level new
fields but not the frozen currency/exchangeRate.
EOF
)"
```

---

## Task 5: Rename list page title to "Dashboard"

**Files:**
- Modify: `src/app/(dashboard)/client-purchase-orders/page.tsx`

- [ ] **Step 1: Find the page title**

```bash
cd /Users/adi0220/projects/erp-claude && grep -n "Client P.O. Register\|Client PO Register\|PageHeader" src/app/\(dashboard\)/client-purchase-orders/page.tsx | head
```

- [ ] **Step 2: Change the title string**

In `src/app/(dashboard)/client-purchase-orders/page.tsx`, change the page title (likely passed to `<PageHeader title="…" />`) from "Client P.O. Register" (or similar) to **"Dashboard"**. Leave any subtitle text and breadcrumbs intact unless they reference the old name.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/client-purchase-orders/page.tsx
git commit -m "$(cat <<'EOF'
feat(ui): rename Client P.O. Register page title to "Dashboard" (PRD §1)
EOF
)"
```

(Sidebar entry rename is OQ4 in spec — AWAITING CONFIRMATION; not changed here.)

---

## Task 6: Create form — header section

**Files:**
- Modify: `src/app/(dashboard)/client-purchase-orders/create/page.tsx`

The header section currently has customer picker, quotation picker, currency, GST inputs, delivery schedule, etc. Apply these changes (do NOT yet touch the items table — that's Task 7):

- [ ] **Step 1: Read the relevant code**

```bash
cd /Users/adi0220/projects/erp-claude && sed -n '1,250p' src/app/\(dashboard\)/client-purchase-orders/create/page.tsx
```

Note where the customer-select onChange handler sets currency state, where the form state object is declared, and where the form body header section ends and the items table begins.

- [ ] **Step 2: Derive currency + intl from customer**

In the customer-select onChange handler (or `useEffect` watching `formData.customerId`):
- Fetch the chosen customer's `customerType` + `defaultCurrency` (you may already have the customer object — if not, add a lookup).
- Set local state `isInternational = customerType === "INTERNATIONAL"`.
- Set `formData.currency` to `"USD"` if international, `"INR"` if domestic.

Render the Currency input as **read-only** (disabled `Input` showing the derived value).

- [ ] **Step 3: Add `Domestic Delivery` toggle (international customers only)**

Below the customer-select block, add:

```tsx
{isInternational && (
  <div className="space-y-2">
    <Label>Domestic Delivery</Label>
    <Switch
      checked={formData.isDomesticDelivery}
      onCheckedChange={(checked) =>
        setFormData((prev) => ({ ...prev, isDomesticDelivery: checked }))
      }
    />
    {formData.isDomesticDelivery && (
      <Textarea
        placeholder="Shipment address (India)"
        value={formData.shipmentAddress ?? ""}
        onChange={(e) =>
          setFormData((prev) => ({ ...prev, shipmentAddress: e.target.value }))
        }
      />
    )}
  </div>
)}
```

Import `Switch` from `@/components/ui/switch` and `Textarea` from `@/components/ui/textarea` if not already imported.

- [ ] **Step 4: Add `Exchange Rate` field (USD only)**

Below the currency block:

```tsx
{formData.currency === "USD" && (
  <div className="space-y-2">
    <Label>Exchange Rate (1 USD = ? INR)</Label>
    <Input
      type="number"
      step="0.0001"
      value={formData.exchangeRate ?? ""}
      onChange={(e) =>
        setFormData((prev) => ({ ...prev, exchangeRate: e.target.value ? Number(e.target.value) : null }))
      }
    />
  </div>
)}
```

Add a `useEffect` that auto-fills `exchangeRate` when `currency` becomes "USD" by calling a new client helper (defined inline or via a new file `src/lib/fx/client.ts` — keep it simple, fetch the FX from a new `/api/fx/rate?from=USD&to=INR` endpoint OR call `getRate` directly if server components allow).

**Simplest path: add a new endpoint** `src/app/api/fx/rate/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getRate } from "@/lib/fx/get-rate";

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get("from") as "USD" | "INR" | null;
  const to = req.nextUrl.searchParams.get("to") as "USD" | "INR" | null;
  if (!from || !to) return NextResponse.json({ error: "from, to required" }, { status: 400 });
  const result = await getRate(from, to);
  if (!result) return NextResponse.json({ error: "rate unavailable" }, { status: 503 });
  return NextResponse.json(result);
}
```

Then the create form calls `fetch("/api/fx/rate?from=USD&to=INR")` in the effect and sets `formData.exchangeRate`.

- [ ] **Step 5: Add `Committed Delivery Date` picker**

Below the existing Delivery Schedule field, add a date picker bound to `formData.committedDeliveryDate`. Use the existing date picker component the codebase already uses (search `<DatePicker` or `Calendar` for the pattern).

- [ ] **Step 6: Type-check**

```bash
cd /Users/adi0220/projects/erp-claude && npx tsc --noEmit 2>&1 | grep -E "client-purchase-orders/create" | head -20
```

Fix errors in the create page. Other files' errors (referring to qtyQuoted) are handled in Task 7.

- [ ] **Step 7: Commit**

```bash
git add src/app/\(dashboard\)/client-purchase-orders/create/page.tsx src/app/api/fx/rate/route.ts 2>/dev/null
git commit -m "$(cat <<'EOF'
feat(ui): Client P.O. header — derived currency, intl toggle, FX, CDD

- Currency input becomes read-only; derived from customer.customerType.
- International customers show a Domestic Delivery toggle (PRD §2.4)
  that reveals a Shipment Address textarea when on.
- USD currency surfaces an editable Exchange Rate field auto-filled
  from /api/fx/rate (delegates to src/lib/fx/get-rate.ts).
- New Committed Delivery Date picker (PRD §2.6) feeds the new schema
  field added in Task 1.
EOF
)"
```

---

## Task 7: Create form — items table (column changes)

**Files:**
- Modify: `src/app/(dashboard)/client-purchase-orders/create/page.tsx`

- [ ] **Step 1: Read the items-table section**

```bash
cd /Users/adi0220/projects/erp-claude && grep -n "Qty Quoted\|Already Ordered\|Balance\|Quoted Rate" src/app/\(dashboard\)/client-purchase-orders/create/page.tsx
```

These greps point at the column headers and any cells that render those fields.

- [ ] **Step 2: Remove the 4 deprecated columns**

Remove the table headers and corresponding `<td>` / cell render for: **"Qty Quoted"**, **"Already Ordered"**, **"Balance"**, **"Quoted Rate"**. Also remove any state computation feeding those cells (e.g., `const balance = qtyOrdered - alreadyOrdered`).

The form-state object likely has `qtyQuoted` per row — remove that from the row template and from any `setItems` builder.

- [ ] **Step 3: Rename label "Order Rate" / "Negotiated Rate" header**

If the current rate column shows "Order Rate", "Rate", or similar, rename the header text to **"Negotiated Rate"** (PRD §2.2). The bound field stays `unitRate`.

- [ ] **Step 4: Add `Sl. No. as per P.O.` and `Item Code as per P.O.` columns**

Add two new columns near the start of the row (before product name is a reasonable spot), bound to `poSlNo` and `poItemCode`:

```tsx
<TableHead>Sl. No. (PO)</TableHead>
<TableHead>Item Code (PO)</TableHead>
...
<TableCell>
  <Input
    value={item.poSlNo ?? ""}
    onChange={(e) => updateItem(idx, "poSlNo", e.target.value)}
  />
</TableCell>
<TableCell>
  <Input
    value={item.poItemCode ?? ""}
    onChange={(e) => updateItem(idx, "poItemCode", e.target.value)}
  />
</TableCell>
```

Match the existing `updateItem(idx, key, value)` helper signature in the file.

- [ ] **Step 5: Type-check**

```bash
cd /Users/adi0220/projects/erp-claude && npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -i "client-purchase-orders" | head -20
```

There should now be zero TS errors related to qtyQuoted in this file. Other files may still have references — they're handled in upcoming tasks.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/client-purchase-orders/create/page.tsx
git commit -m "$(cat <<'EOF'
feat(ui): Client P.O. items table — PRD §2.1, §2.2, §2.8

- Remove deprecated columns: Qty Quoted, Already Ordered, Balance,
  Quoted Rate (PRD §2.1).
- Rename "Order Rate" → "Negotiated Rate" header (PRD §2.2);
  underlying field remains unitRate.
- Add Sl. No. (PO) and Item Code (PO) input columns bound to the
  new poSlNo / poItemCode fields (PRD §2.8).
EOF
)"
```

---

## Task 8: Create form — rate-edit-with-remark popover + material-code lookup

**Files:**
- Modify: `src/app/(dashboard)/client-purchase-orders/create/page.tsx`

- [ ] **Step 1: Add rate-edit popover**

Convert the Negotiated Rate cell from a plain `<Input>` to a small popover trigger. Use the existing `@/components/ui/popover` (`Popover`, `PopoverTrigger`, `PopoverContent`). Inside the popover:

```tsx
<div className="space-y-2 p-3 w-72">
  <Label>New Rate</Label>
  <Input
    type="number"
    step="0.01"
    value={tmpRate}
    onChange={(e) => setTmpRate(Number(e.target.value))}
  />
  <Label>Remark (justification)</Label>
  <Textarea value={tmpRemark} onChange={(e) => setTmpRemark(e.target.value)} />
  <Button
    onClick={() => {
      updateItem(idx, "unitRate", tmpRate);
      updateItem(idx, "rateRemark", tmpRemark);
      // close popover via state
    }}
  >
    Save
  </Button>
</div>
```

You'll need per-row temporary state (`tmpRate`, `tmpRemark`) or a single open-popover index. Simplest: track `openRowIdx` in component state and inline the inputs.

The cell display still shows the current `unitRate` as the popover trigger button label.

- [ ] **Step 2: Wire material-code → customer-history fetch**

In the material-code select onChange (locate by grepping for "materialCode" or "material_code" in the file):

```tsx
const onMaterialChange = async (idx: number, materialCodeId: string) => {
  updateItem(idx, "materialCodeId", materialCodeId);
  if (!formData.customerId) return;
  const res = await fetch(
    `/api/masters/material-codes/${materialCodeId}/customer-history?customerId=${formData.customerId}`,
  );
  if (!res.ok) return;
  const data = await res.json();
  setMaterialHistory((prev) => ({ ...prev, [idx]: data }));
};
```

Where `materialHistory` is a new state `Record<number, { lastQuote, lastPO }>`.

- [ ] **Step 3: Render the history side panel**

Below each row (or in a collapsible side panel under the row), conditionally render when `materialHistory[idx]` exists:

```tsx
{materialHistory[idx] && (
  <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
    {materialHistory[idx].lastQuote ? (
      <div>Last Quote: {materialHistory[idx].lastQuote.rate} ({materialHistory[idx].lastQuote.quoteNo})</div>
    ) : (
      <div>No past quote for this customer + material.</div>
    )}
    {materialHistory[idx].lastPO ? (
      <div>Last PO: {materialHistory[idx].lastPO.rate} ({materialHistory[idx].lastPO.poNo}){materialHistory[idx].lastPO.remark ? ` — ${materialHistory[idx].lastPO.remark}` : ""}</div>
    ) : (
      <div>No past PO for this customer + material.</div>
    )}
  </div>
)}
```

- [ ] **Step 4: Type-check + manual smoke**

```bash
cd /Users/adi0220/projects/erp-claude && npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -i "client-purchase-orders/create" | head
cd /Users/adi0220/projects/erp-claude && npm run dev &
sleep 8
# Open http://localhost:3000/client-purchase-orders/create in a browser, exercise:
#  - Select customer
#  - Pick a quotation
#  - Pick a material code on a row → confirm a network call to customer-history fires
# Then kill:
pkill -f "next dev" || true
```

If the smoke fails (e.g., customer-history returns 500), check the Task 3 grep note about field naming.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/client-purchase-orders/create/page.tsx
git commit -m "$(cat <<'EOF'
feat(ui): rate-edit popover + material-code history (PRD §2.7, §2.9)

- Negotiated Rate cell becomes a popover trigger that captures
  New Rate + Remark together and persists both to unitRate +
  rateRemark on save (PRD §2.7).
- Selecting a Material Code on a row fires
  GET /api/masters/material-codes/[id]/customer-history?customerId=…
  and renders an inline panel with the last quote and last PO data
  (PRD §2.9). Same-customer scope per design decision D6.
EOF
)"
```

---

## Task 9: USD subtotal + INR equivalent display

**Files:**
- Modify: `src/app/(dashboard)/client-purchase-orders/create/page.tsx`

- [ ] **Step 1: Hide GST columns/section when currency=USD AND not domestic delivery**

In the totals/summary section, wrap GST-related rows (CGST, SGST, IGST inputs/displays) in:

```tsx
{(formData.currency === "INR" || formData.isDomesticDelivery) && (
  /* existing GST UI */
)}
```

- [ ] **Step 2: Label subtotal as "USD Subtotal" + show INR equivalent**

In the subtotal display:

```tsx
{formData.currency === "USD" ? (
  <>
    <div>USD Subtotal: ${subtotal.toFixed(2)}</div>
    {formData.exchangeRate && (
      <div className="text-xs text-muted-foreground">
        ≈ ₹{(subtotal * formData.exchangeRate).toFixed(2)} INR
      </div>
    )}
  </>
) : (
  <div>Subtotal: ₹{subtotal.toFixed(2)}</div>
)}
```

- [ ] **Step 3: Replace ad-hoc totals math with `computePOTotals`**

Import `computePOTotals` from `@/lib/calc/po-totals`. Replace any inline `subtotal + gst + …` calculations with one call:

```tsx
const totals = computePOTotals({
  items: formData.items.map((i) => ({ qty: Number(i.qtyOrdered), unitRate: Number(i.unitRate) })),
  currency: formData.currency as "INR" | "USD",
  isInternational,
  isDomesticDelivery: formData.isDomesticDelivery,
  gstRate: Number(formData.gstRate ?? 0),
  isInterState: Boolean(formData.isInterState),
  charges: {
    freight:   Number(formData.freight ?? 0),
    packing:   Number(formData.packingForwarding ?? 0),
    insurance: Number(formData.insurance ?? 0),
    other:     Number(formData.otherCharges ?? 0),
    testing:   Number(formData.testingCharges ?? 0),
    tpi:       Number(formData.tpiCharges ?? 0),
  },
});
```

And bind `subtotal`, `cgst`, `sgst`, `igst`, `grandTotal` from `totals`.

- [ ] **Step 4: Type-check**

```bash
cd /Users/adi0220/projects/erp-claude && npx tsc --noEmit 2>&1 | grep -E "error TS" | head -20
```

There should be zero errors at this point. If any remain (UI files or APIs still referencing `qtyQuoted`, or items table charges fields renamed differently), fix them.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/client-purchase-orders/create/page.tsx
git commit -m "$(cat <<'EOF'
feat(ui): USD/INR totals display + computePOTotals integration

- Hide GST inputs/rows when currency=USD AND not domestic delivery.
- USD currency labels subtotal as "USD Subtotal" with computed INR
  equivalent line (uses frozen exchangeRate).
- Replace ad-hoc totals math with computePOTotals() from
  src/lib/calc/po-totals.ts so the form and a future server-side
  recompute share one source of truth.
EOF
)"
```

---

## Task 10: Manual verification + push

**Files:** none modified

- [ ] **Step 1: Final type-check + build**

```bash
cd /Users/adi0220/projects/erp-claude && npx tsc --noEmit 2>&1 | tail -5
cd /Users/adi0220/projects/erp-claude && npm test 2>&1 | tail -10
cd /Users/adi0220/projects/erp-claude && npm run build 2>&1 | tail -10
```

All three must succeed:
- tsc: zero errors
- npm test: all FX + po-totals tests pass (5 + 3 = 8)
- npm run build: clean

If any fails, STOP and report BLOCKED.

- [ ] **Step 2: Manual smoke on dev server**

Start dev server, run the checklist from spec §6.3 items 1–5 (in browser):

1. Customer master — toggle a customer to International; save; reload; verify state persists.
2. Client P.O. — domestic — pick the domestic customer; verify currency is INR and locked; GST inputs visible; Domestic Delivery toggle absent.
3. Client P.O. — international, foreign delivery — pick international customer; verify currency is USD and locked; ExchangeRate field appears and auto-fills; GST inputs hidden.
4. Client P.O. — international, domestic delivery — toggle Domestic Delivery on; Shipment Address textarea appears; GST inputs re-enable.
5. Material code lookup — pick a material on a row; verify the history side panel renders (either with data or "no history" message).

Capture observations. If any fails, fix in a follow-up commit before pushing.

- [ ] **Step 3: Push**

```bash
cd /Users/adi0220/projects/erp-claude && git push origin master
```

- [ ] **Step 4: Confirm clean state**

```bash
cd /Users/adi0220/projects/erp-claude && git status && git log origin/master..HEAD --oneline
```

The branch should be at parity with origin (no unpushed commits).

---

## Done — what shipped

After this plan executes:

- ✅ Schema: `ClientPurchaseOrder` + 4 new fields, `ClientPOItem` + 3 new fields - qtyQuoted
- ✅ `src/lib/calc/po-totals.ts` — pure totals fn with 3 vitest cases (covers PRD §2.3 / §2.4 GST gates)
- ✅ `GET /api/masters/material-codes/[id]/customer-history` — past quote/PO lookup
- ✅ `GET /api/fx/rate` — thin wrapper over `getRate()` for client-side FX fetch
- ✅ Client P.O. APIs derive currency from customer, freeze FX on create, accept all new fields
- ✅ Client P.O. list page title is "Dashboard"
- ✅ Client P.O. create form: derived currency, Domestic Delivery toggle, ExchangeRate field, CDD picker, new item columns, rate-edit-with-remark popover, material-code customer-history panel, USD/INR aware totals

**Next plan:** Plan 03 — Step 2 (P.O. Acceptance wizard + PDF preview + email). Will be written after Plan 02 lands.

---

*End of Plan 02.*
