"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Circle,
  Search,
  ChevronLeft,
  ChevronRight,
  Landmark,
  IndianRupee,
  ListChecks,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

// --- Types ---

interface PaymentReceipt {
  id: string;
  receiptNo: string;
  receiptDate: string;
  amountReceived: number;
  paymentMode: string;
  referenceNo: string | null;
  bankName: string | null;
  chequeNo?: string | null;
  tdsAmount?: number;
  remarks: string | null;
  customer?: {
    id: string;
    name: string;
  } | null;
  invoice?: {
    id: string;
    invoiceNo: string;
    invoiceDate: string;
    totalAmount: number;
    status: string;
  } | null;
}

interface ReconciliationData {
  reconciled: boolean;
  bankDate: string;
  bankRef: string;
  remarks: string;
  reconciledAt: string;
}

type ReconciliationMap = Record<string, ReconciliationData>;

type FilterStatus = "ALL" | "UNRECONCILED" | "RECONCILED";

const STORAGE_KEY = "erp_bank_reconciliation";

// --- Helpers ---

function loadReconciliationMap(): ReconciliationMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ReconciliationMap;
  } catch {
    return {};
  }
}

function saveReconciliationMap(map: ReconciliationMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(value);
}

// --- Page Component ---

export default function BankReconciliationPage() {
  // Data
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconMap, setReconMap] = useState<ReconciliationMap>({});

  // Filters & search
  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Selection
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  // Reconciliation form (single)
  const [formBankDate, setFormBankDate] = useState("");
  const [formBankRef, setFormBankRef] = useState("");
  const [formRemarks, setFormRemarks] = useState("");

  // Bulk dialog
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkBankDate, setBulkBankDate] = useState("");
  const [bulkBankRef, setBulkBankRef] = useState("");
  const [bulkRemarks, setBulkRemarks] = useState("");

  // Pagination
  const [page, setPage] = useState(0);
  const pageSize = 15;

  // Load data on mount
  useEffect(() => {
    setReconMap(loadReconciliationMap());
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/dispatch/payments");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setReceipts(data.paymentReceipts || []);
    } catch (error) {
      console.error("Failed to fetch payment receipts:", error);
      toast.error("Failed to load payment receipts");
    } finally {
      setLoading(false);
    }
  };

  // Persist reconciliation map whenever it changes
  const updateReconMap = useCallback((newMap: ReconciliationMap) => {
    setReconMap(newMap);
    saveReconciliationMap(newMap);
  }, []);

  // Check reconciliation status
  const isReconciled = useCallback(
    (id: string) => !!reconMap[id]?.reconciled,
    [reconMap]
  );

  // Filter and search
  const filteredReceipts = useMemo(() => {
    let list = receipts;

    // Apply status filter
    if (filter === "RECONCILED") {
      list = list.filter((r) => isReconciled(r.id));
    } else if (filter === "UNRECONCILED") {
      list = list.filter((r) => !isReconciled(r.id));
    }

    // Apply search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (r) =>
          r.receiptNo?.toLowerCase().includes(term) ||
          r.customer?.name?.toLowerCase().includes(term) ||
          r.referenceNo?.toLowerCase().includes(term) ||
          r.bankName?.toLowerCase().includes(term) ||
          r.invoice?.invoiceNo?.toLowerCase().includes(term)
      );
    }

    return list;
  }, [receipts, filter, searchTerm, isReconciled]);

  // Pagination
  const totalPages = Math.ceil(filteredReceipts.length / pageSize);
  const pagedReceipts = filteredReceipts.slice(
    page * pageSize,
    (page + 1) * pageSize
  );

  // Reset page when filter/search changes
  useEffect(() => {
    setPage(0);
  }, [filter, searchTerm]);

  // Summary calculations
  const summary = useMemo(() => {
    let totalUnreconciled = 0;
    let totalReconciled = 0;
    let countUnreconciled = 0;
    let countReconciled = 0;

    receipts.forEach((r) => {
      const amount = Number(r.amountReceived) || 0;
      if (isReconciled(r.id)) {
        totalReconciled += amount;
        countReconciled++;
      } else {
        totalUnreconciled += amount;
        countUnreconciled++;
      }
    });

    return {
      totalUnreconciled,
      totalReconciled,
      countUnreconciled,
      countReconciled,
    };
  }, [receipts, isReconciled]);

  // Selected receipt
  const selectedReceipt = useMemo(
    () => receipts.find((r) => r.id === selectedId) || null,
    [receipts, selectedId]
  );

  // When selecting a receipt, populate form if already reconciled
  useEffect(() => {
    if (selectedId && reconMap[selectedId]) {
      const data = reconMap[selectedId];
      setFormBankDate(data.bankDate || "");
      setFormBankRef(data.bankRef || "");
      setFormRemarks(data.remarks || "");
    } else {
      setFormBankDate("");
      setFormBankRef("");
      setFormRemarks("");
    }
  }, [selectedId, reconMap]);

  // Handle single reconciliation
  const handleReconcile = () => {
    if (!selectedId) return;
    if (!formBankDate) {
      toast.error("Bank statement date is required");
      return;
    }

    const newMap = { ...reconMap };
    newMap[selectedId] = {
      reconciled: true,
      bankDate: formBankDate,
      bankRef: formBankRef,
      remarks: formRemarks,
      reconciledAt: new Date().toISOString(),
    };
    updateReconMap(newMap);
    toast.success("Payment receipt marked as reconciled");
  };

  // Handle un-reconcile
  const handleUnreconcile = () => {
    if (!selectedId) return;
    const newMap = { ...reconMap };
    delete newMap[selectedId];
    updateReconMap(newMap);
    setFormBankDate("");
    setFormBankRef("");
    setFormRemarks("");
    toast.success("Reconciliation removed");
  };

  // Checkbox toggling
  const toggleChecked = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAllChecked = () => {
    const unreconciledOnPage = pagedReceipts.filter(
      (r) => !isReconciled(r.id)
    );
    const allChecked = unreconciledOnPage.every((r) => checkedIds.has(r.id));
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        unreconciledOnPage.forEach((r) => next.delete(r.id));
      } else {
        unreconciledOnPage.forEach((r) => next.add(r.id));
      }
      return next;
    });
  };

  // Bulk reconcile
  const handleBulkReconcile = () => {
    if (checkedIds.size === 0) {
      toast.error("No receipts selected");
      return;
    }
    setBulkBankDate(format(new Date(), "yyyy-MM-dd"));
    setBulkBankRef("");
    setBulkRemarks("");
    setBulkDialogOpen(true);
  };

  const confirmBulkReconcile = () => {
    if (!bulkBankDate) {
      toast.error("Bank statement date is required");
      return;
    }

    const newMap = { ...reconMap };
    checkedIds.forEach((id) => {
      newMap[id] = {
        reconciled: true,
        bankDate: bulkBankDate,
        bankRef: bulkBankRef,
        remarks: bulkRemarks,
        reconciledAt: new Date().toISOString(),
      };
    });
    updateReconMap(newMap);
    toast.success(`${checkedIds.size} receipt(s) marked as reconciled`);
    setCheckedIds(new Set());
    setBulkDialogOpen(false);
  };

  // Checked count for unreconciled only
  const checkedCount = checkedIds.size;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bank Reconciliation"
        description="Match payment receipts with bank statement entries"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-yellow-100 p-2.5 dark:bg-yellow-900/30">
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unreconciled</p>
                <p className="text-2xl font-bold">
                  {summary.countUnreconciled}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-100 p-2.5 dark:bg-red-900/30">
                <IndianRupee className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Unreconciled Amount
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(summary.totalUnreconciled)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2.5 dark:bg-green-900/30">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reconciled</p>
                <p className="text-2xl font-bold">
                  {summary.countReconciled}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2.5 dark:bg-green-900/30">
                <Landmark className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Reconciled Amount
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(summary.totalReconciled)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content: Two Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: Receipt List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5" />
                  Payment Receipts
                </CardTitle>
                {checkedCount > 0 && (
                  <Button size="sm" onClick={handleBulkReconcile}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Reconcile Selected ({checkedCount})
                  </Button>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by receipt no, customer, reference..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select
                  value={filter}
                  onValueChange={(v) => setFilter(v as FilterStatus)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Receipts</SelectItem>
                    <SelectItem value="UNRECONCILED">Unreconciled</SelectItem>
                    <SelectItem value="RECONCILED">Reconciled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <p className="text-muted-foreground">
                    Loading payment receipts...
                  </p>
                </div>
              ) : filteredReceipts.length === 0 ? (
                <div className="flex items-center justify-center h-48">
                  <p className="text-muted-foreground">
                    No payment receipts found.
                  </p>
                </div>
              ) : (
                <>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px]">
                            <Checkbox
                              checked={
                                pagedReceipts.filter(
                                  (r) => !isReconciled(r.id)
                                ).length > 0 &&
                                pagedReceipts
                                  .filter((r) => !isReconciled(r.id))
                                  .every((r) => checkedIds.has(r.id))
                              }
                              onCheckedChange={toggleAllChecked}
                            />
                          </TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Receipt No</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Mode</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Reference</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pagedReceipts.map((r) => {
                          const reconciled = isReconciled(r.id);
                          const isSelected = selectedId === r.id;
                          return (
                            <TableRow
                              key={r.id}
                              className={`cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-accent"
                                  : "hover:bg-muted/50"
                              }`}
                              onClick={() => setSelectedId(r.id)}
                            >
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                {!reconciled && (
                                  <Checkbox
                                    checked={checkedIds.has(r.id)}
                                    onCheckedChange={() => toggleChecked(r.id)}
                                  />
                                )}
                              </TableCell>
                              <TableCell>
                                {reconciled ? (
                                  <Badge className="bg-green-500 hover:bg-green-600 text-white">
                                    Reconciled
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">Pending</Badge>
                                )}
                              </TableCell>
                              <TableCell className="font-mono text-sm font-medium">
                                {r.receiptNo}
                              </TableCell>
                              <TableCell className="text-sm">
                                {r.receiptDate
                                  ? format(
                                      new Date(r.receiptDate),
                                      "dd MMM yyyy"
                                    )
                                  : "-"}
                              </TableCell>
                              <TableCell className="text-right font-mono font-medium">
                                {formatCurrency(Number(r.amountReceived) || 0)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">
                                  {r.paymentMode}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-[150px] truncate text-sm">
                                {r.customer?.name || "-"}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {r.referenceNo || "-"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4">
                      <p className="text-sm text-muted-foreground">
                        Showing {page * pageSize + 1}-
                        {Math.min(
                          (page + 1) * pageSize,
                          filteredReceipts.length
                        )}{" "}
                        of {filteredReceipts.length}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(page - 1)}
                          disabled={page === 0}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">
                          Page {page + 1} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(page + 1)}
                          disabled={page >= totalPages - 1}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: Reconciliation Detail / Form */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Landmark className="h-5 w-5" />
                Reconciliation
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedReceipt ? (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <Circle className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">
                    Select a payment receipt from the list to view details and
                    reconcile.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Receipt Details */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Receipt No
                        </p>
                        <p className="font-mono font-medium text-sm">
                          {selectedReceipt.receiptNo}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Date</p>
                        <p className="text-sm">
                          {selectedReceipt.receiptDate
                            ? format(
                                new Date(selectedReceipt.receiptDate),
                                "dd MMM yyyy"
                              )
                            : "-"}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Amount</p>
                        <p className="text-lg font-bold">
                          {formatCurrency(
                            Number(selectedReceipt.amountReceived) || 0
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Mode</p>
                        <Badge variant="secondary">
                          {selectedReceipt.paymentMode}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Customer</p>
                      <p className="text-sm font-medium">
                        {selectedReceipt.customer?.name || "-"}
                      </p>
                    </div>
                    {selectedReceipt.invoice && (
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Invoice
                        </p>
                        <p className="text-sm font-mono">
                          {selectedReceipt.invoice.invoiceNo}
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Reference No
                        </p>
                        <p className="text-sm">
                          {selectedReceipt.referenceNo || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Bank</p>
                        <p className="text-sm">
                          {selectedReceipt.bankName || "-"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Reconciliation status / form */}
                  {isReconciled(selectedReceipt.id) ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-medium">Reconciled</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Bank Statement Date
                          </p>
                          <p className="text-sm">
                            {reconMap[selectedReceipt.id]?.bankDate
                              ? format(
                                  new Date(
                                    reconMap[selectedReceipt.id].bankDate
                                  ),
                                  "dd MMM yyyy"
                                )
                              : "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Bank Reference
                          </p>
                          <p className="text-sm">
                            {reconMap[selectedReceipt.id]?.bankRef || "-"}
                          </p>
                        </div>
                      </div>
                      {reconMap[selectedReceipt.id]?.remarks && (
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Remarks
                          </p>
                          <p className="text-sm">
                            {reconMap[selectedReceipt.id].remarks}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Reconciled At
                        </p>
                        <p className="text-sm">
                          {reconMap[selectedReceipt.id]?.reconciledAt
                            ? format(
                                new Date(
                                  reconMap[selectedReceipt.id].reconciledAt
                                ),
                                "dd MMM yyyy, hh:mm a"
                              )
                            : "-"}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={handleUnreconcile}
                      >
                        Remove Reconciliation
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm font-medium">
                        Mark as Reconciled
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor="bankDate" className="text-xs">
                          Bank Statement Date *
                        </Label>
                        <Input
                          id="bankDate"
                          type="date"
                          value={formBankDate}
                          onChange={(e) => setFormBankDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bankRef" className="text-xs">
                          Bank Reference Number
                        </Label>
                        <Input
                          id="bankRef"
                          value={formBankRef}
                          onChange={(e) => setFormBankRef(e.target.value)}
                          placeholder="Bank txn reference"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reconRemarks" className="text-xs">
                          Remarks
                        </Label>
                        <Textarea
                          id="reconRemarks"
                          value={formRemarks}
                          onChange={(e) => setFormRemarks(e.target.value)}
                          rows={2}
                          placeholder="Optional notes..."
                        />
                      </div>
                      <Button
                        className="w-full"
                        onClick={handleReconcile}
                        disabled={!formBankDate}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Reconcile
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bulk Reconcile Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Reconcile</DialogTitle>
            <DialogDescription>
              Mark {checkedCount} selected payment receipt(s) as reconciled.
              Enter the common bank statement details below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="bulkBankDate">Bank Statement Date *</Label>
              <Input
                id="bulkBankDate"
                type="date"
                value={bulkBankDate}
                onChange={(e) => setBulkBankDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulkBankRef">Bank Reference Number</Label>
              <Input
                id="bulkBankRef"
                value={bulkBankRef}
                onChange={(e) => setBulkBankRef(e.target.value)}
                placeholder="Common bank reference (optional)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulkRemarks">Remarks</Label>
              <Textarea
                id="bulkRemarks"
                value={bulkRemarks}
                onChange={(e) => setBulkRemarks(e.target.value)}
                rows={2}
                placeholder="Optional remarks..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={confirmBulkReconcile} disabled={!bulkBankDate}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Reconcile {checkedCount} Receipt(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
