"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toDateInput } from "@/lib/dates";
import { followCurrencyTerm } from "@/lib/quotations/currency";
import { PageLoading } from "@/components/shared/page-loading";
import { useCustomers } from "@/hooks/use-masters";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Save, Plus, Trash2, ListChecks, ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface Customer {
  id: string;
  name: string;
}

interface TenderItem {
  product: string;
  material: string;
  // No input for it on this form; carried so an edit does not wipe it.
  additionalSpec: string;
  sizeLabel: string;
  quantity: string;
  uom: string;
  estimatedRate: string;
  amount: string;
  remarks: string;
}

const emptyItem = (): TenderItem => ({
  product: "",
  material: "",
  additionalSpec: "",
  sizeLabel: "",
  quantity: "",
  uom: "",
  estimatedRate: "",
  amount: "",
  remarks: "",
});

// One Terms & Conditions row, as on the quotation forms: rows from the Offer
// Terms list (or the customer's defaults) can only be ticked and given a
// value; isCustom rows ("Add Custom Term") can also be renamed and removed.
interface TenderTerm {
  termName: string;
  termValue: string;
  isIncluded: boolean;
  isCustom: boolean;
}

// A tender has no market-type field: an INR tender takes the Domestic offer
// terms, any other currency the Export ones.
const termsTypeFor = (currency: string) => (currency === "INR" ? "DOMESTIC" : "EXPORT");

export default function CreateTenderPageWrapper() {
  return (
    <Suspense fallback={<PageLoading />}>
      <CreateTenderPage />
    </Suspense>
  );
}

