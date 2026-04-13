# PO Edit (DRAFT) + Tender → Quotation/SO Linkage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow full editing of Draft Purchase Orders, and let users create Quotations or Sales Orders directly from a Won tender (with pre-filled data and a back-link stored).

**Architecture:** PO edit extends the existing PATCH endpoint with a `full_edit` action that replaces items in-place. Tender linkage adds `sourceTenderId` to Quotation and SalesOrder via a Prisma migration, then wires up pre-fill via URL params on create pages.

**Tech Stack:** Next.js 15 App Router, Prisma ORM, PostgreSQL, React, Shadcn/ui, Sonner toasts

---

## File Map

### Feature 1 — PO Edit

| File | Action |
|------|--------|
| `src/app/api/purchase/orders/[id]/route.ts` | Add `full_edit` action to PATCH handler |
| `src/app/(dashboard)/purchase/orders/[id]/edit/page.tsx` | **Create** — edit form (mirrors create page) |
| `src/app/(dashboard)/purchase/orders/[id]/page.tsx` | Add "Edit" button visible only in DRAFT |

### Feature 2 — Tender Linkage

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Add `sourceTenderId` to Quotation + SalesOrder; reverse on Tender |
| `src/app/api/quotations/route.ts` | Accept `sourceTenderId` in POST |
| `src/app/api/sales-orders/route.ts` | Accept `sourceTenderId` in POST |
| `src/app/api/tenders/[id]/route.ts` | Include linked quotations + SOs in GET |
| `src/app/(dashboard)/tenders/[id]/page.tsx` | Add action buttons (WON only) + Linked Documents section |
| `src/app/(dashboard)/quotations/create/standard/page.tsx` | Read `tenderId` param, pre-fill customer + items |
| `src/app/(dashboard)/quotations/create/nonstandard/page.tsx` | Read `tenderId` param, pre-fill customer + items |
| `src/app/(dashboard)/sales/create/page.tsx` | Read `tenderId` param, pre-fill customer + project |

---

## Task 1: Extend PO PATCH API for full DRAFT edit

**File:** `src/app/api/purchase/orders/[id]/route.ts`

- [ ] **Step 1: Add `full_edit` action branch in the PATCH handler**

Open `src/app/api/purchase/orders/[id]/route.ts`. Find the destructuring line (line ~127):

```ts
const { action, deliveryDate, specialRequirements, approvalRemarks, status, followUpNotes } = body;
```

Replace it with:

```ts
const { action, deliveryDate, specialRequirements, approvalRemarks, status, followUpNotes, vendorId, currency, items: editItems } = body;
```

Then find the `else {` block that handles "Legacy: direct field updates" (line ~211) and **add a new `else if` branch before it**:

```ts
} else if (action === "full_edit") {
  // Full edit — only allowed in DRAFT
  if (existing.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only DRAFT purchase orders can be fully edited" },
      { status: 400 }
    );
  }
  if (!vendorId) {
    return NextResponse.json({ error: "Vendor is required" }, { status: 400 });
  }
  if (!editItems || !Array.isArray(editItems) || editItems.length === 0) {
    return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
  }

  const totalAmount = editItems.reduce(
    (sum: number, item: any) => sum + (parseFloat(item.amount) || 0),
    0
  );

  // Delete old items then recreate
  await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });

  await prisma.purchaseOrder.update({
    where: { id },
    data: {
      vendorId,
      currency: currency || "INR",
      ...(deliveryDate ? { deliveryDate: new Date(deliveryDate) } : {}),
      specialRequirements: specialRequirements || null,
      totalAmount,
      items: {
        create: editItems.map((item: any, idx: number) => ({
          sNo: idx + 1,
          product: item.product || null,
          material: item.material || null,
          additionalSpec: item.additionalSpec || null,
          sizeLabel: item.sizeLabel || null,
          quantity: parseFloat(item.quantity) || 0,
          unitRate: parseFloat(item.unitRate) || 0,
          amount: parseFloat(item.amount) || 0,
          deliveryDate: item.deliveryDate ? new Date(item.deliveryDate) : null,
          fittingId: item.fittingId || null,
          flangeId: item.flangeId || null,
        })),
      },
    },
  });

  await createAuditLog({
    entityType: "PURCHASE_ORDER",
    entityId: id,
    action: "UPDATE",
    userId: session.user.id,
    companyId,
    details: { action: "full_edit", vendorId, itemCount: editItems.length },
  });

  return NextResponse.json({ success: true });
```

