"use client";

import { useState, useEffect, Suspense, useCallback, useMemo, Fragment } from "react";
import { useApiQuery } from "@/hooks/use-api-query";
import { useCustomers } from "@/hooks/use-masters";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Save,
  Download,
  CheckSquare,
  AlertTriangle,
  Calculator,
  Copy,
  Trash2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_CHARGES, chargePayload, type AdditionalCharge } from "@/lib/calc/cpo-charges";
import { firstOverBalance } from "@/lib/calc/cpo-balance";
import { termValue } from "@/lib/quotations/terms";
import { format } from "date-fns";
import { deliveryScheduleToDate } from "@/lib/dates";
import { PageLoading } from "@/components/shared/page-loading";
import { formatDispatchAddress, type DispatchAddress } from "@/components/shared/dispatch-address-select";

interface Customer {
  id: string;
  name: string;
  city?: string;
  contactPerson?: string;
  currency?: string;
  state?: string;
  customerType?: string;
}

interface Quotation {
  id: string;
  quotationNo: string;
  customerId: string;
  customer: { name: string };
}

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

// The "+ Add new address" form: the fields of the customer master's
// dispatch-address dialog (src/components/shared/dispatch-address-select.tsx).
const EMPTY_ADDRESS = {
  label: "",
  companyName: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  pincode: "",
  contactPerson: "",
  contactNumber: "",
  gstNo: "",
};

// Select value of "+ Add new address" in the Billing / Dispatch Address selects.
const NEW_ADDRESS = "NEW";

// A saved site as text for the "Enter manually" box: everything its preview
// shows, so editing starts from the whole address including the GSTIN.
const siteText = (a: DispatchAddress) =>
  [
    formatDispatchAddress(a),
    [a.contactPerson, a.contactNumber].filter(Boolean).join(" · "),
    a.gstNo ? `GST: ${a.gstNo}` : "",
  ]
    .filter(Boolean)
    .join("\n");

// A contact held on the customer master. The order-specific contact is picked
// from here so the acceptance letter and every follow-up have an email and a
// phone number to use, instead of just a name typed into a box.
interface CustomerContact {
  id: string;
  contactName: string;
  designation: string | null;
  email: string | null;
  phone: string | null;
  department: string;
}

interface BalanceItem {
  id: string;
  sNo: number;
  product: string | null;
  material: string | null;
  additionalSpec: string | null;
  sizeLabel: string | null;
  od: number | null;
  wt: number | null;
  ends: string | null;
  uom: string | null;
  hsnCode: string | null;
  materialCodeId: string | null;
  totalOrdered: number;
  balanceQty: number;
  unitRate: number;
  amount: number;
  delivery: string | null;
  remark: string | null;
  // The client's enquiry Sl. No. for the line, shown as "Enq. …" so two
  // quoted lines with the same product and size can be told apart.
  slNo: string | null;
  // A non-standard line's real text (its product only reads "Non-Standard
  // Item"); shown under the product and carried onto the order line.
  itemDescription: string | null;
  previousOrders: { cpoNo: string; qtyOrdered: number }[];
}

interface SelectedItem extends BalanceItem {
  selected: boolean;
  qtyOrdered: number;
  itemDeliveryDate: string;
  negotiatedRate: number;
  rateRemark: string;
  qtyRemark: string;
  poSlNo: string;
  poItemCode: string;
  // Set only on a copied row. `id` stays the quotation item id (it is sent as
  // quotationItemId), so a copy needs its own identity for keys and lookups.
  rowKey?: string;
  // Set once the user types this line's CDD. Until then the CDD is derived
  // from the quoted delivery period (itemCdd) and follows the P.O. date.
  cddTyped?: boolean;
}

interface QuotationMeta {
  id: string;
  quotationNo: string;
  customer: {
    id: string;
    name: string;
    contactPerson: string | null;
    currency: string;
    state: string | null;
    gstNo: string | null;
    customerType?: string | null;
  };
  currency: string;
  paymentTerms: string | null;
  deliveryTerms: string | null;
  deliveryPeriod: string | null;
  supplierState: string | null;
  clientState: string | null;
  taxRate: number | null;
  terms?: OrderTerm[];
  // The quotation's buyer (BuyerMaster): the order contact when present.
  buyer: { name: string; email: string | null; phone: string | null } | null;
}

// One row of the order's terms, copied from the quotation and edited here.
interface OrderTerm {
  termName: string;
  termValue: string;
  isIncluded: boolean;
}

export default function CreateClientPOPageWrapper() {
  return (
    <Suspense fallback={<PageLoading />}>
      <CreateClientPOPage />
    </Suspense>
  );
}

function CreateClientPOPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedQuotationId = searchParams.get("quotationId");

  const [loading, setLoading] = useState(false);
  const customers = useCustomers<Customer>();
  // Keyed by the status filter, so each form's slice is its own entry.
  const { data: quotationData } = useApiQuery<{ quotations: Quotation[] }>(
    ["quotations-list", "APPROVED,SENT,WON"],
    "/api/quotations?status=APPROVED,SENT,WON"
  );
  // Memoised: a fresh [] each render while loading re-fires the filter effect
  // below, which loops until React aborts (error #185).
  const quotations = useMemo(() => quotationData?.quotations ?? [], [quotationData]);
  const [filteredQuotations, setFilteredQuotations] = useState<Quotation[]>([]);
  const [quotationMeta, setQuotationMeta] = useState<QuotationMeta | null>(null);
  const [balanceItems, setBalanceItems] = useState<SelectedItem[]>([]);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [materialHistory, setMaterialHistory] = useState<
    Record<string, { lastQuote: { rate: number; quoteNo: string; quotedAt: string } | null; lastPO: { rate: number; poNo: string; orderedAt: string; remark: string | null } | null }>
  >({});

  // Saved ship-to sites for the selected customer, from the customer master.
  const [dispatchAddressesLoading, setDispatchAddressesLoading] = useState(false);

  const [formData, setFormData] = useState({
    customerId: "",
    quotationId: "",
    clientPoNumber: "",
    clientPoDate: format(new Date(), "yyyy-MM-dd"),
    projectName: "",
    contactPerson: "",
    contactEmail: "",
    contactPhone: "",
    paymentTerms: "",
    deliveryTerms: "",
    // The client states delivery as a period ("10 weeks"), not a date. The CDD
    // below is derived from it; deliveryDate is kept in step with the CDD so
    // the existing detail screen and the per-item CDD floor keep working.
    deliverySchedule: "",
    deliveryDate: "",
    currency: "INR",
    remarks: "",
    isDomesticDelivery: false,
    shipmentAddress: "",
    dispatchAddressId: "",
    // Who the order is invoiced to. Empty = the customer master address.
    billingAddressId: "",
    // Typed one-off addresses ("Enter manually"); the matching FK stays empty.
    billingAddressText: "",
    dispatchAddressText: "",
    clientPoDocumentPath: "",
    clientPoDocumentName: "",
    exchangeRate: null as number | null,
    committedDeliveryDate: "",
  });

  const [contacts, setContacts] = useState<CustomerContact[]>([]);
  // Once the user edits the CDD by hand, stop overwriting it from the schedule.
  const [cddEdited, setCddEdited] = useState(false);
  const [uploadingPoDoc, setUploadingPoDoc] = useState(false);

  const [isInternational, setIsInternational] = useState(false);
  const [dispatchAddresses, setDispatchAddresses] = useState<DispatchAddress[]>([]);
  const selectedDispatchAddress = dispatchAddresses.find(
    (a) => a.id === formData.dispatchAddressId
  );
  const selectedBillingAddress = dispatchAddresses.find(
    (a) => a.id === formData.billingAddressId
  );

  const [terms, setTerms] = useState<OrderTerm[]>([]);
  const [billingManual, setBillingManual] = useState(false);
  const [dispatchManual, setDispatchManual] = useState(false);
  // Which select opened the "+ Add new address" dialog (null = closed).
  const [newAddressFor, setNewAddressFor] = useState<"billing" | "dispatch" | null>(null);
  const [newAddress, setNewAddress] = useState(EMPTY_ADDRESS);
  const [savingAddress, setSavingAddress] = useState(false);

  const [charges, setCharges] = useState<AdditionalCharge[]>(
    DEFAULT_CHARGES.map((c) => ({ ...c }))
  );
  const [gstRate, setGstRate] = useState<number>(18);
  const [supplierState, setSupplierState] = useState("");
  const [clientState, setClientState] = useState("");
  const [bulkDiscountPercent, setBulkDiscountPercent] = useState<string>("");
  const [bulkOverallRemark, setBulkOverallRemark] = useState<string>("");
  const [showNegotiationSection, setShowNegotiationSection] = useState(false);

  useEffect(() => {
  }, []);

  // Filter quotations when customer changes
  useEffect(() => {
    if (formData.customerId) {
      setFilteredQuotations(
        quotations.filter((q) => q.customerId === formData.customerId)
      );
    } else {
      setFilteredQuotations(quotations);
    }
  }, [formData.customerId, quotations]);

  // Load the customer's saved ship-to sites and preselect their default.
  useEffect(() => {
    if (!formData.customerId) return;
    let cancelled = false;
    setDispatchAddressesLoading(true);
    fetch(`/api/masters/customers/${formData.customerId}/dispatch-addresses`)
      .then((res) => (res.ok ? res.json() : { addresses: [] }))
      .then((data) => {
        if (cancelled) return;
        const list: DispatchAddress[] = data.addresses || [];
        setDispatchAddresses(list);
        const preset = list.find((a) => a.isDefault);
        if (preset) {
          setFormData((prev) =>
            prev.dispatchAddressId ? prev : { ...prev, dispatchAddressId: preset.id }
          );
        }
      })
      .catch(() => {
        if (!cancelled) setDispatchAddresses([]);
      })
      .finally(() => {
        if (!cancelled) setDispatchAddressesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [formData.customerId]);

  // Contacts for the selected customer. Picking one fills the name, email and
  // phone on the order; all three stay editable for a one-off contact.
  useEffect(() => {
    if (!formData.customerId) {
      setContacts([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/masters/customer-contacts?customerId=${formData.customerId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) setContacts(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setContacts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [formData.customerId]);

  // A line's CDD: the date typed on it, else its quoted delivery period
  // ("6 To 8 Weeks") counted from the P.O. date, so it follows that date.
  const itemCdd = (item: SelectedItem) =>
    item.cddTyped
      ? item.itemDeliveryDate
      : deliveryScheduleToDate(item.delivery, formData.clientPoDate);
  // The latest CDD among the lines being ordered.
  const latestItemCdd = balanceItems
    .filter((item) => item.selected && item.qtyOrdered > 0)
    .map(itemCdd)
    .reduce((latest, d) => (d > latest ? d : latest), "");

  // CDD = P.O. date + the delivery schedule, until the user overrides it. A
  // schedule with no period falls back to the latest line CDD, so the order
  // still carries a CDD for the P.O. acceptance to pick up.
  useEffect(() => {
    if (cddEdited) return;
    const derived =
      deliveryScheduleToDate(formData.deliverySchedule, formData.clientPoDate) ||
      latestItemCdd;
    setFormData((prev) =>
      prev.committedDeliveryDate === derived
        ? prev
        : { ...prev, committedDeliveryDate: derived }
    );
  }, [formData.deliverySchedule, formData.clientPoDate, cddEdited, latestItemCdd]);

  const fetchQuotationBalance = useCallback(
    async (quotationId: string) => {
      if (!quotationId) return;
      setLoadingBalance(true);
      try {
        const response = await fetch(`/api/quotations/${quotationId}/balance`);
        if (!response.ok) throw new Error("Failed to fetch balance");

        const data = await response.json();
        setQuotationMeta(data.quotation);

        const selectedItems: SelectedItem[] = data.items.map((item: BalanceItem) => ({
          ...item,
          selected: item.balanceQty > 0,
          qtyOrdered: item.balanceQty,
          itemDeliveryDate: "",
          negotiatedRate: item.unitRate,
          rateRemark: "",
          qtyRemark: "",
          poSlNo: "",
          poItemCode: "",
        }));

        setBalanceItems(selectedItems);

        // Fetch material-code customer history for each item that has a materialCodeId.
        // customerId comes from the quotation response (q.customer.id).
        const q = data.quotation;
        const historyMap: Record<string, { lastQuote: { rate: number; quoteNo: string; quotedAt: string } | null; lastPO: { rate: number; poNo: string; orderedAt: string; remark: string | null } | null }> = {};
        await Promise.allSettled(
          selectedItems
            .filter((item) => item.materialCodeId)
            .map(async (item) => {
              try {
                const res = await fetch(
                  `/api/masters/material-codes/${item.materialCodeId}/customer-history?customerId=${q.customer.id}`
                );
                if (!res.ok) return;
                const hist = await res.json();
                historyMap[item.id] = hist;
              } catch {
                // ignore per-item errors
              }
            })
        );
        setMaterialHistory(historyMap);

        // Auto-fill form fields from quotation
        const derivedCurrency: string = q.currency || "INR";
        const derivedIntl = derivedCurrency !== "INR";
        // GST and the Domestic Delivery switch follow the customer type, which
        // is what the POST route saves as the order currency, not the
        // quotation's currency (the two can differ).
        setIsInternational(q.customer?.customerType === "INTERNATIONAL");
        setFormData((prev) => ({
          ...prev,
          customerId: q.customer.id,
          quotationId,
          // The contact and terms below are set from each quotation picked,
          // not kept from an earlier pick, so switching quotation replaces
          // them. The contact is the quotation's buyer when it has one.
          contactPerson: q.buyer?.name || q.customer.contactPerson || "",
          contactEmail: q.buyer?.email || "",
          contactPhone: q.buyer?.phone || "",
          // The quotation records these as its "Payment" / "Delivery" offer-term
          // rows; the structured fields are a fallback that is never filled.
          paymentTerms: q.paymentTerms || termValue(q.terms, "payment"),
          deliveryTerms: q.deliveryTerms || termValue(q.terms, "delivery"),
          // The quoted delivery period is the starting point for the schedule
          // the client actually ordered against.
          deliverySchedule: q.deliveryPeriod || "",
          currency: derivedCurrency,
          exchangeRate: derivedIntl ? prev.exchangeRate : null,
        }));

        // The quotation's offer terms become this order's terms, editable below.
        setTerms((q.terms ?? []).map((t: OrderTerm) => ({ termName: t.termName, termValue: t.termValue, isIncluded: t.isIncluded })));

        // Set state for GST
        if (q.supplierState) setSupplierState(q.supplierState);
        if (q.clientState) setClientState(q.clientState);
        if (q.taxRate) setGstRate(q.taxRate);
      } catch (error) {
        console.error("Failed to fetch quotation balance:", error);
        toast.error("Failed to load quotation items");
      } finally {
        setLoadingBalance(false);
      }
    },
    []
  );

  // Auto-select quotation from URL param
  useEffect(() => {
    if (preselectedQuotationId && quotations.length > 0 && !formData.quotationId) {
      setFormData((prev) => ({ ...prev, quotationId: preselectedQuotationId }));
      fetchQuotationBalance(preselectedQuotationId);
    }
  }, [preselectedQuotationId, quotations, formData.quotationId, fetchQuotationBalance]);

  // Auto-fill FX rate when currency becomes USD and rate is not yet set
  useEffect(() => {
    if (formData.currency === "USD" && formData.exchangeRate == null) {
      fetch("/api/fx/rate?from=USD&to=INR")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.rate) setFormData((prev) => ({ ...prev, exchangeRate: data.rate }));
        })
        .catch(() => {});
    }
  }, [formData.currency]);

  const handleQuotationChange = (quotationId: string) => {
    setFormData((prev) => ({ ...prev, quotationId }));
    fetchQuotationBalance(quotationId);
  };

  const handleCustomerChange = (customerId: string) => {
    const selectedCustomer = customers.find((c) => c.id === customerId);
    const intl = selectedCustomer?.customerType === "INTERNATIONAL";
    setIsInternational(intl);
    setFormData((prev) => ({
      ...prev,
      customerId,
      quotationId: "",
      currency: intl ? "USD" : "INR",
      exchangeRate: null,
      isDomesticDelivery: false,
      shipmentAddress: "",
      dispatchAddressId: "",
      billingAddressId: "",
      billingAddressText: "",
      dispatchAddressText: "",
      contactEmail: "",
      contactPhone: "",
    }));
    setBillingManual(false);
    setDispatchManual(false);
    setTerms([]);
    setDispatchAddresses([]);
    setBalanceItems([]);
    setQuotationMeta(null);
    setMaterialHistory({});

    // Try to auto-fill client state from customer
    if (selectedCustomer?.state) {
      setClientState(selectedCustomer.state);
    }
  };

  // A pick in the Billing / Dispatch Address select (and its Edit button).
  // "MANUAL" while a saved site is picked starts the box from that site: an
  // edit for this P.O. only, the saved site is not changed. NEW_ADDRESS opens
  // the add-address dialog and leaves the current pick alone.
  const pickAddress = (kind: "billing" | "dispatch", value: string) => {
    if (value === NEW_ADDRESS) {
      setNewAddress(EMPTY_ADDRESS);
      setNewAddressFor(kind);
      return;
    }
    const idKey = kind === "billing" ? "billingAddressId" : "dispatchAddressId";
    const textKey = kind === "billing" ? "billingAddressText" : "dispatchAddressText";
    if (kind === "billing") setBillingManual(value === "MANUAL");
    else setDispatchManual(value === "MANUAL");
    setFormData((prev) => {
      const picked = dispatchAddresses.find((a) => a.id === prev[idKey]);
      return {
        ...prev,
        [idKey]: value === "NONE" || value === "MANUAL" ? "" : value,
        [textKey]: value === "MANUAL" && picked ? siteText(picked) : prev[textKey],
      };
    });
  };

  // "+ Add new address": saved to the customer (the same list as the master's
  // dispatch addresses) so later orders can pick it too, then picked in the
  // select that opened the dialog.
  const saveNewAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddressFor) return;
    if (!newAddress.addressLine1.trim() && !newAddress.city.trim()) {
      toast.error("Please enter at least address or city");
      return;
    }
    setSavingAddress(true);
    try {
      const res = await fetch(`/api/masters/customers/${formData.customerId}/dispatch-addresses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAddress),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save address");
      }
      const saved: DispatchAddress = await res.json();
      setDispatchAddresses((prev) => [...prev, saved]);
      pickAddress(newAddressFor, saved.id);
      setNewAddressFor(null);
      toast.success("Address saved to the customer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save address");
    } finally {
      setSavingAddress(false);
    }
  };

  const toggleItemSelection = (index: number) => {
    setBalanceItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const selectAllItems = () => {
    setBalanceItems((prev) =>
      prev.map((item) => ({
        ...item,
        selected: item.balanceQty > 0,
        qtyOrdered: item.selected ? item.qtyOrdered : item.balanceQty,
      }))
    );
  };

  const selectPartialItems = () => {
    setBalanceItems((prev) =>
      prev.map((item) => ({
        ...item,
        selected: item.balanceQty > 0 ? item.selected : false,
      }))
    );
  };

  const updateQtyOrdered = (index: number, value: string) => {
    const qty = parseFloat(value) || 0;
    setBalanceItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        return {
          ...item,
          qtyOrdered: Math.min(qty, item.balanceQty),
          selected: qty > 0,
        };
      })
    );
  };

  // Split one quoted line into another PO line (its own PO Sl. No., item
  // code, qty and CDD). The copy keeps the quotation item it orders against.
  const copyRow = (index: number) => {
    setBalanceItems((prev) => [
      ...prev.slice(0, index + 1),
      {
        ...prev[index],
        rowKey: crypto.randomUUID(),
        poSlNo: "",
        poItemCode: "",
        qtyOrdered: 0,
        qtyRemark: "",
        selected: true,
      },
      ...prev.slice(index + 1),
    ]);
  };

  const removeRow = (index: number) => {
    setBalanceItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateCharge = (index: number, field: "amount" | "taxApplicable" | "description", value: any) => {
    setCharges((prev) =>
      prev.map((c, i) =>
        i === index
          ? { ...c, [field]: field === "amount" ? (parseFloat(value) || 0) : value }
          : c
      )
    );
  };

  const getSelectedItems = () => balanceItems.filter((item) => item.selected && item.qtyOrdered > 0);

  function applyBulkDiscount() {
    const percent = parseFloat(bulkDiscountPercent);
    if (isNaN(percent) || percent <= 0 || percent > 100) {
      toast.error("Enter a valid discount percentage (0-100)");
      return;
    }
    if (!bulkOverallRemark.trim()) {
      toast.error("Overall remark is required for bulk rate changes");
      return;
    }
    const updated = balanceItems.map((item) => {
      if (!item.selected) return item;
      const newRate = Math.round(item.unitRate * (1 - percent / 100) * 100) / 100;
      return {
        ...item,
        negotiatedRate: newRate,
        rateRemark: item.rateRemark || bulkOverallRemark,
      };
    });
    setBalanceItems(updated);
    toast.success(`Applied ${percent}% discount to all selected items`);
  }

  // =====================================================
  // Commercial Calculation (reactive, computed every render)
  // =====================================================
  const commercials = useMemo(() => {
    const selectedItems = getSelectedItems();
    const materialValue = selectedItems.reduce(
      (sum, item) => sum + item.qtyOrdered * item.negotiatedRate,
      0
    );

    const additionalChargesTotal = charges.reduce((sum, c) => sum + c.amount, 0);

    // Taxable = material value + charges where tax is applicable
    const taxableChargesAmount = charges
      .filter((c) => c.taxApplicable)
      .reduce((sum, c) => sum + c.amount, 0);

    const taxableAmount = materialValue + taxableChargesAmount;

    const isInterState = !!(supplierState && clientState && supplierState.toLowerCase() !== clientState.toLowerCase());

    // GST applies only for INR orders, or USD orders with domestic delivery
    const gstApplies = !isInternational || formData.isDomesticDelivery;

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (gstApplies && gstRate > 0 && taxableAmount > 0) {
      if (isInterState) {
        igst = (taxableAmount * gstRate) / 100;
      } else {
        cgst = (taxableAmount * gstRate) / 200;
        sgst = (taxableAmount * gstRate) / 200;
      }
    }

    const grandTotalBeforeRound = materialValue + additionalChargesTotal + cgst + sgst + igst;
    const roundOff = Math.round(grandTotalBeforeRound) - grandTotalBeforeRound;
    const grandTotal = grandTotalBeforeRound + roundOff;

    return {
      materialValue,
      additionalChargesTotal,
      taxableAmount,
      isInterState,
      gstApplies,
      cgst,
      sgst,
      igst,
      roundOff,
      grandTotal,
    };
  }, [balanceItems, charges, gstRate, supplierState, clientState, formData.currency, formData.isDomesticDelivery, isInternational]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerId) {
      toast.error("Please select a client");
      return;
    }
    if (!formData.quotationId) {
      toast.error("Please select a reference quotation");
      return;
    }
    if (!formData.clientPoNumber) {
      toast.error("Please enter the client P.O. number");
      return;
    }

    const selectedItems = getSelectedItems();
    if (selectedItems.length === 0) {
      toast.error("Please select at least one item to order");
      return;
    }

    const itemsMissingRemark = selectedItems.filter(
      (item) => item.negotiatedRate !== item.unitRate && !item.rateRemark.trim()
    );
    if (itemsMissingRemark.length > 0) {
      toast.error("Rate remark is required for all items with negotiated rates");
      return;
    }

    // A part-order needs the same justification a negotiated rate does —
    // otherwise the difference between the quoted qty and the ordered qty
    // cannot be explained once the quotation balance has moved on.
    // Judged per quoted line, summing its split copies: two lines that together
    // order the full balance are not a part-order.
    const orderedPerQuotedLine = new Map<string, number>();
    for (const item of selectedItems) {
      orderedPerQuotedLine.set(item.id, (orderedPerQuotedLine.get(item.id) ?? 0) + item.qtyOrdered);
    }
    const itemsMissingQtyRemark = selectedItems.filter(
      (item) =>
        Math.abs((orderedPerQuotedLine.get(item.id) ?? 0) - item.balanceQty) > 1e-6 &&
        !item.qtyRemark.trim()
    );
    if (itemsMissingQtyRemark.length > 0) {
      toast.error(
        `Qty remark is required for item ${itemsMissingQtyRemark[0].sNo} — the ordered qty differs from the quoted balance`
      );
      return;
    }

    for (const item of selectedItems) {
      if (item.qtyOrdered > item.balanceQty) {
        toast.error(
          `Item ${item.sNo} (${item.product}): Ordered qty (${item.qtyOrdered}) exceeds balance (${item.balanceQty})`
        );
        return;
      }
    }

    // Copied rows share one quoted line; together they must fit its balance.
    const over = firstOverBalance(
      selectedItems.map((item) => ({ quotationItemId: item.id, qtyOrdered: item.qtyOrdered })),
      new Map(balanceItems.map((item) => [item.id, item.balanceQty]))
    );
    if (over) {
      const item = balanceItems.find((b) => b.id === over.quotationItemId);
      toast.error(
        `Item ${item?.sNo} (${item?.product}): split lines order ${over.ordered} in total, more than the balance (${over.balance})`
      );
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/client-purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          clientPoDate: formData.clientPoDate || null,
          deliverySchedule: formData.deliverySchedule || null,
          // deliveryDate is the column the detail screen shows as the CDD and
          // the floor for per-item CDDs; keep it equal to the committed date
          // rather than carrying two dates that can disagree.
          deliveryDate: formData.committedDeliveryDate || null,
          committedDeliveryDate: formData.committedDeliveryDate || null,
          contactEmail: formData.contactEmail || null,
          contactPhone: formData.contactPhone || null,
          billingAddressId: formData.billingAddressId || null,
          clientPoDocumentPath: formData.clientPoDocumentPath || null,
          clientPoDocumentName: formData.clientPoDocumentName || null,
          isDomesticDelivery: formData.isDomesticDelivery,
          shipmentAddress: formData.shipmentAddress || null,
          dispatchAddressId: formData.dispatchAddressId || null,
          ...chargePayload(charges),
          terms,
          billingAddressText: billingManual ? formData.billingAddressText : null,
          dispatchAddressText: dispatchManual ? formData.dispatchAddressText : null,
          gstRate,
          supplierState,
          clientState,
          bulkOverallRemark: bulkOverallRemark || null,
          items: selectedItems.map((item) => ({
            quotationItemId: item.id,
            product: item.product,
            itemDescription: item.itemDescription,
            material: item.material,
            additionalSpec: item.additionalSpec,
            sizeLabel: item.sizeLabel,
            od: item.od,
            wt: item.wt,
            ends: item.ends,
            uom: item.uom,
            hsnCode: item.hsnCode,
            qtyOrdered: item.qtyOrdered,
            unitRate: item.negotiatedRate,
            rateRemark: item.rateRemark || null,
            qtyRemark: item.qtyRemark || null,
            amount: item.qtyOrdered * item.negotiatedRate,
            deliveryDate: itemCdd(item) || null,
            remark: item.remark,
            poSlNo: item.poSlNo || null,
            poItemCode: item.poItemCode || null,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create client purchase order");
      }

      const data = await response.json();
      toast.success(`Client P.O. ${data.cpoNo} registered successfully`);
      router.push(`/client-purchase-orders/${data.id}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fmtAmount = (val: number) =>
    val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const currencySymbol = formData.currency === "INR" ? "\u20B9" : formData.currency;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Register Client Purchase Order"
        description="Capture client's Purchase Order and link it with the quotation"
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Client & Quotation Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Client P.O. Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client Name *</Label>
                <Select
                  value={formData.customerId}
                  onValueChange={handleCustomerChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Client" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                        {c.city ? ` (${c.city})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Reference Quotation No. *</Label>
                <Select
                  value={formData.quotationId}
                  onValueChange={handleQuotationChange}
                  disabled={!formData.customerId && filteredQuotations.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Quotation" />
                  </SelectTrigger>
                  <SelectContent>
                    {(formData.customerId ? filteredQuotations : quotations).map(
                      (q) => (
                        <SelectItem key={q.id} value={q.id}>
                          {q.quotationNo} - {q.customer?.name}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Client P.O. Number *</Label>
                <Input
                  value={formData.clientPoNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, clientPoNumber: e.target.value })
                  }
                  placeholder="Enter client's PO number"
                />
              </div>

              <div className="space-y-2">
                <Label>Client P.O. Date</Label>
                <Input
                  type="date"
                  value={formData.clientPoDate}
                  onChange={(e) =>
                    setFormData({ ...formData, clientPoDate: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Project Name</Label>
                <Input
                  value={formData.projectName}
                  onChange={(e) =>
                    setFormData({ ...formData, projectName: e.target.value })
                  }
                  placeholder="Enter project name"
                />
              </div>
            </div>

            {/* The contact who owns THIS order. Picking a saved contact fills
                all three fields; they stay editable for a one-off. Without an
                email and a phone number the acceptance letter and every
                follow-up have no one to go to. */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Client Contact Person</Label>
                {contacts.length > 0 && (
                  <Select
                    value={
                      contacts.find(
                        (c) => c.contactName === formData.contactPerson
                      )?.id || "MANUAL"
                    }
                    onValueChange={(value) => {
                      const c = contacts.find((x) => x.id === value);
                      setFormData((prev) => ({
                        ...prev,
                        contactPerson: c ? c.contactName : prev.contactPerson,
                        contactEmail: c ? c.email || "" : prev.contactEmail,
                        contactPhone: c ? c.phone || "" : prev.contactPhone,
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a saved contact" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MANUAL">— Enter manually —</SelectItem>
                      {contacts.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {[c.contactName, c.designation, c.department]
                            .filter(Boolean)
                            .join(" — ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Input
                  value={formData.contactPerson}
                  onChange={(e) =>
                    setFormData({ ...formData, contactPerson: e.target.value })
                  }
                  placeholder="Contact person name"
                />
              </div>

              <div className="space-y-2">
                <Label>Contact Email</Label>
                <Input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, contactEmail: e.target.value })
                  }
                  placeholder="name@client.com"
                />
              </div>

              <div className="space-y-2">
                <Label>Contact Number</Label>
                <Input
                  value={formData.contactPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, contactPhone: e.target.value })
                  }
                  placeholder="e.g. +91 98200 00000"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Payment Terms</Label>
                <Input
                  value={formData.paymentTerms}
                  onChange={(e) =>
                    setFormData({ ...formData, paymentTerms: e.target.value })
                  }
                  placeholder="e.g. 30 days from invoice"
                />
              </div>

              <div className="space-y-2">
                <Label>Delivery Terms</Label>
                <Input
                  value={formData.deliveryTerms}
                  onChange={(e) =>
                    setFormData({ ...formData, deliveryTerms: e.target.value })
                  }
                  placeholder="e.g. Ex-Works, FOB"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* The client writes delivery as a period, not a date — this is
                  free text ("10 weeks", "8-10 weeks", "ready stock") and the
                  CDD below is counted from the P.O. date. */}
              <div className="space-y-2">
                <Label>Delivery Schedule</Label>
                <Input
                  value={formData.deliverySchedule}
                  onChange={(e) =>
                    setFormData({ ...formData, deliverySchedule: e.target.value })
                  }
                  placeholder="e.g. 10 weeks from P.O. date"
                />
              </div>

              <div className="space-y-2">
                <Label>Committed Delivery Date (CDD)</Label>
                <Input
                  type="date"
                  value={formData.committedDeliveryDate}
                  onChange={(e) => {
                    setCddEdited(true);
                    setFormData((prev) => ({ ...prev, committedDeliveryDate: e.target.value }));
                  }}
                />
                {!cddEdited && formData.committedDeliveryDate && (
                  <p className="text-xs text-muted-foreground">
                    Calculated from the delivery schedule, or else the latest
                    item CDD — edit to override.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Currency</Label>
                <Input
                  value={formData.currency}
                  readOnly
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
              </div>
            </div>

            {formData.currency === "USD" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Exchange Rate (1 USD = ? INR)</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={formData.exchangeRate ?? ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        exchangeRate: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                    placeholder="Auto-filled from live rate"
                  />
                </div>
              </div>
            )}

            {/* Bill-to party. A client with more than one GST registration
                invoices from a different entity than the site it ships to, so
                the billing party is chosen here and kept separate from the
                dispatch address below. */}
            <div className="space-y-2">
              <Label>Billing Address</Label>
              <Select
                value={billingManual ? "MANUAL" : formData.billingAddressId || "NONE"}
                onValueChange={(value) => pickAddress("billing", value)}
                disabled={!formData.customerId || dispatchAddressesLoading}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !formData.customerId
                        ? "Select a customer first"
                        : "Customer master address"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Customer master address</SelectItem>
                  <SelectItem value="MANUAL">— Enter manually —</SelectItem>
                  {dispatchAddresses.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {[a.label, a.companyName, a.city, a.state].filter(Boolean).join(" — ") ||
                        a.addressLine1 ||
                        "Unnamed address"}
                    </SelectItem>
                  ))}
                  <SelectItem value={NEW_ADDRESS}>+ Add new address</SelectItem>
                </SelectContent>
              </Select>
              {billingManual && (
                <Textarea
                  value={formData.billingAddressText}
                  onChange={(e) => setFormData((prev) => ({ ...prev, billingAddressText: e.target.value }))}
                  placeholder="Billing name, address, GSTIN"
                  rows={3}
                />
              )}
              {selectedBillingAddress && (
                <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground space-y-0.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="float-right h-6 px-2 text-xs"
                    title="Edit for this P.O. only — the saved address is not changed"
                    onClick={() => pickAddress("billing", "MANUAL")}
                  >
                    Edit
                  </Button>
                  {selectedBillingAddress.companyName && (
                    <div className="font-medium text-foreground">
                      {selectedBillingAddress.companyName}
                    </div>
                  )}
                  <div>
                    {[
                      selectedBillingAddress.addressLine1,
                      selectedBillingAddress.city,
                      selectedBillingAddress.state,
                      selectedBillingAddress.pincode,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                  {selectedBillingAddress.gstNo && <div>GST: {selectedBillingAddress.gstNo}</div>}
                </div>
              )}
            </div>

            {/* The client's own signed P.O. document. Registering the order
                without keeping the source document means the only proof of what
                was ordered lives in somebody's inbox. */}
            <div className="space-y-2">
              <Label>Signed Client P.O. Copy</Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                disabled={uploadingPoDoc}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploadingPoDoc(true);
                  try {
                    const fd = new FormData();
                    fd.append("file", file);
                    const up = await fetch("/api/upload", { method: "POST", body: fd });
                    if (!up.ok) throw new Error("Upload failed");
                    const r = await up.json();
                    setFormData((prev) => ({
                      ...prev,
                      clientPoDocumentPath: r.filePath ?? "",
                      clientPoDocumentName: r.fileName ?? file.name,
                    }));
                    toast.success("P.O. copy attached");
                  } catch {
                    toast.error("Failed to upload the P.O. copy");
                  } finally {
                    setUploadingPoDoc(false);
                  }
                }}
              />
              {formData.clientPoDocumentPath && (
                <p className="text-xs text-muted-foreground">
                  Attached: {formData.clientPoDocumentName || "document"}
                </p>
              )}
            </div>

            {/* Ship-to site. A client PO routinely delivers to a project site
                rather than the billing address, and it is picked here so the
                sales order, dispatch note and invoice all inherit it instead
                of being asked again at dispatch. */}
            <div className="space-y-2">
              <Label>Dispatch Address</Label>
              <Select
                value={dispatchManual ? "MANUAL" : formData.dispatchAddressId || "NONE"}
                onValueChange={(value) => pickAddress("dispatch", value)}
                disabled={!formData.customerId || dispatchAddressesLoading}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !formData.customerId
                        ? "Select a customer first"
                        : dispatchAddressesLoading
                        ? "Loading addresses..."
                        : "Same as billing address"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Same as billing address</SelectItem>
                  <SelectItem value="MANUAL">— Enter manually —</SelectItem>
                  {dispatchAddresses.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {[a.label, a.companyName, a.city, a.state].filter(Boolean).join(" — ") ||
                        a.addressLine1 ||
                        "Unnamed address"}
                    </SelectItem>
                  ))}
                  <SelectItem value={NEW_ADDRESS}>+ Add new address</SelectItem>
                </SelectContent>
              </Select>
              {formData.customerId && !dispatchAddressesLoading && dispatchAddresses.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No saved sites for this customer — save one with
                  &quot;+ Add new address&quot;.
                </p>
              )}
              {dispatchManual && (
                <Textarea
                  value={formData.dispatchAddressText}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dispatchAddressText: e.target.value }))}
                  placeholder="Site name, delivery address, contact"
                  rows={3}
                />
              )}
              {selectedDispatchAddress && (
                <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground space-y-0.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="float-right h-6 px-2 text-xs"
                    title="Edit for this P.O. only — the saved address is not changed"
                    onClick={() => pickAddress("dispatch", "MANUAL")}
                  >
                    Edit
                  </Button>
                  {selectedDispatchAddress.companyName && (
                    <div className="font-medium text-foreground">
                      {selectedDispatchAddress.companyName}
                    </div>
                  )}
                  <div>
                    {[
                      selectedDispatchAddress.addressLine1,
                      selectedDispatchAddress.city,
                      selectedDispatchAddress.state,
                      selectedDispatchAddress.pincode,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                  {(selectedDispatchAddress.contactPerson || selectedDispatchAddress.contactNumber) && (
                    <div>
                      {[selectedDispatchAddress.contactPerson, selectedDispatchAddress.contactNumber]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  )}
                  {selectedDispatchAddress.gstNo && <div>GST: {selectedDispatchAddress.gstNo}</div>}
                </div>
              )}
            </div>

            {isInternational && (
              <div className="space-y-2">
                <Label>Domestic Delivery</Label>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={formData.isDomesticDelivery}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, isDomesticDelivery: checked }))
                    }
                  />
                  <span className="text-sm text-muted-foreground">
                    {formData.isDomesticDelivery ? "Yes — delivery within India" : "No — international delivery"}
                  </span>
                </div>
                {formData.isDomesticDelivery && (
                  <Textarea
                    placeholder="Shipment address (India)"
                    value={formData.shipmentAddress ?? ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, shipmentAddress: e.target.value }))
                    }
                    rows={2}
                  />
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                value={formData.remarks}
                onChange={(e) =>
                  setFormData({ ...formData, remarks: e.target.value })
                }
                placeholder="Any additional remarks"
                rows={1}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Quotation Items Selection */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle>Select Quotation Items</CardTitle>
                {quotationMeta && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Quotation: {quotationMeta.quotationNo} | Items with available
                    balance are pre-selected
                  </p>
                )}
              </div>
              {balanceItems.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectAllItems}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Import All Items
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectPartialItems}
                  >
                    <CheckSquare className="w-4 h-4 mr-2" />
                    Select Partial
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!formData.quotationId ? (
              <div className="text-center text-muted-foreground py-12">
                Select a quotation above to load items
              </div>
            ) : loadingBalance ? (
              <PageLoading />
            ) : balanceItems.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                No items found in this quotation
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">Select</TableHead>
                        <TableHead className="w-[50px]">S.No</TableHead>
                        <TableHead>Sl. No. (PO)</TableHead>
                        <TableHead>Item Code (PO)</TableHead>
                        <TableHead>Product Description</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead className="text-right w-[130px]">Qty Ordered</TableHead>
                        <TableHead>UOM</TableHead>
                        <TableHead className="w-[180px]">Qty Remark</TableHead>
                        <TableHead className="text-right w-[120px]">Negotiated Rate</TableHead>
                        <TableHead className="text-right">Diff</TableHead>
                        <TableHead className="w-[180px]">Rate Remark</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Item CDD</TableHead>
                        <TableHead className="w-[70px]">Split</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {balanceItems.map((item, index) => {
                        const isFullyOrdered = item.balanceQty <= 0;
                        return (
                          <Fragment key={item.rowKey ?? item.id}>
                          <TableRow
                            className={
                              isFullyOrdered
                                ? "opacity-50 bg-muted/30"
                                : item.selected
                                ? "bg-primary/5"
                                : ""
                            }
                          >
                            <TableCell>
                              <Checkbox
                                checked={item.selected}
                                disabled={isFullyOrdered}
                                onCheckedChange={() => toggleItemSelection(index)}
                              />
                            </TableCell>
                            <TableCell>
                              {item.sNo}
                              {item.rowKey && (
                                <Badge variant="outline" className="ml-1 px-1 py-0 text-[10px]">
                                  split
                                </Badge>
                              )}
                              {item.slNo && (
                                <div className="text-[10px] text-muted-foreground">
                                  Enq. {item.slNo}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Input
                                value={item.poSlNo ?? ""}
                                onChange={(e) => {
                                  const updated = [...balanceItems];
                                  updated[index] = { ...updated[index], poSlNo: e.target.value };
                                  setBalanceItems(updated);
                                }}
                                className="h-8 w-[80px]"
                                placeholder="—"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={item.poItemCode ?? ""}
                                onChange={(e) => {
                                  const updated = [...balanceItems];
                                  updated[index] = { ...updated[index], poItemCode: e.target.value };
                                  setBalanceItems(updated);
                                }}
                                className="h-8 w-[110px]"
                                placeholder="—"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="space-y-0.5">
                                <div className="font-medium text-sm">
                                  {item.product || "-"}
                                </div>
                                {item.itemDescription && (
                                  <div className="max-w-xs whitespace-pre-line text-xs text-muted-foreground">
                                    {item.itemDescription}
                                  </div>
                                )}
                                {item.material && (
                                  <div className="text-xs text-muted-foreground">
                                    {item.material}
                                    {item.additionalSpec
                                      ? ` / ${item.additionalSpec}`
                                      : ""}
                                  </div>
                                )}
                                {item.ends && (
                                  <div className="text-xs text-muted-foreground">
                                    Ends: {item.ends}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {item.sizeLabel || "-"}
                              {item.od && item.wt && (
                                <div className="text-xs text-muted-foreground">
                                  OD: {item.od} / WT: {item.wt}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {isFullyOrdered ? (
                                <span className="text-muted-foreground">-</span>
                              ) : (
                                <Input
                                  type="number"
                                  step="0.001"
                                  min="0"
                                  max={item.balanceQty}
                                  value={item.qtyOrdered || ""}
                                  onChange={(e) =>
                                    updateQtyOrdered(index, e.target.value)
                                  }
                                  className="h-8 w-[110px] text-right"
                                  disabled={!item.selected && !isFullyOrdered}
                                />
                              )}
                              {item.qtyOrdered > item.balanceQty && (
                                <div className="flex items-center gap-1 text-destructive text-[10px] mt-0.5">
                                  <AlertTriangle className="w-3 h-3" />
                                  Exceeds balance
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{item.uom || "Mtr"}</TableCell>

                            {/* Qty Remark (mandatory when the ordered qty is
                                not the full quoted balance) */}
                            <TableCell>
                              {item.selected && item.qtyOrdered !== item.balanceQty ? (
                                <Input
                                  className="w-[180px]"
                                  value={item.qtyRemark}
                                  onChange={(e) => {
                                    const updated = [...balanceItems];
                                    updated[index] = { ...updated[index], qtyRemark: e.target.value };
                                    setBalanceItems(updated);
                                  }}
                                  placeholder="Reason (required)"
                                />
                              ) : null}
                            </TableCell>

                            {/* Negotiated Rate (editable when selected) */}
                            <TableCell className="text-right">
                              {item.selected ? (
                                <Input
                                  type="number"
                                  className="w-[120px] text-right"
                                  value={item.negotiatedRate}
                                  onChange={(e) => {
                                    const updated = [...balanceItems];
                                    updated[index] = {
                                      ...updated[index],
                                      negotiatedRate: parseFloat(e.target.value) || 0,
                                    };
                                    setBalanceItems(updated);
                                  }}
                                  min={0}
                                  step={0.01}
                                />
                              ) : (
                                item.unitRate.toLocaleString("en-IN", { minimumFractionDigits: 2 })
                              )}
                            </TableCell>

                            {/* Diff */}
                            <TableCell className="text-right">
                              {item.selected && item.negotiatedRate !== item.unitRate ? (
                                <span className={item.negotiatedRate < item.unitRate ? "text-red-600" : "text-green-600"}>
                                  {item.negotiatedRate < item.unitRate ? "-" : "+"}
                                  {Math.abs(item.unitRate - item.negotiatedRate).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                  {" "}({item.unitRate !== 0 ? Math.abs(((item.unitRate - item.negotiatedRate) / item.unitRate) * 100).toFixed(1) : "0.0"}%)
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>

                            {/* Rate Remark (mandatory when rate differs) */}
                            <TableCell>
                              {item.selected && item.negotiatedRate !== item.unitRate ? (
                                <Input
                                  className="w-[180px]"
                                  value={item.rateRemark}
                                  onChange={(e) => {
                                    const updated = [...balanceItems];
                                    updated[index] = { ...updated[index], rateRemark: e.target.value };
                                    setBalanceItems(updated);
                                  }}
                                  placeholder="Remark (required)"
                                />
                              ) : null}
                            </TableCell>

                            <TableCell className="text-right font-medium">
                              {item.selected
                                ? (item.qtyOrdered * item.negotiatedRate).toLocaleString("en-IN", { minimumFractionDigits: 2 })
                                : "-"}
                            </TableCell>
                            <TableCell>
                              {item.selected && (
                                <Input
                                  type="date"
                                  className="w-[140px]"
                                  value={itemCdd(item)}
                                  onChange={(e) => {
                                    const updated = [...balanceItems];
                                    updated[index] = { ...updated[index], itemDeliveryDate: e.target.value, cddTyped: true };
                                    setBalanceItems(updated);
                                  }}
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {!isFullyOrdered && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    title="Copy line (split into another PO line)"
                                    onClick={() => copyRow(index)}
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {item.rowKey && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    title="Remove copied line"
                                    onClick={() => removeRow(index)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                          {/* §2.9 — material-code customer history sub-row */}
                          {materialHistory[item.id] && !item.rowKey && (
                            <TableRow className="border-0">
                              <TableCell colSpan={15} className="bg-muted/30 text-xs text-muted-foreground py-1 px-3">
                                {materialHistory[item.id].lastQuote
                                  ? `Last Quote: ₹${materialHistory[item.id].lastQuote!.rate.toLocaleString("en-IN", { minimumFractionDigits: 2 })} (${materialHistory[item.id].lastQuote!.quoteNo})`
                                  : "No past quote for this customer + material"}
                                {"  •  "}
                                {materialHistory[item.id].lastPO
                                  ? `Last PO: ₹${materialHistory[item.id].lastPO!.rate.toLocaleString("en-IN", { minimumFractionDigits: 2 })} (${materialHistory[item.id].lastPO!.poNo})${materialHistory[item.id].lastPO!.remark ? ` — ${materialHistory[item.id].lastPO!.remark}` : ""}`
                                  : "No past PO for this customer + material"}
                              </TableCell>
                            </TableRow>
                          )}
                          </Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Material Value Summary */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="text-sm text-muted-foreground">
                      {getSelectedItems().length} of {balanceItems.length} items
                      selected
                    </div>
                    <div className="text-base font-semibold">
                      {formData.currency === "USD" ? "USD " : ""}Material Value: {currencySymbol} {fmtAmount(commercials.materialValue)}
                      {formData.currency === "USD" && formData.exchangeRate ? (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          ≈ ₹{fmtAmount(commercials.materialValue * formData.exchangeRate)} INR
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Section 2b: Rate Negotiation Summary */}
        {getSelectedItems().length > 0 && (
          <Card>
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => setShowNegotiationSection((v) => !v)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Rate Negotiation Summary
                  {(() => {
                    const negotiatedCount = getSelectedItems().filter(
                      (i) => i.negotiatedRate !== i.unitRate
                    ).length;
                    return negotiatedCount > 0 ? (
                      <Badge variant="secondary">{negotiatedCount} item{negotiatedCount > 1 ? "s" : ""} with negotiated rates</Badge>
                    ) : (
                      <Badge variant="outline">No rates changed</Badge>
                    );
                  })()}
                </CardTitle>
                <span className="text-muted-foreground text-sm">
                  {showNegotiationSection ? "▲ Collapse" : "▼ Expand"}
                </span>
              </div>
            </CardHeader>
            {showNegotiationSection && (
              <CardContent className="space-y-4">
                {/* Bulk Actions row */}
                <div className="flex flex-wrap items-end gap-3 bg-muted/30 p-3 rounded-md">
                  <div className="space-y-1">
                    <Label className="text-xs">Bulk Discount %</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={bulkDiscountPercent}
                      onChange={(e) => setBulkDiscountPercent(e.target.value)}
                      placeholder="e.g. 5"
                      className="h-8 w-[120px]"
                    />
                  </div>
                  <div className="space-y-1 flex-1 min-w-[220px]">
                    <Label className="text-xs">Overall Remark (required)</Label>
                    <Input
                      value={bulkOverallRemark}
                      onChange={(e) => setBulkOverallRemark(e.target.value)}
                      placeholder="Reason for rate negotiation"
                      className="h-8"
                    />
                  </div>
                  <Button type="button" size="sm" onClick={applyBulkDiscount}>
                    Apply to All Selected
                  </Button>
                </div>

                {/* Summary Table */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">S.No</TableHead>
                        <TableHead>Item Description</TableHead>
                        <TableHead className="text-right">Quoted Rate</TableHead>
                        <TableHead className="text-right w-[130px]">Order Rate</TableHead>
                        <TableHead className="text-right">Diff (₹)</TableHead>
                        <TableHead className="text-right">Diff (%)</TableHead>
                        <TableHead className="w-[200px]">Remark</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getSelectedItems().map((item) => {
                        // By reference, not id: a copied row shares its id.
                        const origIndex = balanceItems.indexOf(item);
                        const diff = item.negotiatedRate - item.unitRate;
                        const diffPct = item.unitRate !== 0 ? (diff / item.unitRate) * 100 : 0;
                        return (
                          <TableRow key={item.rowKey ?? item.id} className={item.negotiatedRate !== item.unitRate ? "bg-amber-50/40" : ""}>
                            <TableCell>{item.sNo}</TableCell>
                            <TableCell>
                              <div className="font-medium text-sm">{item.product || "-"}</div>
                              {item.itemDescription && (
                                <div className="max-w-xs whitespace-pre-line text-xs text-muted-foreground">{item.itemDescription}</div>
                              )}
                              {item.material && (
                                <div className="text-xs text-muted-foreground">{item.material}{item.additionalSpec ? ` / ${item.additionalSpec}` : ""}</div>
                              )}
                              {item.sizeLabel && (
                                <div className="text-xs text-muted-foreground">{item.sizeLabel}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {item.unitRate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                step="0.01"
                                min={0}
                                value={item.negotiatedRate}
                                onChange={(e) => {
                                  if (origIndex < 0) return;
                                  const updated = [...balanceItems];
                                  updated[origIndex] = {
                                    ...updated[origIndex],
                                    negotiatedRate: parseFloat(e.target.value) || 0,
                                  };
                                  setBalanceItems(updated);
                                }}
                                className="h-8 w-[120px] text-right"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              {diff !== 0 ? (
                                <span className={diff < 0 ? "text-red-600" : "text-green-600"}>
                                  {diff > 0 ? "+" : ""}{diff.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {diff !== 0 ? (
                                <span className={diff < 0 ? "text-red-600" : "text-green-600"}>
                                  {diffPct > 0 ? "+" : ""}{diffPct.toFixed(2)}%
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Input
                                value={item.rateRemark}
                                onChange={(e) => {
                                  if (origIndex < 0) return;
                                  const updated = [...balanceItems];
                                  updated[origIndex] = { ...updated[origIndex], rateRemark: e.target.value };
                                  setBalanceItems(updated);
                                }}
                                placeholder={item.negotiatedRate !== item.unitRate ? "Remark (required)" : "Optional"}
                                className="h-8 w-[190px]"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Total Impact */}
                {(() => {
                  const selected = getSelectedItems();
                  const totalQuoted = selected.reduce((s, i) => s + i.unitRate * i.qtyOrdered, 0);
                  const totalNegotiated = selected.reduce((s, i) => s + i.negotiatedRate * i.qtyOrdered, 0);
                  const totalDiff = totalNegotiated - totalQuoted;
                  const totalDiffPct = totalQuoted !== 0 ? (totalDiff / totalQuoted) * 100 : 0;
                  if (totalDiff === 0) return null;
                  return (
                    <div className="mt-2 pt-3 border-t flex justify-end gap-6 text-sm">
                      <span className="text-muted-foreground">Total Impact:</span>
                      <span className={totalDiff < 0 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
                        {totalDiff > 0 ? "+" : ""}
                        {currencySymbol} {fmtAmount(Math.abs(totalDiff))} ({totalDiff < 0 ? "-" : "+"}{Math.abs(totalDiffPct).toFixed(2)}%)
                      </span>
                    </div>
                  );
                })()}
              </CardContent>
            )}
          </Card>
        )}

        {/* Terms & Conditions: copied from the quotation's offer terms; edit,
            add, remove or untick them for this order. Saved with the PO and
            printed on the PO acceptance letter. */}
        {formData.quotationId && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Terms &amp; Conditions
                  <span className="text-xs text-muted-foreground font-normal">
                    ({terms.filter((t) => t.isIncluded).length} included, from the quotation)
                  </span>
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTerms((prev) => [...prev, { termName: "", termValue: "", isIncluded: true }])}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Term
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {terms.length === 0 ? (
                <p className="text-sm text-muted-foreground">No terms on the quotation. Add any that apply to this order.</p>
              ) : (
                <div className="space-y-0.5">
                  {terms.map((term, index) => (
                    <div key={index} className="flex gap-3 items-start rounded-md py-0.5 px-2 hover:bg-muted/40 transition-colors">
                      <Checkbox
                        checked={term.isIncluded}
                        onCheckedChange={(c) =>
                          setTerms((prev) => prev.map((t, i) => (i === index ? { ...t, isIncluded: !!c } : t)))
                        }
                        className="mt-2.5"
                      />
                      <div className="flex-1 grid grid-cols-[180px_1fr] gap-3 items-start">
                        <Input
                          value={term.termName}
                          onChange={(e) =>
                            setTerms((prev) => prev.map((t, i) => (i === index ? { ...t, termName: e.target.value } : t)))
                          }
                          placeholder="Term name"
                          maxLength={191}
                          className={!term.isIncluded ? "opacity-50" : ""}
                        />
                        <Input
                          value={term.termValue}
                          onChange={(e) =>
                            setTerms((prev) => prev.map((t, i) => (i === index ? { ...t, termValue: e.target.value } : t)))
                          }
                          placeholder="Term value..."
                          className={!term.isIncluded ? "opacity-50" : ""}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Remove term"
                        onClick={() => setTerms((prev) => prev.filter((_, i) => i !== index))}
                        className="text-destructive hover:text-destructive mt-0.5 shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Section 3: Additional Charges */}
        {getSelectedItems().length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Additional Charges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Charge Type</TableHead>
                    <TableHead className="w-[200px]">Amount ({currencySymbol})</TableHead>
                    <TableHead className="w-[150px]">Tax Applicable</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {charges.map((charge, index) => (
                    <TableRow key={charge.key}>
                      <TableCell className="font-medium">
                        {charge.label}
                        {charge.key === "otherCharges" && (
                          <Input
                            value={charge.description ?? ""}
                            onChange={(e) => updateCharge(index, "description", e.target.value)}
                            placeholder="What is this charge for?"
                            maxLength={191}
                            className="h-8 mt-1 font-normal"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={charge.amount || ""}
                          onChange={(e) => updateCharge(index, "amount", e.target.value)}
                          placeholder="0.00"
                          className="h-9 w-[180px]"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={charge.taxApplicable}
                            onCheckedChange={(checked) =>
                              updateCharge(index, "taxApplicable", checked)
                            }
                          />
                          <span className="text-sm text-muted-foreground">
                            {charge.taxApplicable ? "Yes" : "No"}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-3 pt-3 border-t flex justify-end">
                <span className="text-sm font-semibold">
                  Total Additional Charges: {currencySymbol}{" "}
                  {fmtAmount(commercials.additionalChargesTotal)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 4: GST Calculation */}
        {getSelectedItems().length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                GST Calculation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* State & GST Rate inputs — only shown when GST applies */}
              {commercials.gstApplies && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Supplier State</Label>
                      <Input
                        value={supplierState}
                        onChange={(e) => setSupplierState(e.target.value)}
                        placeholder="e.g. Maharashtra"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Client State</Label>
                      <Input
                        value={clientState}
                        onChange={(e) => setClientState(e.target.value)}
                        placeholder="e.g. Gujarat"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>GST Rate (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="28"
                        value={gstRate || ""}
                        onChange={(e) => setGstRate(parseFloat(e.target.value) || 0)}
                        placeholder="e.g. 18"
                      />
                    </div>
                  </div>

                  {supplierState && clientState && (
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={commercials.isInterState ? "destructive" : "default"}
                      >
                        {commercials.isInterState ? "Inter-State (IGST)" : "Intra-State (CGST + SGST)"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {supplierState} → {clientState}
                      </span>
                    </div>
                  )}
                </>
              )}

              {!commercials.gstApplies && (
                <p className="text-sm text-muted-foreground">
                  GST not applicable — international delivery (USD order, delivery outside India).
                </p>
              )}

              <Separator />

              {/* Summary Table */}
              <div className="max-w-md ml-auto">
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">
                        {formData.currency === "USD" ? "USD Material Value" : "Material Value"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div>
                          {currencySymbol} {fmtAmount(commercials.materialValue)}
                        </div>
                        {formData.currency === "USD" && formData.exchangeRate ? (
                          <div className="text-xs text-muted-foreground">
                            ≈ ₹{fmtAmount(commercials.materialValue * formData.exchangeRate)} INR
                          </div>
                        ) : null}
                      </TableCell>
                    </TableRow>
                    {commercials.additionalChargesTotal > 0 && (
                      <TableRow>
                        <TableCell className="font-medium">Additional Charges</TableCell>
                        <TableCell className="text-right">
                          {currencySymbol} {fmtAmount(commercials.additionalChargesTotal)}
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow className="border-t-2">
                      <TableCell className="font-semibold">
                        {formData.currency === "USD" ? "USD Subtotal" : "Taxable Amount"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        <div>
                          {currencySymbol} {fmtAmount(commercials.taxableAmount)}
                        </div>
                        {formData.currency === "USD" && formData.exchangeRate ? (
                          <div className="text-xs text-muted-foreground font-normal">
                            ≈ ₹{fmtAmount(commercials.taxableAmount * formData.exchangeRate)} INR
                          </div>
                        ) : null}
                      </TableCell>
                    </TableRow>
                    {commercials.gstApplies && !commercials.isInterState && gstRate > 0 && (
                      <>
                        <TableRow>
                          <TableCell className="text-muted-foreground">
                            CGST @ {gstRate / 2}%
                          </TableCell>
                          <TableCell className="text-right">
                            {currencySymbol} {fmtAmount(commercials.cgst)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="text-muted-foreground">
                            SGST @ {gstRate / 2}%
                          </TableCell>
                          <TableCell className="text-right">
                            {currencySymbol} {fmtAmount(commercials.sgst)}
                          </TableCell>
                        </TableRow>
                      </>
                    )}
                    {commercials.gstApplies && commercials.isInterState && gstRate > 0 && (
                      <TableRow>
                        <TableCell className="text-muted-foreground">
                          IGST @ {gstRate}%
                        </TableCell>
                        <TableCell className="text-right">
                          {currencySymbol} {fmtAmount(commercials.igst)}
                        </TableCell>
                      </TableRow>
                    )}
                    {commercials.roundOff !== 0 && (
                      <TableRow>
                        <TableCell className="text-muted-foreground">Round Off</TableCell>
                        <TableCell className="text-right">
                          {currencySymbol} {commercials.roundOff > 0 ? "+" : ""}
                          {fmtAmount(commercials.roundOff)}
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow className="border-t-2 bg-muted/30">
                      <TableCell className="font-bold text-base">Grand Total</TableCell>
                      <TableCell className="text-right font-bold text-base">
                        <div>
                          {currencySymbol} {fmtAmount(commercials.grandTotal)}
                        </div>
                        {formData.currency === "USD" && formData.exchangeRate ? (
                          <div className="text-sm text-muted-foreground font-normal">
                            ≈ ₹{fmtAmount(commercials.grandTotal * formData.exchangeRate)} INR
                          </div>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || getSelectedItems().length === 0}
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Registering..." : "Register Client P.O."}
          </Button>
        </div>
      </form>

      {/* "+ Add new address" from the Billing or Dispatch Address select.
          Kept outside the P.O. <form>: React bubbles a portal's submit event
          to its React parents, so inside it saving the address would also
          submit the P.O. */}
      <Dialog
        open={newAddressFor !== null}
        onOpenChange={(open) => {
          if (!open) setNewAddressFor(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <form onSubmit={saveNewAddress}>
            <DialogHeader>
              <DialogTitle>New Customer Address</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="na-label">Address Label</Label>
                  <Input
                    id="na-label"
                    value={newAddress.label}
                    onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                    placeholder='e.g. "Head Office", "Site - Pune"'
                    maxLength={191}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="na-company">Company Name</Label>
                  <Input
                    id="na-company"
                    value={newAddress.companyName}
                    onChange={(e) => setNewAddress({ ...newAddress, companyName: e.target.value })}
                    placeholder="If different from the client name"
                    maxLength={191}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="na-addr1">Address Line 1</Label>
                <Input
                  id="na-addr1"
                  value={newAddress.addressLine1}
                  onChange={(e) => setNewAddress({ ...newAddress, addressLine1: e.target.value })}
                  placeholder="Street address, building, floor"
                  maxLength={191}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="na-addr2">Address Line 2</Label>
                <Input
                  id="na-addr2"
                  value={newAddress.addressLine2}
                  onChange={(e) => setNewAddress({ ...newAddress, addressLine2: e.target.value })}
                  placeholder="Area, landmark (optional)"
                  maxLength={191}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="na-city">City</Label>
                  <Input
                    id="na-city"
                    value={newAddress.city}
                    onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                    placeholder="City"
                    maxLength={191}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="na-state">State</Label>
                  <Select
                    value={newAddress.state}
                    onValueChange={(v) => setNewAddress({ ...newAddress, state: v })}
                  >
                    <SelectTrigger id="na-state">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="na-pin">PIN Code</Label>
                  <Input
                    id="na-pin"
                    value={newAddress.pincode}
                    onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })}
                    placeholder="6-digit PIN"
                    maxLength={6}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="na-contact">Contact Person</Label>
                  <Input
                    id="na-contact"
                    value={newAddress.contactPerson}
                    onChange={(e) => setNewAddress({ ...newAddress, contactPerson: e.target.value })}
                    placeholder="Contact name"
                    maxLength={191}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="na-phone">Contact Number</Label>
                  <Input
                    id="na-phone"
                    value={newAddress.contactNumber}
                    onChange={(e) => setNewAddress({ ...newAddress, contactNumber: e.target.value })}
                    placeholder="+91 XXXXX XXXXX"
                    maxLength={191}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="na-gst">GST No.</Label>
                  <Input
                    id="na-gst"
                    value={newAddress.gstNo}
                    onChange={(e) => setNewAddress({ ...newAddress, gstNo: e.target.value.toUpperCase() })}
                    placeholder="e.g. 27AAAAA0000A1Z5"
                    maxLength={15}
                    className="font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setNewAddressFor(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingAddress}>
                {savingAddress ? "Saving..." : "Save & Select Address"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