// Also the edit screen: /tenders/create?editId=<id> loads the tender, and
// saving sends a PATCH that replaces the header fields and every BOQ line.
function CreateTenderPage() {
  const router = useRouter();
  const editId = useSearchParams().get("editId");
  const [editTenderNo, setEditTenderNo] = useState<string | null>(null);

  // Basic Info
  const [tenderSource, setTenderSource] = useState("");
  const [organization, setOrganization] = useState("");
  const [tenderRef, setTenderRef] = useState("");
  const [closingDate, setClosingDate] = useState("");
  const [openingDate, setOpeningDate] = useState("");

  // Project Details
  const [projectName, setProjectName] = useState("");
  const [location, setLocation] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [customerId, setCustomerId] = useState("");
  // Shared customer master. This screen used to fetch it and then test
  // `Array.isArray(data)` — but the route answers { customers: [...] }, never a
  // bare array, so the check was always false and the dropdown was permanently
  // empty. The hook unwraps the right key.
  const customers = useCustomers<Customer>();

  // EMD
  const [emdRequired, setEmdRequired] = useState(false);
  const [emdAmount, setEmdAmount] = useState("");
  const [emdType, setEmdType] = useState("");

  // Items
  const [items, setItems] = useState<TenderItem[]>([emptyItem()]);

  // Remarks
  const [remarks, setRemarks] = useState("");

  // Terms & Conditions
  const [terms, setTerms] = useState<TenderTerm[]>([]);
  const [showTerms, setShowTerms] = useState(false);
  // "DOMESTIC|<customerId>": the default list the terms came from. Picking
  // another customer, or moving between INR and another currency, reloads the
  // defaults, as on the quotation forms. Edit mode sets it from the saved
  // tender so its own terms are kept.
  const termsKeyRef = useRef<string | null>(null);
  // Edit mode: no defaults until the saved tender has been applied.
  const [editLoaded, setEditLoaded] = useState(!editId);
  // The currency the Currency term was last set for. The edit load sets it
  // too, so applying a saved tender's currency does not rewrite its terms.
  const termCurrencyRef = useRef(currency);

  const [saving, setSaving] = useState(false);

  // Tenders draw their number from the quotation series, so the quotation
  // preview endpoint shows the number this tender will get. null = loading;
  // "" = preview unavailable (the real number is still assigned on save).
  const [previewNumber, setPreviewNumber] = useState<string | null>(null);

  // Edit mode: load the tender once and seed every field and the item grid.
  useEffect(() => {
    if (!editId) return;
    fetch(`/api/tenders/${editId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Tender not found"))))
      .then((t) => {
        setEditTenderNo(t.tenderNo);
        setTenderSource(t.tenderSource || "");
        setOrganization(t.organization || "");
        setTenderRef(t.tenderRef || "");
        setClosingDate(toDateInput(t.closingDate));
        setOpeningDate(toDateInput(t.openingDate));
        setProjectName(t.projectName || "");
        setLocation(t.location || "");
        setEstimatedValue(t.estimatedValue != null ? String(t.estimatedValue) : "");
        termCurrencyRef.current = t.currency || "INR";
        setCurrency(t.currency || "INR");
        setCustomerId(t.customerId || "");
        setEmdRequired(!!t.emdRequired);
        setEmdAmount(t.emdAmount != null ? String(t.emdAmount) : "");
        setEmdType(t.emdType || "");
        setRemarks(t.remarks || "");
        type LoadedItem = { product?: string; material?: string; additionalSpec?: string; sizeLabel?: string; quantity?: number; uom?: string; estimatedRate?: number | null; amount?: number | null; remarks?: string };
        const loaded: TenderItem[] = (t.items || []).map((i: LoadedItem) => ({
          product: i.product || "",
          material: i.material || "",
          additionalSpec: i.additionalSpec || "",
          sizeLabel: i.sizeLabel || "",
          quantity: i.quantity != null ? String(i.quantity) : "",
          uom: i.uom || "",
          estimatedRate: i.estimatedRate != null ? String(i.estimatedRate) : "",
          amount: i.amount != null ? Number(i.amount).toFixed(2) : "",
          remarks: i.remarks || "",
        }));
        setItems(loaded.length ? loaded : [emptyItem()]);
        const saved: TenderTerm[] = (t.terms || []).map((x: TenderTerm) => ({
          termName: x.termName,
          termValue: x.termValue,
          isIncluded: x.isIncluded,
          isCustom: x.isCustom,
        }));
        // A tender saved before it had terms gets the defaults instead.
        if (saved.length) {
          setTerms(saved);
          termsKeyRef.current = `${termsTypeFor(t.currency || "INR")}|${t.customerId || ""}`;
        }
        setEditLoaded(true);
      })
      .catch((e) => toast.error(e.message || "Failed to load tender"));
  }, [editId]);

  // Default terms: the customer's saved list first, else the Offer Terms list
  // for the market — the same order as the quotation forms.
  useEffect(() => {
    if (!editLoaded) return;
    const type = termsTypeFor(currency);
    const key = `${type}|${customerId}`;
    if (termsKeyRef.current === key) return;
    termsKeyRef.current = key;
    (async () => {
      let rows: TenderTerm[] = [];
      if (customerId) {
        rows = await fetch(`/api/masters/customers/${customerId}/terms?quotationType=${type}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d) =>
            (d?.terms ?? []).map((x: { termName: string; termValue: string | null; isIncluded: boolean | null }) => ({
              termName: x.termName,
              termValue: x.termValue || "",
              isIncluded: x.isIncluded ?? true,
              isCustom: false,
            }))
          )
          .catch(() => []);
      }
      if (!rows.length) {
        const res = await fetch(`/api/offer-term-templates?quotationType=${type}`);
        const data = res.ok ? await res.json() : null;
        rows = (data?.templates ?? []).map((x: { termName: string; termDefaultValue: string | null }) => ({
          termName: x.termName,
          termValue: x.termDefaultValue || "",
          isIncluded: true,
          isCustom: false,
        }));
      }
      // Dropped if the customer changed meanwhile, or the currency moved
      // between INR and another one. The Currency row takes the latest
      // currency: the Export defaults say "USD ($)" even on a EUR tender.
      if (termsKeyRef.current === key) setTerms(followCurrencyTerm(rows, termCurrencyRef.current));
    })().catch(() => {});
  }, [editLoaded, currency, customerId]);

  // A currency change that keeps the same list (USD to EUR) reloads nothing,
  // so the Currency row is rewritten here, as on the quotation forms.
  useEffect(() => {
    if (termCurrencyRef.current === currency) return;
    termCurrencyRef.current = currency;
    setTerms((prev) => followCurrencyTerm(prev, currency));
  }, [currency]);

  useEffect(() => {
    if (editId) return;
    fetch("/api/quotations/preview-number")
      .then((r) => r.json())
      .then((data) => setPreviewNumber(data?.previewNumber || ""))
      .catch(() => setPreviewNumber(""));
  }, [editId]);

  function updateItem(index: number, field: keyof TenderItem, value: string) {
    setItems((prev) => {
      const updated = prev.map((item, i) => {
        if (i !== index) return item;
        const next = { ...item, [field]: value };
        if (field === "quantity" || field === "estimatedRate") {
          const qty = parseFloat(field === "quantity" ? value : item.quantity) || 0;
          const rate = parseFloat(field === "estimatedRate" ? value : item.estimatedRate) || 0;
          next.amount = qty && rate ? (qty * rate).toFixed(2) : "";
        }
        return next;
      });
      return updated;
    });
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateTerm(index: number, patch: Partial<TenderTerm>) {
    setTerms((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  function addCustomTerm() {
    setTerms((prev) => [...prev, { termName: "", termValue: "", isIncluded: true, isCustom: true }]);
  }

  function removeTerm(index: number) {
    setTerms((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        tenderSource: tenderSource || null,
        organization: organization || null,
        tenderRef: tenderRef || null,
        closingDate: closingDate || null,
        openingDate: openingDate || null,
        projectName: projectName || null,
        location: location || null,
        estimatedValue: estimatedValue || null,
        currency,
        customerId: customerId || null,
        emdRequired,
        emdAmount: emdRequired ? emdAmount || null : null,
        emdType: emdRequired ? emdType || null : null,
        remarks: remarks || null,
        items: items
          .filter((item) => item.product || item.material || item.quantity)
          .map((item) => ({
            product: item.product || null,
            material: item.material || null,
            additionalSpec: item.additionalSpec || null,
            sizeLabel: item.sizeLabel || null,
            quantity: parseFloat(item.quantity) || 0,
            uom: item.uom || null,
            estimatedRate: item.estimatedRate || null,
            remarks: item.remarks || null,
          })),
        // Always sent, even empty: on edit it replaces the saved list.
        terms,
      };

      const res = await fetch(editId ? `/api/tenders/${editId}` : "/api/tenders", {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || (editId ? "Failed to update tender" : "Failed to create tender"));
      }

      const data = await res.json();
      toast.success(editId ? "Tender updated" : "Tender created successfully");
      router.push(`/tenders/${data.id}`);
    } catch (error: any) {
      toast.error(error.message || (editId ? "Failed to update tender" : "Failed to create tender"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={editId ? "Edit Tender" : "Create Tender"}
        description={editId ? `Edit ${editTenderNo ?? "tender"}` : "Register a new tender"}
      >
        <Button variant="outline" onClick={() => router.push(editId ? `/tenders/${editId}` : "/tenders")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Tender No.</Label>
                <Input
                  value={editId ? editTenderNo ?? "" : previewNumber ?? ""}
                  placeholder={editId ? "Loading…" : previewNumber === null ? "Generating…" : "Assigned on save"}
                  readOnly
                  className="bg-muted"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Tender Source</Label>
                <Select value={tenderSource} onValueChange={setTenderSource}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GeM">GeM</SelectItem>
                    <SelectItem value="BHEL">BHEL</SelectItem>
                    <SelectItem value="NTPC">NTPC</SelectItem>
                    <SelectItem value="IOCL">IOCL</SelectItem>
                    <SelectItem value="Private">Private</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="organization">Organization</Label>
                <Input
                  id="organization"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="e.g. NTPC Ltd."
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tenderRef">Tender Ref</Label>
                <Input
                  id="tenderRef"
                  value={tenderRef}
                  onChange={(e) => setTenderRef(e.target.value)}
                  placeholder="Client's reference number"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="closingDate">Closing Date</Label>
                <Input
                  id="closingDate"
                  type="date"
                  value={closingDate}
                  onChange={(e) => setClosingDate(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="openingDate">Opening Date</Label>
                <Input
                  id="openingDate"
                  type="date"
                  value={openingDate}
                  onChange={(e) => setOpeningDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Project Details */}
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="projectName">Project Name</Label>
                <Input
                  id="projectName"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Project name"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Project location"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="estimatedValue">Estimated Value</Label>
                <Input
                  id="estimatedValue"
                  type="number"
                  min="0"
                  step="0.01"
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Customer (Optional)</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* EMD Details */}
        <Card>
          <CardHeader>
            <CardTitle>EMD Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Switch
                  id="emdRequired"
                  checked={emdRequired}
                  onCheckedChange={setEmdRequired}
                />
                <Label htmlFor="emdRequired">EMD Required</Label>
              </div>

              {emdRequired && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="emdAmount">EMD Amount</Label>
                    <Input
                      id="emdAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={emdAmount}
                      onChange={(e) => setEmdAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label>EMD Type</Label>
                    <Select value={emdType} onValueChange={setEmdType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BG">BG (Bank Guarantee)</SelectItem>
                        <SelectItem value="DD">DD (Demand Draft)</SelectItem>
                        <SelectItem value="Online">Online</SelectItem>
                        <SelectItem value="FDR">FDR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Items</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">S.No</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="w-24">Qty</TableHead>
                    <TableHead className="w-24">UOM</TableHead>
                    <TableHead className="w-32">Est. Rate</TableHead>
                    <TableHead className="w-32">Amount</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-center text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.product}
                          onChange={(e) => updateItem(index, "product", e.target.value)}
                          placeholder="Product"
                          className="min-w-[120px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.material}
                          onChange={(e) => updateItem(index, "material", e.target.value)}
                          placeholder="Material"
                          className="min-w-[100px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.sizeLabel}
                          onChange={(e) => updateItem(index, "sizeLabel", e.target.value)}
                          placeholder="Size"
                          className="min-w-[80px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.001"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", e.target.value)}
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.uom}
                          onChange={(e) => updateItem(index, "uom", e.target.value)}
                          placeholder="Nos"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.estimatedRate}
                          onChange={(e) => updateItem(index, "estimatedRate", e.target.value)}
                          placeholder="0.00"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.amount}
                          readOnly
                          placeholder="0.00"
                          className="bg-muted cursor-default"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.remarks}
                          onChange={(e) => updateItem(index, "remarks", e.target.value)}
                          placeholder="Remarks"
                          className="min-w-[100px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Terms & Conditions — the quotation forms' card. Shown without a
            customer, since a tender's customer is optional. */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowTerms((v) => !v)}
                className="flex items-center gap-2 text-base font-semibold hover:text-primary transition-colors"
              >
                <ListChecks className="h-4 w-4 text-primary" />
                Terms & Conditions
                <ChevronDown className={`h-4 w-4 transition-transform ${showTerms ? "rotate-180" : ""}`} />
                <span className="text-xs text-muted-foreground font-normal ml-1">
                  ({terms.filter((t) => t.isIncluded).length} included)
                </span>
              </button>
              {showTerms && (
                <Button type="button" variant="outline" size="sm" onClick={addCustomTerm}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Custom Term
                </Button>
              )}
            </div>
          </CardHeader>
          {showTerms && (
            <CardContent>
              <div className="space-y-0.5">
                {terms.map((term, index) => (
                  <div key={index} className="flex gap-3 items-start rounded-md py-0.5 px-2 hover:bg-muted/40 transition-colors">
                    <Checkbox
                      checked={term.isIncluded}
                      onCheckedChange={() => updateTerm(index, { isIncluded: !term.isIncluded })}
                      className="mt-1"
                    />
                    <div className="flex-1 grid grid-cols-[180px_1fr] gap-3 items-start">
                      {term.isCustom ? (
                        <Input
                          value={term.termName}
                          onChange={(e) => updateTerm(index, { termName: e.target.value })}
                          placeholder="Term name"
                          maxLength={191}
                          className={!term.isIncluded ? "opacity-50" : ""}
                        />
                      ) : (
                        <p className={`text-sm font-medium pt-2 ${!term.isIncluded ? "opacity-50" : ""}`}>
                          {term.termName}
                        </p>
                      )}
                      <Input
                        value={term.termValue}
                        onChange={(e) => updateTerm(index, { termValue: e.target.value })}
                        placeholder="Term value..."
                        maxLength={191}
                        className={!term.isIncluded ? "opacity-50" : ""}
                      />
                    </div>
                    {term.isCustom && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTerm(index)}
                        className="text-destructive hover:text-destructive mt-1 shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Remarks */}
        <Card>
          <CardHeader>
            <CardTitle>Remarks</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Any additional remarks or notes..."
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(editId ? `/tenders/${editId}` : "/tenders")}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : editId ? "Save Changes" : "Create Tender"}
          </Button>
        </div>
      </form>
    </div>
  );
}