- [ ] **Step 2: Verify the existing PATCH still works for workflow actions**

Start the dev server (`npm run dev`) and open an existing DRAFT PO. Submit it for approval — confirm it moves to PENDING_APPROVAL as before.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/purchase/orders/[id]/route.ts
git commit -m "feat: add full_edit action to PO PATCH API for DRAFT status"
```

---

## Task 2: Create PO edit page

**File:** `src/app/(dashboard)/purchase/orders/[id]/edit/page.tsx` *(create new)*

- [ ] **Step 1: Create the file**

Create `src/app/(dashboard)/purchase/orders/[id]/edit/page.tsx` with the following content:

```tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ProductMaterialSelect } from "@/components/shared/product-material-select";
import { FittingSelect } from "@/components/shared/fitting-select";
import { FlangeSelect } from "@/components/shared/flange-select";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { PageLoading } from "@/components/shared/page-loading";

type POItemCategory = "Pipe" | "Fitting" | "Flange";

interface POItem {
  itemCategory: POItemCategory;
  product: string;
  material: string;
  additionalSpec: string;
  sizeLabel: string;
  quantity: number;
  unitRate: number;
  amount: number;
  deliveryDate: string;
  fittingId: string;
  fittingLabel: string;
  flangeId: string;
  flangeLabel: string;
}

interface Vendor {
  id: string;
  name: string;
  city?: string;
}

export default function EditPOPageWrapper() {
  return (
    <Suspense fallback={<PageLoading />}>
      <EditPOPage />
    </Suspense>
  );
}

function EditPOPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const defaultDeliveryDate = format(
    new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    "yyyy-MM-dd"
  );

  const [formData, setFormData] = useState({
    vendorId: "",
    deliveryDate: defaultDeliveryDate,
    specialRequirements: "",
    currency: "INR",
  });

  const [items, setItems] = useState<POItem[]>([]);

  useEffect(() => {
    fetchVendors();
    fetchPO();
  }, [id]);

  const fetchVendors = async () => {
    try {
      const res = await fetch("/api/masters/vendors");
      if (res.ok) {
        const data = await res.json();
        setVendors(data.vendors || []);
      }
    } catch {
      console.error("Failed to fetch vendors");
    }
  };

  const fetchPO = async () => {
    try {
      const res = await fetch(`/api/purchase/orders/${id}`);
      if (!res.ok) throw new Error("Failed to load PO");
      const data = await res.json();
      const po = data.purchaseOrder;

      if (po.status !== "DRAFT") {
        toast.error("Only DRAFT purchase orders can be edited");
        router.push(`/purchase/orders/${id}`);
        return;
      }

      setFormData({
        vendorId: po.vendor?.id || "",
        deliveryDate: po.deliveryDate
          ? format(new Date(po.deliveryDate), "yyyy-MM-dd")
          : defaultDeliveryDate,
        specialRequirements: po.specialRequirements || "",
        currency: po.currency || "INR",
      });

      setItems(
        (po.items || []).map((item: any) => ({
          itemCategory: item.fittingId ? "Fitting" : item.flangeId ? "Flange" : "Pipe",
          product: item.product || "",
          material: item.material || "",
          additionalSpec: item.additionalSpec || "",
          sizeLabel: item.sizeLabel || "",
          quantity: parseFloat(item.quantity) || 0,
          unitRate: parseFloat(item.unitRate) || 0,
          amount: parseFloat(item.amount) || 0,
          deliveryDate: item.deliveryDate
            ? format(new Date(item.deliveryDate), "yyyy-MM-dd")
            : defaultDeliveryDate,
          fittingId: item.fittingId || "",
          fittingLabel: "",
          flangeId: item.flangeId || "",
          flangeLabel: "",
        }))
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to load purchase order");
      router.push(`/purchase/orders/${id}`);
    } finally {
      setFetching(false);
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        itemCategory: "Pipe",
        product: "",
        material: "",
        additionalSpec: "",
        sizeLabel: "",
        quantity: 0,
        unitRate: 0,
        amount: 0,
        deliveryDate: formData.deliveryDate,
        fittingId: "",
        fittingLabel: "",
        flangeId: "",
        flangeLabel: "",
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof POItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "quantity" || field === "unitRate") {
      const qty = field === "quantity" ? parseFloat(value) || 0 : updated[index].quantity;
      const rate = field === "unitRate" ? parseFloat(value) || 0 : updated[index].unitRate;
      updated[index].amount = qty * rate;
    }
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vendorId) { toast.error("Please select a vendor"); return; }
    if (items.length === 0) { toast.error("Please add at least one item"); return; }
    if (items.some((item) => !item.product || !item.quantity || !item.unitRate)) {
      toast.error("Please fill in product, quantity and unit rate for all items");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/purchase/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "full_edit",
          ...formData,
          items,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update PO");
      }
      toast.success("Purchase Order updated successfully");
      router.push(`/purchase/orders/${id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <PageLoading />;

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Purchase Order"
        description="Edit is only available while the PO is in DRAFT status"
      >
        <Button variant="outline" onClick={() => router.push(`/purchase/orders/${id}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>PO Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Vendor *</Label>
                <Select
                  value={formData.vendorId || "NONE"}
                  onValueChange={(v) => setFormData({ ...formData, vendorId: v === "NONE" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE" disabled>Select Vendor</SelectItem>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Expected Delivery Date</Label>
                <Input
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(v) => setFormData({ ...formData, currency: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="AED">AED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Special Requirements</Label>
              <Textarea
                value={formData.specialRequirements}
                onChange={(e) => setFormData({ ...formData, specialRequirements: e.target.value })}
                placeholder="Any special requirements or notes..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Item {index + 1}</span>
                  <div className="flex items-center gap-2">
                    <Select
                      value={item.itemCategory}
                      onValueChange={(v) => updateItem(index, "itemCategory", v as POItemCategory)}
                    >
                      <SelectTrigger className="w-28 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pipe">Pipe</SelectItem>
                        <SelectItem value="Fitting">Fitting</SelectItem>
                        <SelectItem value="Flange">Flange</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      className="h-8 w-8 text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {item.itemCategory === "Fitting" ? (
                  <FittingSelect
                    value={item.fittingId}
                    label={item.fittingLabel}
                    onChange={(id, label) => {
                      updateItem(index, "fittingId", id);
                      updateItem(index, "fittingLabel", label);
                      updateItem(index, "product", "Fitting");
                    }}
                  />
                ) : item.itemCategory === "Flange" ? (
                  <FlangeSelect
                    value={item.flangeId}
                    label={item.flangeLabel}
                    onChange={(id, label) => {
                      updateItem(index, "flangeId", id);
                      updateItem(index, "flangeLabel", label);
                      updateItem(index, "product", "Flange");
                    }}
                  />
                ) : (
                  <ProductMaterialSelect
                    product={item.product}
                    material={item.material}
                    additionalSpec={item.additionalSpec}
                    onProductChange={(v) => updateItem(index, "product", v)}
                    onMaterialChange={(v) => updateItem(index, "material", v)}
                    onAdditionalSpecChange={(v) => updateItem(index, "additionalSpec", v)}
                    showAdditionalSpec
                    onAutoFill={() => {}}
                  />
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Size</Label>
                    <Input
                      value={item.sizeLabel}
                      onChange={(e) => updateItem(index, "sizeLabel", e.target.value)}
                      placeholder="e.g. 2 inch"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Quantity</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.001"
                      value={item.quantity || ""}
                      onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Unit Rate</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitRate || ""}
                      onChange={(e) => updateItem(index, "unitRate", parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Amount</Label>
                    <Input
                      value={item.amount.toFixed(2)}
                      readOnly
                      className="h-8 text-sm bg-muted"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Item Delivery Date</Label>
                    <Input
                      type="date"
                      value={item.deliveryDate}
                      onChange={(e) => updateItem(index, "deliveryDate", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}

            {items.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No items added. Click "Add Item" to start.
              </div>
            )}

            <Separator />
            <div className="flex justify-end">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold">
                  {formData.currency} {totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/purchase/orders/${id}`)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Verify the page loads**

Navigate to `/purchase/orders/[any-draft-id]/edit` in the browser. Confirm it loads the PO data, shows the vendor, items, delivery date. Confirm navigating to an edit page for a non-DRAFT PO redirects back to the detail page with an error toast.

- [ ] **Step 3: Test edit and save**

Change the vendor, modify a line item rate, click Save. Confirm the detail page shows the updated values.

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/purchase/orders/[id]/edit/page.tsx
git commit -m "feat: add PO edit page for DRAFT status"
```

---

## Task 3: Add Edit button to PO detail page

**File:** `src/app/(dashboard)/purchase/orders/[id]/page.tsx`

- [ ] **Step 1: Add the Edit button**

Find the action buttons section in the `PageHeader` (line ~317):

```tsx
<div className="flex gap-2">
  <Button variant="outline" onClick={() => router.back()}>
    <ArrowLeft className="w-4 h-4 mr-2" />
    Back
  </Button>
  <Button variant="outline" onClick={handleDownloadPDF}>
```

Add the Edit button **after** Back and **before** Download PDF:

```tsx
<div className="flex gap-2">
  <Button variant="outline" onClick={() => router.back()}>
    <ArrowLeft className="w-4 h-4 mr-2" />
    Back
  </Button>
  {po.status === "DRAFT" && (
    <Button variant="outline" onClick={() => router.push(`/purchase/orders/${po.id}/edit`)}>
      <Edit className="w-4 h-4 mr-2" />
      Edit PO
    </Button>
  )}
  <Button variant="outline" onClick={handleDownloadPDF}>
```

- [ ] **Step 2: Verify**

Open a DRAFT PO detail page — confirm "Edit PO" button appears. Open a non-DRAFT PO — confirm button is absent.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/purchase/orders/[id]/page.tsx
git commit -m "feat: show Edit PO button on detail page when status is DRAFT"
```

---

## Task 4: Schema migration — add sourceTenderId

**File:** `prisma/schema.prisma`

- [ ] **Step 1: Add fields to schema**

Find the `Quotation` model in `prisma/schema.prisma`. Add these two lines alongside the existing optional relations (e.g. near `preparedById`):

```prisma
sourceTenderId String?
sourceTender   Tender? @relation("TenderQuotations", fields: [sourceTenderId], references: [id])
```

Find the `SalesOrder` model. Add:

```prisma
sourceTenderId String?
sourceTender   Tender? @relation("TenderSalesOrders", fields: [sourceTenderId], references: [id])
```

Find the `Tender` model. Add these two reverse relations (inside the model, alongside existing relations):

```prisma
quotations  Quotation[]  @relation("TenderQuotations")
salesOrders SalesOrder[] @relation("TenderSalesOrders")
```

- [ ] **Step 2: Run migration**

```bash
cd E:/freelance/erp-claude
npx prisma migrate dev --name add_tender_source_to_quotation_and_so
```

Expected output: migration created and applied, `✓ Generated Prisma Client`.

- [ ] **Step 3: Verify with Prisma Studio (optional)**

```bash
npx prisma studio
```

Open Quotation table — confirm `sourceTenderId` column exists and is nullable.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add sourceTenderId to Quotation and SalesOrder for tender linkage"
```

---

## Task 5: Update Quotation POST API to accept sourceTenderId

**File:** `src/app/api/quotations/route.ts`

- [ ] **Step 1: Destructure sourceTenderId from body**

Find the body destructuring block (around line 108 where `dealOwnerId` is):

```ts
      dealOwnerId,
      preparedById: preparedByIdBody,
      nextActionDate,
```

Add `sourceTenderId` to the same destructuring:

```ts
      dealOwnerId,
      preparedById: preparedByIdBody,
      sourceTenderId,
      nextActionDate,
```

- [ ] **Step 2: Pass it to prisma.quotation.create**

Find the `prisma.quotation.create` call (around line 180). In the `data` object, alongside `preparedById`:

```ts
        preparedById,
```

Add:

```ts
        preparedById,
        sourceTenderId: sourceTenderId || null,
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/quotations/route.ts
git commit -m "feat: accept sourceTenderId in quotation POST API"
```

---

## Task 6: Update Sales Order POST API to accept sourceTenderId

**File:** `src/app/api/sales-orders/route.ts`

- [ ] **Step 1: Find the POST handler and body destructuring**

Open `src/app/api/sales-orders/route.ts`. Find the `POST` function body destructuring. Add `sourceTenderId` to it:

```ts
const { ..., sourceTenderId } = body;
```

(Add it alongside any existing optional fields like `quotationId`, `projectName`, etc.)

- [ ] **Step 2: Pass it to prisma.salesOrder.create**

In the `prisma.salesOrder.create` data object, add:

```ts
sourceTenderId: sourceTenderId || null,
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/sales-orders/route.ts
git commit -m "feat: accept sourceTenderId in sales order POST API"
```

---

## Task 7: Update Tender GET API to include linked documents

**File:** `src/app/api/tenders/[id]/route.ts`

- [ ] **Step 1: Extend the `include` block in the GET handler**

Find the `prisma.tender.findUnique` call (line ~16). Extend its `include`:

```ts
const tender = await prisma.tender.findUnique({
  where: { id },
  include: {
    customer: { select: { id: true, name: true, city: true } },
    createdBy: { select: { name: true } },
    items: { orderBy: { sNo: "asc" } },
    documents: {
      orderBy: { uploadedAt: "desc" },
      include: { uploadedBy: { select: { name: true } } },
    },
    quotations: {
      select: { id: true, quotationNo: true, quotationDate: true, status: true, quotationCategory: true },
      orderBy: { quotationDate: "desc" },
    },
    salesOrders: {
      select: { id: true, soNo: true, soDate: true, status: true },
      orderBy: { soDate: "desc" },
    },
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/tenders/[id]/route.ts
git commit -m "feat: include linked quotations and sales orders in tender GET API"
```

---

## Task 8: Update Tender detail page — action buttons + linked docs

**File:** `src/app/(dashboard)/tenders/[id]/page.tsx`

This is the largest UI change. Read the current file first to find the exact interface and return JSX.

- [ ] **Step 1: Extend the Tender interface to include linked documents**

Find the `interface` or type definition for the tender data in the file. Add:

```ts
  quotations?: Array<{
    id: string;
    quotationNo: string;
    quotationDate: string;
    status: string;
    quotationCategory: string;
  }>;
  salesOrders?: Array<{
    id: string;
    soNo: string;
    soDate: string;
    status: string;
  }>;
```

- [ ] **Step 2: Add quotation type dialog state**

Near the top of the component function, add state for the quotation type dialog:

```tsx
const [quoteTypeDialogOpen, setQuoteTypeDialogOpen] = useState(false);
```

Make sure `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter` are imported from `@/components/ui/dialog` (they likely already are — check the existing imports).

Also import `useRouter` if not already imported:
```tsx
import { useRouter } from "next/navigation";
```
And add inside the component:
```tsx
const router = useRouter();
```

- [ ] **Step 3: Add action buttons when status is WON**

Find the section in the JSX where the tender status or header actions are rendered. Add the following block — place it in the page header action area or just below the status badge:

```tsx
{tender.status === "WON" && (
  <div className="flex gap-2 flex-wrap">
    <Button onClick={() => setQuoteTypeDialogOpen(true)}>
      Create Quotation
    </Button>
    <Button variant="outline" onClick={() => router.push(`/sales/create?tenderId=${tender.id}`)}>
      Create Sales Order
    </Button>
  </div>
)}

{/* Quotation type dialog */}
<Dialog open={quoteTypeDialogOpen} onOpenChange={setQuoteTypeDialogOpen}>
  <DialogContent className="max-w-sm">
    <DialogHeader>
      <DialogTitle>Choose Quotation Type</DialogTitle>
    </DialogHeader>
    <div className="flex flex-col gap-3 py-2">
      <Button
        onClick={() => {
          setQuoteTypeDialogOpen(false);
          router.push(`/quotations/create/standard?tenderId=${tender.id}`);
        }}
      >
        Standard Quotation
      </Button>
      <Button
        variant="outline"
        onClick={() => {
          setQuoteTypeDialogOpen(false);
          router.push(`/quotations/create/nonstandard?tenderId=${tender.id}`);
        }}
      >
        Non-Standard Quotation
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

- [ ] **Step 4: Add Linked Documents section at the bottom**

At the bottom of the page's JSX (before the closing `</div>`), add:

```tsx
{/* Linked Documents */}
{((tender.quotations && tender.quotations.length > 0) || (tender.salesOrders && tender.salesOrders.length > 0)) && (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">Linked Documents</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {tender.quotations && tender.quotations.length > 0 && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Quotations</p>
          <div className="space-y-2">
            {tender.quotations.map((q) => (
              <div
                key={q.id}
                className="flex items-center justify-between rounded border px-3 py-2 text-sm cursor-pointer hover:bg-muted"
                onClick={() => router.push(`/quotations/${q.id}`)}
              >
                <span className="font-medium">{q.quotationNo}</span>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span>{q.quotationCategory === "NON_STANDARD" ? "Non-Std" : "Std"}</span>
                  <span>{q.quotationDate ? new Date(q.quotationDate).toLocaleDateString("en-IN") : "—"}</span>
                  <Badge variant="outline">{q.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {tender.salesOrders && tender.salesOrders.length > 0 && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Sales Orders</p>
          <div className="space-y-2">
            {tender.salesOrders.map((so) => (
              <div
                key={so.id}
                className="flex items-center justify-between rounded border px-3 py-2 text-sm cursor-pointer hover:bg-muted"
                onClick={() => router.push(`/sales/${so.id}`)}
              >
                <span className="font-medium">{so.soNo}</span>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span>{so.soDate ? new Date(so.soDate).toLocaleDateString("en-IN") : "—"}</span>
                  <Badge variant="outline">{so.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </CardContent>
  </Card>
)}
```

Make sure `Badge` is imported from `@/components/ui/badge` and `Card, CardContent, CardHeader, CardTitle` from `@/components/ui/card`.

- [ ] **Step 5: Verify**

Open a WON tender — confirm "Create Quotation" and "Create Sales Order" buttons appear. Open a non-WON tender — confirm they're absent. Check the Linked Documents section renders when linked data exists.

- [ ] **Step 6: Commit**

```bash
git add src/app/(dashboard)/tenders/[id]/page.tsx
git commit -m "feat: add create quotation/SO buttons and linked docs to tender detail (WON status)"
```

---

## Task 9: Pre-fill quotation create pages from tender

**Files:**
- `src/app/(dashboard)/quotations/create/standard/page.tsx`
- `src/app/(dashboard)/quotations/create/nonstandard/page.tsx`

- [ ] **Step 1: Add tenderId to standard page formData state**

In `standard/page.tsx`, find the `formData` state (line ~137). Add `sourceTenderId`:

```ts
const [formData, setFormData] = useState({
  customerId: "",
  buyerId: "",
  ...
  dealOwnerId: "",
  preparedById: "",
  sourceTenderId: "",   // ← add this
  nextActionDate: "",
  ...
});
```

- [ ] **Step 2: Add tender pre-fill effect to standard page**

After the existing `useEffect` hooks in `standard/page.tsx`, add:

```tsx
// Pre-fill from tender if tenderId is in URL params
useEffect(() => {
  const tenderId = searchParams.get("tenderId");
  if (!tenderId) return;
  fetch(`/api/tenders/${tenderId}`)
    .then((r) => r.json())
    .then((tender) => {
      if (!tender?.id) return;
      setFormData((prev) => ({
        ...prev,
        customerId: tender.customerId || prev.customerId,
        kindAttention: tender.projectName || prev.kindAttention,
        sourceTenderId: tender.id,
      }));
      // Pre-fill items from tender items
      if (tender.items?.length > 0) {
        setItems(
          tender.items.map((ti: any) => ({
            ...emptyItem,
            product: ti.product || "",
            material: ti.material || "",
            additionalSpec: ti.additionalSpec || "",
            sizeLabel: ti.size || ti.sizeLabel || "",
            quantity: String(ti.quantity || ""),
            uom: ti.uom || "Mtr",
          }))
        );
      }
    })
    .catch(() => {});
}, []);
```

- [ ] **Step 3: Send sourceTenderId in the mutation body**

In the `createMutation.mutate({...})` call, `...formData` already spreads `sourceTenderId` because it's in the formData state. No additional change needed.

- [ ] **Step 4: Repeat for nonstandard page**

In `nonstandard/page.tsx`:

Add `sourceTenderId: ""` to the `formData` state (alongside `dealOwnerId`).

Add the same pre-fill `useEffect`:

```tsx
useEffect(() => {
  const tenderId = searchParams.get("tenderId");
  if (!tenderId) return;
  fetch(`/api/tenders/${tenderId}`)
    .then((r) => r.json())
    .then((tender) => {
      if (!tender?.id) return;
      setFormData((prev) => ({
        ...prev,
        customerId: tender.customerId || prev.customerId,
        kindAttention: tender.projectName || prev.kindAttention,
        sourceTenderId: tender.id,
      }));
      if (tender.items?.length > 0) {
        setItems(
          tender.items.map((ti: any) => ({
            ...emptyItem,
            itemDescription: [ti.product, ti.material, ti.additionalSpec, ti.size || ti.sizeLabel]
              .filter(Boolean)
              .join(" "),
            material: ti.material || "",
            quantity: String(ti.quantity || ""),
            uom: ti.uom || "Mtr",
          }))
        );
      }
    })
    .catch(() => {});
}, []);
```

- [ ] **Step 5: Verify**

From a WON tender, click "Create Quotation → Standard". The quotation create form should open with the customer pre-selected and items pre-filled. Save the quotation and navigate back to the tender — it should appear in the Linked Documents section.

- [ ] **Step 6: Commit**

```bash
git add src/app/(dashboard)/quotations/create/standard/page.tsx
git add src/app/(dashboard)/quotations/create/nonstandard/page.tsx
git commit -m "feat: pre-fill quotation create pages from tender via tenderId URL param"
```

---

## Task 10: Pre-fill Sales Order create page from tender

**File:** `src/app/(dashboard)/sales/create/page.tsx`

- [ ] **Step 1: Read tenderId from URL and add sourceTenderId to formData**

In `create/page.tsx`, find the `formData` state:

```ts
const [formData, setFormData] = useState({
  customerId: "",
  quotationId: "",
  customerPoNo: "",
  customerPoDate: "",
  customerPoDocument: "",
  projectName: "",
  deliverySchedule: "",
  paymentTerms: "",
});
```

Add `sourceTenderId`:

```ts
const [formData, setFormData] = useState({
  customerId: "",
  quotationId: "",
  customerPoNo: "",
  customerPoDate: "",
  customerPoDocument: "",
  projectName: "",
  deliverySchedule: "",
  paymentTerms: "",
  sourceTenderId: "",   // ← add this
});
```

- [ ] **Step 2: Add tender pre-fill effect**

After the existing `useEffect` calls, add:

```tsx
// Pre-fill from tender if tenderId is in URL params
useEffect(() => {
  const tenderId = searchParams.get("tenderId");
  if (!tenderId) return;
  fetch(`/api/tenders/${tenderId}`)
    .then((r) => r.json())
    .then((tender) => {
      if (!tender?.id) return;
      setFormData((prev) => ({
        ...prev,
        customerId: tender.customerId || prev.customerId,
        projectName: tender.projectName || prev.projectName,
        sourceTenderId: tender.id,
      }));
    })
    .catch(() => {});
}, []);
```

Make sure `searchParams` is already available in this component (it uses `useSearchParams()` — check the existing code; `preselectedQuotationId` already uses it so `searchParams` is available).

- [ ] **Step 3: Send sourceTenderId in the submit payload**

Find the `handleSubmit` function. In the fetch body JSON, add `sourceTenderId`:

```ts
body: JSON.stringify({
  ...formData,
  items,
}),
```

Since `sourceTenderId` is part of `formData` and the body uses `...formData`, it's automatically included. No extra change needed.

- [ ] **Step 4: Verify**

From a WON tender, click "Create Sales Order". The SO create form should open with the customer and project name pre-filled. Save the SO and navigate back to the tender — it should appear in the Linked Documents section.

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/sales/create/page.tsx
git commit -m "feat: pre-fill sales order create page from tender via tenderId URL param"
```

---

## Self-Review Checklist

- [x] PO edit: PATCH API guards on DRAFT ✓, edit page redirects non-DRAFT ✓, Edit button only in DRAFT ✓
- [x] Tender buttons: only shown when `tender.status === "WON"` ✓
- [x] Schema: `sourceTenderId` optional on both Quotation and SalesOrder, reverse on Tender ✓
- [x] Quotation create pages: both standard and nonstandard handle `tenderId` param ✓
- [x] SO create page: handles `tenderId` param, spreads `sourceTenderId` through `...formData` ✓
- [x] Linked Documents section: shown conditionally when data exists ✓
- [x] API accepts `sourceTenderId` on both Quotation POST and SalesOrder POST ✓
- [x] Tender GET now includes `quotations` and `salesOrders` in response ✓
