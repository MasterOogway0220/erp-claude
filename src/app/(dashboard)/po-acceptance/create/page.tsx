"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, FileCheck, Users, RefreshCw, Mail, Send, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { format } from "date-fns";
import { PageLoading } from "@/components/shared/page-loading";
import { computePOTotals } from "@/lib/calc/po-totals";

interface ClientPO {
  id: string;
  cpoNo: string;
  cpoDate: string;
  clientPoNumber: string;
  clientPoDate: string | null;
  projectName: string | null;
  contactPerson: string | null;
  paymentTerms: string | null;
  deliveryTerms: string | null;
  currency: string;
  grandTotal: number | null;
  status: string;
  customer: { id: string; name: string; city: string | null };
  quotation: { id: string; quotationNo: string };
}

interface CustomerContact {
  id: string;
  contactName: string;
  designation: string | null;
  email: string | null;
  phone: string | null;
  department: string;
}

interface CpoItem {
  id: string;
  sNo: number;
  description: string;
  qtyOrdered: number;
  unitRate: number;
  amount: number;
}

/** Step labels for the 3-step wizard */
const STEP_LABELS = [
  "Details & Contacts",
  "Charges & Commercials",
  "Review & Submit",
] as const;

function CreatePOAcceptanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCpoId = searchParams.get("cpoId");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clientPOs, setClientPOs] = useState<ClientPO[]>([]);
  const [selectedCPO, setSelectedCPO] = useState<ClientPO | null>(null);
  const [contacts, setContacts] = useState<CustomerContact[]>([]);

  /** CPO detail — seeded from the CPO when it is selected */
  const [cpoItems, setCpoItems] = useState<CpoItem[]>([]);
  const [cpoCurrency, setCpoCurrency] = useState<string>("INR");
  const [cpoIsDomesticDelivery, setCpoIsDomesticDelivery] = useState<boolean>(false);

  /** Wizard step (1-indexed) */
  const [step, setStep] = useState(1);

  /** Preview / email drawer state (Step 3 submit) */
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMeta, setPreviewMeta] = useState<{ pdfUrl: string } | null>(null);
  const [emailTo, setEmailTo] = useState("");
  const [emailCc, setEmailCc] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [sending, setSending] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const [form, setForm] = useState({
    clientPurchaseOrderId: "",
    acceptanceDate: format(new Date(), "yyyy-MM-dd"),
    committedDeliveryDate: "",
    acceptanceDetails: "",
    remarks: "",
    followUpName: "",
    followUpEmail: "",
    followUpPhone: "",
    qualityName: "",
    qualityEmail: "",
    qualityPhone: "",
    accountsName: "",
    accountsEmail: "",
    accountsPhone: "",
    // Charge fields (Step 2) — seeded from CPO on selection
    gstRate: 18,
    isInterState: false,
    freight: 0,
    freightTaxApplicable: false,
    packingForwarding: 0,
    packingTaxApplicable: false,
    insurance: 0,
    insuranceTaxApplicable: false,
    otherCharges: 0,
    otherChargesTaxApplicable: false,
    testingCharges: 0,
    testingTaxApplicable: false,
    tpiCharges: 0,
    tpiTaxApplicable: false,
    // Computed totals (synced from useMemo)
    subtotal: 0,
    additionalChargesTotal: 0,
    taxableAmount: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    roundOff: 0,
    grandTotal: 0,
  });

  useEffect(() => {
    fetchClientPOs();
  }, []);

  useEffect(() => {
    if (preselectedCpoId && clientPOs.length > 0) {
      const cpo = clientPOs.find((c) => c.id === preselectedCpoId);
      if (cpo) {
        setSelectedCPO(cpo);
        setForm((prev) => ({ ...prev, clientPurchaseOrderId: cpo.id }));
        fetchContacts(cpo.customer.id);
        fetchCpoDetail(cpo.id);
      }
    }
  }, [preselectedCpoId, clientPOs]);

  const fetchClientPOs = async () => {
    try {
      const response = await fetch("/api/client-purchase-orders?status=REGISTERED");
      if (response.ok) {
        const data = await response.json();
        // Filter out CPOs that already have acceptance
        const cpos = (data.clientPOs || data || []).filter(
          (c: any) => c.status === "REGISTERED"
        );
        setClientPOs(cpos);
      }
    } catch (error) {
      console.error("Failed to fetch CPOs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async (customerId: string) => {
    try {
      const response = await fetch(
        `/api/masters/customer-contacts?customerId=${customerId}`
      );
      if (response.ok) {
        setContacts(await response.json());
      }
    } catch (error) {
      console.error("Failed to fetch contacts:", error);
    }
  };

  const fetchCpoDetail = async (cpoId: string) => {
    try {
      const res = await fetch(`/api/client-purchase-orders/${cpoId}`);
      if (!res.ok) return;
      const data = await res.json();

      // Store CPO context for totals computation
      setCpoItems(
        (data.items ?? []).map((item: any) => ({
          id: item.id,
          sNo: item.sNo,
          description: item.description ?? "",
          qtyOrdered: Number(item.qtyOrdered ?? 0),
          unitRate: Number(item.unitRate ?? 0),
          amount: Number(item.amount ?? 0),
        }))
      );
      setCpoCurrency(data.currency ?? "INR");
      setCpoIsDomesticDelivery(Boolean(data.isDomesticDelivery));

      // Seed charge fields from CPO values
      setForm((prev) => ({
        ...prev,
        gstRate: data.gstRate !== null && data.gstRate !== undefined ? Number(data.gstRate) : prev.gstRate,
        isInterState: Boolean(data.isInterState ?? prev.isInterState),
        freight: data.freight !== null && data.freight !== undefined ? Number(data.freight) : prev.freight,
        freightTaxApplicable: Boolean(data.freightTaxApplicable ?? prev.freightTaxApplicable),
        packingForwarding: data.packingForwarding !== null && data.packingForwarding !== undefined ? Number(data.packingForwarding) : prev.packingForwarding,
        packingTaxApplicable: Boolean(data.packingTaxApplicable ?? prev.packingTaxApplicable),
        insurance: data.insurance !== null && data.insurance !== undefined ? Number(data.insurance) : prev.insurance,
        insuranceTaxApplicable: Boolean(data.insuranceTaxApplicable ?? prev.insuranceTaxApplicable),
        otherCharges: data.otherCharges !== null && data.otherCharges !== undefined ? Number(data.otherCharges) : prev.otherCharges,
        otherChargesTaxApplicable: Boolean(data.otherChargesTaxApplicable ?? prev.otherChargesTaxApplicable),
        testingCharges: data.testingCharges !== null && data.testingCharges !== undefined ? Number(data.testingCharges) : prev.testingCharges,
        testingTaxApplicable: Boolean(data.testingTaxApplicable ?? prev.testingTaxApplicable),
        tpiCharges: data.tpiCharges !== null && data.tpiCharges !== undefined ? Number(data.tpiCharges) : prev.tpiCharges,
        tpiTaxApplicable: Boolean(data.tpiTaxApplicable ?? prev.tpiTaxApplicable),
      }));
    } catch (error) {
      console.error("Failed to fetch CPO detail:", error);
    }
  };

  const handleCPOSelect = (cpoId: string) => {
    const cpo = clientPOs.find((c) => c.id === cpoId);
    if (cpo) {
      setSelectedCPO(cpo);
      setForm((prev) => ({ ...prev, clientPurchaseOrderId: cpo.id }));
      fetchContacts(cpo.customer.id);
      fetchCpoDetail(cpo.id);
    }
  };

  const fillContactFromDirectory = (
    department: string,
    contact: CustomerContact
  ) => {
    if (department === "FOLLOW_UP") {
      setForm((prev) => ({
        ...prev,
        followUpName: contact.contactName,
        followUpEmail: contact.email || "",
        followUpPhone: contact.phone || "",
      }));
    } else if (department === "QUALITY_INSPECTION") {
      setForm((prev) => ({
        ...prev,
        qualityName: contact.contactName,
        qualityEmail: contact.email || "",
        qualityPhone: contact.phone || "",
      }));
    } else if (department === "ACCOUNTS") {
      setForm((prev) => ({
        ...prev,
        accountsName: contact.contactName,
        accountsEmail: contact.email || "",
        accountsPhone: contact.phone || "",
      }));
    }
  };

  const autoFillAllContacts = () => {
    const followUp = contacts.find((c) => c.department === "FOLLOW_UP");
    const quality = contacts.find((c) => c.department === "QUALITY_INSPECTION");
    const accounts = contacts.find((c) => c.department === "ACCOUNTS");

    setForm((prev) => ({
      ...prev,
      followUpName: followUp?.contactName || prev.followUpName,
      followUpEmail: followUp?.email || prev.followUpEmail,
      followUpPhone: followUp?.phone || prev.followUpPhone,
      qualityName: quality?.contactName || prev.qualityName,
      qualityEmail: quality?.email || prev.qualityEmail,
      qualityPhone: quality?.phone || prev.qualityPhone,
      accountsName: accounts?.contactName || prev.accountsName,
      accountsEmail: accounts?.email || prev.accountsEmail,
      accountsPhone: accounts?.phone || prev.accountsPhone,
    }));

    toast.success("Contacts auto-filled from directory");
  };

  const handleSubmit = async () => {
    if (!form.clientPurchaseOrderId) {
      toast.error("Please select a Client Purchase Order");
      return;
    }
    if (!form.acceptanceDate) {
      toast.error("Acceptance date is required");
      return;
    }
    if (!form.committedDeliveryDate) {
      toast.error("Committed delivery date is required");
      return;
    }

    setSaving(true);
    try {
      // Step 1: Create the acceptance record
      const response = await fetch("/api/po-acceptance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Failed to create acceptance");
        return;
      }

      const data = await response.json();
      const newId: string = data.id;
      toast.success(`PO Acceptance ${data.acceptanceNo} created`);

      // Step 2: Finalize — auto-generate PDF and mark ISSUED
      const finalizeRes = await fetch(`/api/po-acceptance/${newId}/finalize`, {
        method: "POST",
      });

      if (!finalizeRes.ok) {
        // Finalize failed — still navigate to the detail page
        toast.error("PDF generation failed. You can retry from the acceptance page.");
        router.push(`/po-acceptance/${newId}`);
        return;
      }

      const finalizeData = await finalizeRes.json();

      // Step 3: Open the preview/email drawer
      setCreatedId(newId);
      setPreviewMeta({ pdfUrl: finalizeData.pdfUrl });
      setEmailTo(finalizeData.suggestedRecipient ?? "");
      setEmailSubject(finalizeData.suggestedSubject ?? "");
      setPreviewOpen(true);
    } catch (error) {
      toast.error("Failed to create acceptance");
    } finally {
      setSaving(false);
    }
  };

  const handleSendEmail = async () => {
    if (!createdId) return;
    setSending(true);
    try {
      const res = await fetch(`/api/po-acceptance/${createdId}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emailTo,
          cc: emailCc || undefined,
          subject: emailSubject || undefined,
        }),
      });
      if (res.ok) {
        toast.success("Email sent successfully");
        setPreviewOpen(false);
        router.push(`/po-acceptance/${createdId}`);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to send email");
      }
    } catch {
      toast.error("Failed to send email");
    } finally {
      setSending(false);
    }
  };

  const contactsByDept = (dept: string) =>
    contacts.filter((c) => c.department === dept);

  /** Compute PO totals from CPO items + current charge form fields */
  const totals = useMemo(
    () =>
      computePOTotals({
        items: cpoItems.map((i) => ({
          qty: Number(i.qtyOrdered),
          unitRate: Number(i.unitRate),
        })),
        currency: (cpoCurrency ?? "INR") as "INR" | "USD",
        isInternational: cpoCurrency === "USD",
        isDomesticDelivery: Boolean(cpoIsDomesticDelivery),
        gstRate: Number(form.gstRate ?? 0),
        isInterState: Boolean(form.isInterState),
        charges: {
          freight: Number(form.freight ?? 0),
          packing: Number(form.packingForwarding ?? 0),
          insurance: Number(form.insurance ?? 0),
          other: Number(form.otherCharges ?? 0),
          testing: Number(form.testingCharges ?? 0),
          tpi: Number(form.tpiCharges ?? 0),
        },
      }),
    [
      cpoItems,
      cpoCurrency,
      cpoIsDomesticDelivery,
      form.gstRate,
      form.isInterState,
      form.freight,
      form.packingForwarding,
      form.insurance,
      form.otherCharges,
      form.testingCharges,
      form.tpiCharges,
    ]
  );

  /** Sync computed totals into form so they're included in the submit payload */
  useEffect(() => {
    const grandTotalRaw = totals.taxableAmount + totals.cgst + totals.sgst + totals.igst;
    const roundOff = +(Math.round(grandTotalRaw) - grandTotalRaw).toFixed(2);
    setForm((prev) => ({
      ...prev,
      subtotal: totals.subtotal,
      additionalChargesTotal: totals.additionalChargesTotal,
      taxableAmount: totals.taxableAmount,
      cgst: totals.cgst,
      sgst: totals.sgst,
      igst: totals.igst,
      roundOff,
      grandTotal: totals.grandTotal,
    }));
  }, [totals]);

  /** GST applies when: INR currency, OR international but domestic delivery */
  const gstApplies = cpoCurrency === "INR" || cpoIsDomesticDelivery;

  /** Step 1 is valid when CPO + both required dates are filled */
  const step1Valid =
    !!form.clientPurchaseOrderId &&
    !!form.acceptanceDate &&
    !!form.committedDeliveryDate;

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create P.O. Acceptance"
        description="Generate acceptance document for a verified Client Purchase Order"
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      {/* ── Wizard Step Indicator ── */}
      <div className="flex items-center gap-0">
        {STEP_LABELS.map((label, idx) => {
          const stepNum = idx + 1;
          const isActive = step === stepNum;
          const isDone = step > stepNum;
          return (
            <div key={stepNum} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center gap-1 min-w-[100px]">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : isDone
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-muted-foreground/30 bg-muted text-muted-foreground"
                  }`}
                >
                  {stepNum}
                </div>
                <span
                  className={`text-xs font-medium text-center whitespace-nowrap ${
                    isActive
                      ? "text-primary"
                      : isDone
                      ? "text-primary/70"
                      : "text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
              </div>
              {stepNum < STEP_LABELS.length && (
                <div
                  className={`h-0.5 flex-1 mx-2 mt-[-12px] transition-colors ${
                    step > stepNum ? "bg-primary" : "bg-muted-foreground/20"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      <p className="text-sm text-muted-foreground">
        Step {step} of {STEP_LABELS.length} — {STEP_LABELS[step - 1]}
      </p>

      {/* ══════════════════════════════════════
          STEP 1 — Details & Contacts
      ══════════════════════════════════════ */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Select Client PO */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select Client Purchase Order</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Client Purchase Order *</Label>
                  <Select
                    value={form.clientPurchaseOrderId}
                    onValueChange={handleCPOSelect}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a registered Client P.O." />
                    </SelectTrigger>
                    <SelectContent>
                      {clientPOs.map((cpo) => (
                        <SelectItem key={cpo.id} value={cpo.id}>
                          {cpo.cpoNo} — {cpo.customer.name} — {cpo.clientPoNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCPO && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div>
                      <div className="text-xs text-muted-foreground">Client</div>
                      <div className="text-sm font-medium">{selectedCPO.customer.name}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Client PO</div>
                      <div className="text-sm font-medium">{selectedCPO.clientPoNumber}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Quotation Ref</div>
                      <div className="text-sm font-medium">{selectedCPO.quotation.quotationNo}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Order Value</div>
                      <div className="text-sm font-medium">
                        {selectedCPO.currency === "INR" ? "₹" : selectedCPO.currency}{" "}
                        {selectedCPO.grandTotal?.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        }) || "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Project</div>
                      <div className="text-sm">{selectedCPO.projectName || "-"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Payment Terms</div>
                      <div className="text-sm">{selectedCPO.paymentTerms || "-"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Delivery Terms</div>
                      <div className="text-sm">{selectedCPO.deliveryTerms || "-"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">CPO Date</div>
                      <div className="text-sm">
                        {format(new Date(selectedCPO.cpoDate), "dd/MM/yyyy")}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Acceptance Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Acceptance Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Acceptance Date *</Label>
                  <Input
                    type="date"
                    value={form.acceptanceDate}
                    onChange={(e) =>
                      setForm({ ...form, acceptanceDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Committed Delivery Date *</Label>
                  <Input
                    type="date"
                    value={form.committedDeliveryDate}
                    onChange={(e) =>
                      setForm({ ...form, committedDeliveryDate: e.target.value })
                    }
                  />
                </div>
                <div className="md:col-span-1" />
              </div>
              {/* Acceptance Details textarea — PRD §3.1 */}
              <div className="mt-4 space-y-2">
                <Label>Acceptance Details</Label>
                <Textarea
                  value={form.acceptanceDetails}
                  onChange={(e) =>
                    setForm({ ...form, acceptanceDetails: e.target.value })
                  }
                  placeholder="Describe the terms and conditions of acceptance..."
                  rows={3}
                />
              </div>
              <div className="mt-4 space-y-2">
                <Label>Remarks</Label>
                <Textarea
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  placeholder="Any additional remarks or conditions..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Client Contact / Department Contact Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Client Contact / Department Contact Details
                </CardTitle>
                {selectedCPO && contacts.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={autoFillAllContacts}
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Auto-fill from Directory
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Follow-up Contact */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge>Follow-up</Badge>
                  {contactsByDept("FOLLOW_UP").length > 0 && (
                    <Select
                      onValueChange={(v) => {
                        const c = contacts.find((c) => c.id === v);
                        if (c) fillContactFromDirectory("FOLLOW_UP", c);
                      }}
                    >
                      <SelectTrigger className="w-[250px] h-8 text-xs">
                        <SelectValue placeholder="Pick from directory..." />
                      </SelectTrigger>
                      <SelectContent>
                        {contactsByDept("FOLLOW_UP").map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.contactName}
                            {c.designation ? ` (${c.designation})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Mr. / Ms.</Label>
                    <Input
                      value={form.followUpName}
                      onChange={(e) =>
                        setForm({ ...form, followUpName: e.target.value })
                      }
                      placeholder="Contact person name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={form.followUpEmail}
                      onChange={(e) =>
                        setForm({ ...form, followUpEmail: e.target.value })
                      }
                      placeholder="email@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact No</Label>
                    <Input
                      value={form.followUpPhone}
                      onChange={(e) =>
                        setForm({ ...form, followUpPhone: e.target.value })
                      }
                      placeholder="+91-XXXXXXXXXX"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Quality / Inspection Contact */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary">Quality / Inspection</Badge>
                  {contactsByDept("QUALITY_INSPECTION").length > 0 && (
                    <Select
                      onValueChange={(v) => {
                        const c = contacts.find((c) => c.id === v);
                        if (c) fillContactFromDirectory("QUALITY_INSPECTION", c);
                      }}
                    >
                      <SelectTrigger className="w-[250px] h-8 text-xs">
                        <SelectValue placeholder="Pick from directory..." />
                      </SelectTrigger>
                      <SelectContent>
                        {contactsByDept("QUALITY_INSPECTION").map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.contactName}
                            {c.designation ? ` (${c.designation})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Mr. / Ms.</Label>
                    <Input
                      value={form.qualityName}
                      onChange={(e) =>
                        setForm({ ...form, qualityName: e.target.value })
                      }
                      placeholder="Contact person name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={form.qualityEmail}
                      onChange={(e) =>
                        setForm({ ...form, qualityEmail: e.target.value })
                      }
                      placeholder="email@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact No</Label>
                    <Input
                      value={form.qualityPhone}
                      onChange={(e) =>
                        setForm({ ...form, qualityPhone: e.target.value })
                      }
                      placeholder="+91-XXXXXXXXXX"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Accounts Contact */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline">Accounts</Badge>
                  {contactsByDept("ACCOUNTS").length > 0 && (
                    <Select
                      onValueChange={(v) => {
                        const c = contacts.find((c) => c.id === v);
                        if (c) fillContactFromDirectory("ACCOUNTS", c);
                      }}
                    >
                      <SelectTrigger className="w-[250px] h-8 text-xs">
                        <SelectValue placeholder="Pick from directory..." />
                      </SelectTrigger>
                      <SelectContent>
                        {contactsByDept("ACCOUNTS").map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.contactName}
                            {c.designation ? ` (${c.designation})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Mr. / Ms.</Label>
                    <Input
                      value={form.accountsName}
                      onChange={(e) =>
                        setForm({ ...form, accountsName: e.target.value })
                      }
                      placeholder="Contact person name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={form.accountsEmail}
                      onChange={(e) =>
                        setForm({ ...form, accountsEmail: e.target.value })
                      }
                      placeholder="email@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact No</Label>
                    <Input
                      value={form.accountsPhone}
                      onChange={(e) =>
                        setForm({ ...form, accountsPhone: e.target.value })
                      }
                      placeholder="+91-XXXXXXXXXX"
                    />
                  </div>
                </div>
              </div>

              {selectedCPO && contacts.length === 0 && (
                <div className="text-center py-4 border border-dashed rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    No contacts in directory for this customer.{" "}
                    <Button
                      variant="link"
                      className="p-0 h-auto text-sm"
                      onClick={() => router.push("/masters/customer-contacts")}
                    >
                      Add contacts to the directory
                    </Button>{" "}
                    to enable auto-fill.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 1 footer — Next button */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button
              onClick={() => setStep(2)}
              disabled={!step1Valid}
              title={
                !step1Valid
                  ? "Select a CPO and fill acceptance date + committed delivery date to continue"
                  : undefined
              }
            >
              Next: Charges &amp; Commercials
            </Button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          STEP 2 — Charges & Commercials
      ══════════════════════════════════════ */}
      {step === 2 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Charges &amp; Commercials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* ── CPO Line Items summary ── */}
              {cpoItems.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Line Items (from CPO)</h4>
                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground w-8">#</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Description</th>
                          <th className="text-right px-3 py-2 font-medium text-muted-foreground">Qty</th>
                          <th className="text-right px-3 py-2 font-medium text-muted-foreground">Rate</th>
                          <th className="text-right px-3 py-2 font-medium text-muted-foreground">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cpoItems.map((item) => (
                          <tr key={item.id} className="border-t">
                            <td className="px-3 py-2 text-muted-foreground">{item.sNo}</td>
                            <td className="px-3 py-2">{item.description || "—"}</td>
                            <td className="px-3 py-2 text-right">{item.qtyOrdered.toLocaleString("en-IN")}</td>
                            <td className="px-3 py-2 text-right">
                              {cpoCurrency === "INR" ? "₹" : cpoCurrency}{" "}
                              {item.unitRate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {cpoCurrency === "INR" ? "₹" : cpoCurrency}{" "}
                              {item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted/30 border-t font-semibold">
                        <tr>
                          <td colSpan={4} className="px-3 py-2 text-right">Subtotal</td>
                          <td className="px-3 py-2 text-right">
                            {cpoCurrency === "INR" ? "₹" : cpoCurrency}{" "}
                            {totals.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              <Separator />

              {/* ── Additional Charges ── */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Additional Charges</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Freight */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label>Freight</Label>
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                        <Checkbox
                          checked={Boolean(form.freightTaxApplicable)}
                          onCheckedChange={(checked) =>
                            setForm((prev) => ({ ...prev, freightTaxApplicable: Boolean(checked) }))
                          }
                        />
                        Taxable
                      </label>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.freight}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, freight: Number(e.target.value) || 0 }))
                      }
                      placeholder="0.00"
                    />
                  </div>

                  {/* Packing & Forwarding */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label>Packing &amp; Forwarding</Label>
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                        <Checkbox
                          checked={Boolean(form.packingTaxApplicable)}
                          onCheckedChange={(checked) =>
                            setForm((prev) => ({ ...prev, packingTaxApplicable: Boolean(checked) }))
                          }
                        />
                        Taxable
                      </label>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.packingForwarding}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, packingForwarding: Number(e.target.value) || 0 }))
                      }
                      placeholder="0.00"
                    />
                  </div>

                  {/* Insurance */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label>Insurance</Label>
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                        <Checkbox
                          checked={Boolean(form.insuranceTaxApplicable)}
                          onCheckedChange={(checked) =>
                            setForm((prev) => ({ ...prev, insuranceTaxApplicable: Boolean(checked) }))
                          }
                        />
                        Taxable
                      </label>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.insurance}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, insurance: Number(e.target.value) || 0 }))
                      }
                      placeholder="0.00"
                    />
                  </div>

                  {/* Other Charges */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label>Other Charges</Label>
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                        <Checkbox
                          checked={Boolean(form.otherChargesTaxApplicable)}
                          onCheckedChange={(checked) =>
                            setForm((prev) => ({ ...prev, otherChargesTaxApplicable: Boolean(checked) }))
                          }
                        />
                        Taxable
                      </label>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.otherCharges}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, otherCharges: Number(e.target.value) || 0 }))
                      }
                      placeholder="0.00"
                    />
                  </div>

                  {/* Testing Charges */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label>Testing Charges</Label>
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                        <Checkbox
                          checked={Boolean(form.testingTaxApplicable)}
                          onCheckedChange={(checked) =>
                            setForm((prev) => ({ ...prev, testingTaxApplicable: Boolean(checked) }))
                          }
                        />
                        Taxable
                      </label>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.testingCharges}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, testingCharges: Number(e.target.value) || 0 }))
                      }
                      placeholder="0.00"
                    />
                  </div>

                  {/* TPI Charges */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label>TPI Charges</Label>
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                        <Checkbox
                          checked={Boolean(form.tpiTaxApplicable)}
                          onCheckedChange={(checked) =>
                            setForm((prev) => ({ ...prev, tpiTaxApplicable: Boolean(checked) }))
                          }
                        />
                        Taxable
                      </label>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.tpiCharges}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, tpiCharges: Number(e.target.value) || 0 }))
                      }
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* ── GST Context ── */}
              <div>
                <h4 className="text-sm font-semibold mb-3">GST Context</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="space-y-1">
                    <Label>GST Rate (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={28}
                      step={0.01}
                      value={form.gstRate}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, gstRate: Number(e.target.value) || 0 }))
                      }
                      placeholder="18"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Supply Type</Label>
                    <div className="flex items-center gap-3 h-10 px-3 rounded-md border bg-muted/30 text-sm">
                      <span className={form.isInterState ? "text-muted-foreground" : "font-medium"}>
                        Intra-State
                      </span>
                      <span className="text-muted-foreground">/</span>
                      <span className={form.isInterState ? "font-medium" : "text-muted-foreground"}>
                        Inter-State
                      </span>
                      <Badge variant={form.isInterState ? "default" : "secondary"} className="ml-auto text-xs">
                        {form.isInterState ? "IGST" : "CGST + SGST"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Currency / Delivery</Label>
                    <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted/30 text-sm">
                      <Badge variant="outline">{cpoCurrency}</Badge>
                      {!gstApplies && (
                        <span className="text-xs text-muted-foreground ml-1">(GST not applicable)</span>
                      )}
                      {gstApplies && cpoCurrency !== "INR" && (
                        <span className="text-xs text-muted-foreground ml-1">(Domestic delivery)</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* ── Totals Panel ── */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Commercial Summary</h4>
                <div className="rounded-md border divide-y text-sm max-w-sm ml-auto">
                  <div className="flex justify-between px-4 py-2">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium tabular-nums">
                      {cpoCurrency === "INR" ? "₹" : cpoCurrency}{" "}
                      {totals.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between px-4 py-2">
                    <span className="text-muted-foreground">Additional Charges</span>
                    <span className="font-medium tabular-nums">
                      {cpoCurrency === "INR" ? "₹" : cpoCurrency}{" "}
                      {totals.additionalChargesTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between px-4 py-2">
                    <span className="text-muted-foreground">Taxable Amount</span>
                    <span className="font-medium tabular-nums">
                      {cpoCurrency === "INR" ? "₹" : cpoCurrency}{" "}
                      {totals.taxableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {gstApplies && form.gstRate > 0 && (
                    <>
                      {!form.isInterState ? (
                        <>
                          <div className="flex justify-between px-4 py-2 text-muted-foreground">
                            <span>CGST ({Number(form.gstRate) / 2}%)</span>
                            <span className="tabular-nums">
                              ₹ {totals.cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex justify-between px-4 py-2 text-muted-foreground">
                            <span>SGST ({Number(form.gstRate) / 2}%)</span>
                            <span className="tabular-nums">
                              ₹ {totals.sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between px-4 py-2 text-muted-foreground">
                          <span>IGST ({form.gstRate}%)</span>
                          <span className="tabular-nums">
                            ₹ {totals.igst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex justify-between px-4 py-2 text-muted-foreground">
                    <span>Round Off</span>
                    <span className="tabular-nums">
                      {form.roundOff >= 0 ? "+" : ""}
                      {Number(form.roundOff).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between px-4 py-2 font-semibold bg-muted/30">
                    <span>Grand Total</span>
                    <span className="tabular-nums">
                      {cpoCurrency === "INR" ? "₹" : cpoCurrency}{" "}
                      {totals.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 2 footer */}
          <div className="flex justify-between gap-3">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button onClick={() => setStep(3)}>
              Next: Review &amp; Submit
            </Button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          STEP 3 — Review & Submit
      ══════════════════════════════════════ */}
      {step === 3 && (
        <div className="space-y-6">

          {/* ── Order Summary ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileCheck className="w-4 h-4" />
                Order
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedCPO ? (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">CPO No.</dt>
                    <dd className="font-medium">{selectedCPO.cpoNo}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Client P.O. No.</dt>
                    <dd className="font-medium">{selectedCPO.clientPoNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Customer</dt>
                    <dd className="font-medium">{selectedCPO.customer.name}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Project</dt>
                    <dd className="font-medium">{selectedCPO.projectName || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Quotation No.</dt>
                    <dd className="font-medium">{selectedCPO.quotation.quotationNo}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Currency</dt>
                    <dd className="font-medium">{selectedCPO.currency}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">No CPO selected.</p>
              )}
            </CardContent>
          </Card>

          {/* ── Acceptance Details ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Acceptance Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Acceptance Date</dt>
                  <dd className="font-medium">
                    {form.acceptanceDate
                      ? format(new Date(form.acceptanceDate), "dd/MM/yyyy")
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Committed Delivery Date</dt>
                  <dd className="font-medium">
                    {form.committedDeliveryDate
                      ? format(new Date(form.committedDeliveryDate), "dd/MM/yyyy")
                      : "—"}
                  </dd>
                </div>
                {form.acceptanceDetails && (
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Acceptance Details</dt>
                    <dd className="font-medium whitespace-pre-wrap">{form.acceptanceDetails}</dd>
                  </div>
                )}
                {form.remarks && (
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Remarks</dt>
                    <dd className="font-medium whitespace-pre-wrap">{form.remarks}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* ── Contacts ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                Contacts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                {/* Follow-Up */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Follow-Up</p>
                  <p className="font-medium">{form.followUpName || "—"}</p>
                  {form.followUpEmail && <p className="text-muted-foreground">{form.followUpEmail}</p>}
                  {form.followUpPhone && <p className="text-muted-foreground">{form.followUpPhone}</p>}
                </div>
                {/* Quality */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quality Inspection</p>
                  <p className="font-medium">{form.qualityName || "—"}</p>
                  {form.qualityEmail && <p className="text-muted-foreground">{form.qualityEmail}</p>}
                  {form.qualityPhone && <p className="text-muted-foreground">{form.qualityPhone}</p>}
                </div>
                {/* Accounts */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Accounts</p>
                  <p className="font-medium">{form.accountsName || "—"}</p>
                  {form.accountsEmail && <p className="text-muted-foreground">{form.accountsEmail}</p>}
                  {form.accountsPhone && <p className="text-muted-foreground">{form.accountsPhone}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Commercials ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Commercials</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border divide-y text-sm max-w-sm ml-auto">
                <div className="flex justify-between px-4 py-2">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium tabular-nums">
                    {cpoCurrency === "INR" ? "₹" : cpoCurrency}{" "}
                    {form.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between px-4 py-2">
                  <span className="text-muted-foreground">Additional Charges</span>
                  <span className="font-medium tabular-nums">
                    {cpoCurrency === "INR" ? "₹" : cpoCurrency}{" "}
                    {form.additionalChargesTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between px-4 py-2">
                  <span className="text-muted-foreground">Taxable Amount</span>
                  <span className="font-medium tabular-nums">
                    {cpoCurrency === "INR" ? "₹" : cpoCurrency}{" "}
                    {form.taxableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {gstApplies && form.gstRate > 0 && (
                  <>
                    {!form.isInterState ? (
                      <>
                        <div className="flex justify-between px-4 py-2 text-muted-foreground">
                          <span>CGST ({Number(form.gstRate) / 2}%)</span>
                          <span className="tabular-nums">
                            ₹ {form.cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between px-4 py-2 text-muted-foreground">
                          <span>SGST ({Number(form.gstRate) / 2}%)</span>
                          <span className="tabular-nums">
                            ₹ {form.sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between px-4 py-2 text-muted-foreground">
                        <span>IGST ({form.gstRate}%)</span>
                        <span className="tabular-nums">
                          ₹ {form.igst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between px-4 py-2 text-muted-foreground">
                  <span>Round Off</span>
                  <span className="tabular-nums">
                    {form.roundOff >= 0 ? "+" : ""}
                    {Number(form.roundOff).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between px-4 py-2 font-semibold bg-muted/30">
                  <span>Grand Total</span>
                  <span className="tabular-nums">
                    {cpoCurrency === "INR" ? "₹" : cpoCurrency}{" "}
                    {form.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 3 footer */}
          <div className="flex justify-between gap-3">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              <FileCheck className="w-4 h-4 mr-2" />
              {saving ? "Creating..." : "Create Acceptance"}
            </Button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          Preview / Email Drawer (post-submit)
      ══════════════════════════════════════ */}
      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent className="w-full sm:max-w-2xl flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle>P.O. Acceptance Letter</SheetTitle>
            <SheetDescription>
              Review the generated letter, then send it by email or skip to the acceptance record.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            {/* PDF preview iframe */}
            {previewMeta?.pdfUrl && (
              <iframe
                src={previewMeta.pdfUrl}
                className="w-full h-[50vh] border rounded"
                title="P.O. Acceptance Letter Preview"
              />
            )}

            {/* Email fields */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Send Email
              </h4>
              <div className="space-y-1">
                <Label htmlFor="email-to">To</Label>
                <Input
                  id="email-to"
                  type="email"
                  placeholder="recipient@example.com"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                />
                {!emailTo && (
                  <p className="text-xs text-muted-foreground">
                    No recipient — add a contact
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="email-cc">CC <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  id="email-cc"
                  type="email"
                  placeholder="cc@example.com"
                  value={emailCc}
                  onChange={(e) => setEmailCc(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email-subject">Subject</Label>
                <Input
                  id="email-subject"
                  placeholder="P.O. Acceptance Letter"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                />
              </div>
            </div>
          </div>

          <SheetFooter className="px-6 py-4 border-t flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                setPreviewOpen(false);
                if (createdId) router.push(`/po-acceptance/${createdId}`);
              }}
            >
              <X className="w-4 h-4 mr-2" />
              Skip &amp; Close
            </Button>
            <Button
              className="w-full sm:w-auto"
              disabled={sending || !emailTo}
              onClick={handleSendEmail}
            >
              <Send className="w-4 h-4 mr-2" />
              {sending ? "Sending..." : "Send Email"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function CreatePOAcceptancePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <CreatePOAcceptanceContent />
    </Suspense>
  );
}
