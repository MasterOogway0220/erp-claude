"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/shared/page-header";
import { PageLoading } from "@/components/shared/page-loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HeatMTCDoc {
  id: string;
  mtcNo: string;
  mtcDate: string | null;
  fileUrl: string | null;
}

interface HeatEntry {
  id: string;
  heatNo: string;
  lengthMtr: string | null;
  pieces: number | null;
  make: string | null;
  mtcDocuments: HeatMTCDoc[];
}

interface InspectionPrepItem {
  id: string;
  description: string | null;
  sizeLabel: string | null;
  uom: string | null;
  status: string;
  heatEntries: HeatEntry[];
}

interface InspectionPrep {
  id: string;
  prepNo: string;
  status: string;
  createdAt: string;
  purchaseOrder: { id: string; poNo: string } | null;
  warehouseIntimation: { id: string; mprNo: string } | null;
  preparedBy: { id: string; name: string } | null;
  items: InspectionPrepItem[];
}

interface Customer {
  id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function InspectionPrepDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "";
  const isQA = ["QC", "MANAGEMENT", "ADMIN", "SUPER_ADMIN"].includes(userRole);

  const [prep, setPrep] = useState<InspectionPrep | null>(null);
  const [loading, setLoading] = useState(true);

  // Expanded items state (keyed by item id)
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  // Generate offer dialog
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [generating, setGenerating] = useState(false);

  // Offer selection: { [itemId]: { [heatId]: { selected: boolean, pieces: number } } }
  const [offerSelection, setOfferSelection] = useState<
    Record<string, Record<string, { selected: boolean; pieces: number }>>
  >({});

  useEffect(() => {
    fetchPrep();
  }, [id]);

  const fetchPrep = async () => {
    try {
      const res = await fetch(`/api/quality/inspection-prep/${id}`);
      if (res.ok) {
        const data = await res.json();
        setPrep(data);
      } else {
        toast.error("Failed to load inspection prep");
      }
    } catch {
      toast.error("Failed to load inspection prep");
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (itemId: string) => {
    setExpandedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  // -------------------------------------------------------------------------
  // Offer dialog helpers
  // -------------------------------------------------------------------------
  const openOfferDialog = async () => {
    try {
      const res = await fetch("/api/customers?limit=500");
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
      }
    } catch {
      toast.error("Failed to load customers");
    }

    // Initialise selection with all heats selected at their full piece count
    if (prep) {
      const sel: Record<string, Record<string, { selected: boolean; pieces: number }>> = {};
      for (const item of prep.items) {
        sel[item.id] = {};
        for (const heat of item.heatEntries) {
          sel[item.id][heat.id] = { selected: true, pieces: heat.pieces ?? 0 };
        }
      }
      setOfferSelection(sel);
    }
    setSelectedCustomerId("");
    setOfferDialogOpen(true);
  };

  const toggleItemSelection = (itemId: string, checked: boolean) => {
    setOfferSelection((prev) => {
      const next = { ...prev };
      const itemSel = { ...next[itemId] };
      for (const heatId of Object.keys(itemSel)) {
        itemSel[heatId] = { ...itemSel[heatId], selected: checked };
      }
      next[itemId] = itemSel;
      return next;
    });
  };

  const toggleHeatSelection = (itemId: string, heatId: string, checked: boolean) => {
    setOfferSelection((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [heatId]: { ...prev[itemId][heatId], selected: checked },
      },
    }));
  };

  const updateHeatPieces = (itemId: string, heatId: string, pieces: number) => {
    setOfferSelection((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [heatId]: { ...prev[itemId][heatId], pieces },
      },
    }));
  };

  const isItemChecked = (itemId: string): boolean => {
    const sels = offerSelection[itemId];
    if (!sels) return false;
    return Object.values(sels).every((h) => h.selected);
  };

  const isItemIndeterminate = (itemId: string): boolean => {
    const sels = offerSelection[itemId];
    if (!sels) return false;
    const vals = Object.values(sels);
    const someChecked = vals.some((h) => h.selected);
    const allChecked = vals.every((h) => h.selected);
    return someChecked && !allChecked;
  };

  const handleGenerateOffer = async () => {
    if (!selectedCustomerId) {
      toast.error("Please select a customer");
      return;
    }

    const selectedItems: { itemId: string; heats: { heatId: string; piecesSelected: number }[] }[] = [];
    if (prep) {
      for (const item of prep.items) {
        const heats: { heatId: string; piecesSelected: number }[] = [];
        for (const heat of item.heatEntries) {
          const sel = offerSelection[item.id]?.[heat.id];
          if (sel?.selected) {
            heats.push({ heatId: heat.id, piecesSelected: sel.pieces });
          }
        }
        if (heats.length > 0) {
          selectedItems.push({ itemId: item.id, heats });
        }
      }
    }

    if (selectedItems.length === 0) {
      toast.error("Select at least one heat entry");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch(`/api/quality/inspection-prep/${id}/generate-offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedItems, customerId: selectedCustomerId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate offer");
      }

      const offer = await res.json();
      toast.success("Inspection offer generated successfully");
      setOfferDialogOpen(false);
      router.push(`/quality/inspection-offers/${offer.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate offer");
    } finally {
      setGenerating(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  if (loading) return <PageLoading />;
  if (!prep) return <div className="text-center py-12 text-muted-foreground">Not found</div>;

  const poLabel = prep.purchaseOrder
    ? `PO: ${prep.purchaseOrder.poNo}`
    : prep.warehouseIntimation
    ? `MPR: ${prep.warehouseIntimation.mprNo}`
    : "—";

  return (
    <div className="space-y-6">
      <PageHeader
        title={prep.prepNo}
        description={`${poLabel} · Prepared by ${prep.preparedBy?.name ?? "—"} on ${format(new Date(prep.createdAt), "dd/MM/yyyy")}`}
        badge={prep.status}
        badgeVariant={prep.status === "OFFER_GENERATED" ? "default" : "secondary"}
      >
        <Button variant="outline" onClick={() => router.push("/quality/inspection-prep")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      <Tabs defaultValue="heats">
        <TabsList>
          <TabsTrigger value="heats">Items &amp; Heat Details</TabsTrigger>
          <TabsTrigger value="mtc">MTC Documents</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------------------------ */}
        {/* TAB 1: Items & Heat Details (Warehouse fills)                        */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="heats" className="space-y-4 mt-4">
          {prep.items.length === 0 && (
            <p className="text-muted-foreground text-sm">No items found.</p>
          )}
          {prep.items.map((item) => (
            <ItemHeatCard
              key={item.id}
              item={item}
              prepId={id}
              expanded={!!expandedItems[item.id]}
              onToggle={() => toggleItem(item.id)}
              onRefresh={fetchPrep}
              showMtc={false}
              isQA={isQA}
            />
          ))}
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* TAB 2: MTC Documents (QA fills)                                     */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="mtc" className="space-y-4 mt-4">
          {!isQA && (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground text-center">
              MTC documents are filled by the QA department. You can view them here in read-only mode.
            </div>
          )}
          {prep.items.length === 0 && (
            <p className="text-muted-foreground text-sm">No items found.</p>
          )}
          {prep.items.map((item) => (
            <ItemHeatCard
              key={item.id}
              item={item}
              prepId={id}
              expanded={!!expandedItems[item.id]}
              onToggle={() => toggleItem(item.id)}
              onRefresh={fetchPrep}
              showMtc={true}
              isQA={isQA}
            />
          ))}
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* TAB 3: Summary                                                       */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="summary" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Item Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead className="text-right">Total Length (m)</TableHead>
                      <TableHead className="text-right">Total Pieces</TableHead>
                      <TableHead className="text-right">Heat Entries</TableHead>
                      <TableHead className="text-right">MTC Docs</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prep.items.map((item) => {
                      const totalLength = item.heatEntries.reduce(
                        (sum, h) => sum + (parseFloat(h.lengthMtr ?? "0") || 0),
                        0
                      );
                      const totalPieces = item.heatEntries.reduce(
                        (sum, h) => sum + (h.pieces ?? 0),
                        0
                      );
                      const mtcCount = item.heatEntries.reduce(
                        (sum, h) => sum + h.mtcDocuments.length,
                        0
                      );
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.description || "—"}
                          </TableCell>
                          <TableCell>{item.sizeLabel || "—"}</TableCell>
                          <TableCell className="text-right">
                            {totalLength.toFixed(3)}
                          </TableCell>
                          <TableCell className="text-right">{totalPieces}</TableCell>
                          <TableCell className="text-right">
                            {item.heatEntries.length}
                          </TableCell>
                          <TableCell className="text-right">{mtcCount}</TableCell>
                          <TableCell>
                            <Badge
                              variant={item.status === "READY" ? "default" : "secondary"}
                            >
                              {item.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {isQA && prep.status !== "OFFER_GENERATED" && (
            <div className="flex justify-end">
              <Button onClick={openOfferDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Generate Inspection Offer
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* -------------------------------------------------------------------- */}
      {/* Generate Offer Dialog                                                  */}
      {/* -------------------------------------------------------------------- */}
      <Dialog open={offerDialogOpen} onOpenChange={setOfferDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Inspection Offer</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Customer */}
            <div className="space-y-1.5">
              <Label htmlFor="customer-select">Customer *</Label>
              <select
                id="customer-select"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
              >
                <option value="">— Select customer —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Item / Heat selection tree */}
            <div className="space-y-3">
              <Label>Select Items &amp; Heats</Label>
              {prep?.items.map((item) => (
                <div key={item.id} className="border rounded-md p-3 space-y-2">
                  {/* Item row */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`item-${item.id}`}
                      checked={isItemChecked(item.id)}
                      // indeterminate state via data attribute for styling
                      data-state={
                        isItemIndeterminate(item.id)
                          ? "indeterminate"
                          : isItemChecked(item.id)
                          ? "checked"
                          : "unchecked"
                      }
                      onCheckedChange={(checked) =>
                        toggleItemSelection(item.id, !!checked)
                      }
                    />
                    <label
                      htmlFor={`item-${item.id}`}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {item.description || "Item"}{" "}
                      {item.sizeLabel && (
                        <span className="text-muted-foreground font-normal">
                          ({item.sizeLabel})
                        </span>
                      )}
                    </label>
                  </div>

                  {/* Heat rows */}
                  {item.heatEntries.length === 0 && (
                    <p className="text-xs text-muted-foreground ml-6">No heat entries</p>
                  )}
                  {item.heatEntries.map((heat) => {
                    const sel = offerSelection[item.id]?.[heat.id];
                    return (
                      <div
                        key={heat.id}
                        className="ml-6 flex items-center gap-3 flex-wrap"
                      >
                        <Checkbox
                          id={`heat-${heat.id}`}
                          checked={sel?.selected ?? false}
                          onCheckedChange={(checked) =>
                            toggleHeatSelection(item.id, heat.id, !!checked)
                          }
                        />
                        <label
                          htmlFor={`heat-${heat.id}`}
                          className="text-sm cursor-pointer min-w-[80px]"
                        >
                          {heat.heatNo}
                        </label>
                        <span className="text-xs text-muted-foreground">
                          {heat.lengthMtr ? `${parseFloat(heat.lengthMtr).toFixed(3)} m` : "—"}
                        </span>
                        {/* MTC tags */}
                        {heat.mtcDocuments.map((mtc) => (
                          <Badge key={mtc.id} variant="outline" className="text-xs">
                            {mtc.mtcNo}
                          </Badge>
                        ))}
                        {/* Pieces input */}
                        <div className="flex items-center gap-1 ml-auto">
                          <span className="text-xs text-muted-foreground">Pcs:</span>
                          <Input
                            type="number"
                            min={0}
                            className="h-7 w-20 text-xs"
                            value={sel?.pieces ?? 0}
                            onChange={(e) =>
                              updateHeatPieces(
                                item.id,
                                heat.id,
                                parseInt(e.target.value) || 0
                              )
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOfferDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerateOffer} disabled={generating}>
              {generating ? "Generating..." : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ItemHeatCard — expandable card for a single InspectionPrepItem
// ---------------------------------------------------------------------------

interface ItemHeatCardProps {
  item: InspectionPrepItem;
  prepId: string;
  expanded: boolean;
  onToggle: () => void;
  onRefresh: () => void;
  showMtc: boolean;
  isQA: boolean;
}

function ItemHeatCard({
  item,
  prepId,
  expanded,
  onToggle,
  onRefresh,
  showMtc,
  isQA,
}: ItemHeatCardProps) {
  const [addingHeat, setAddingHeat] = useState(false);
  const [heatForm, setHeatForm] = useState({ heatNo: "", lengthMtr: "", pieces: "", make: "" });
  const [savingHeat, setSavingHeat] = useState(false);

  const handleAddHeat = async () => {
    if (!heatForm.heatNo.trim()) {
      toast.error("Heat number is required");
      return;
    }
    setSavingHeat(true);
    try {
      const res = await fetch(
        `/api/quality/inspection-prep/${prepId}/items/${item.id}/heats`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            heatNo: heatForm.heatNo.trim(),
            lengthMtr: heatForm.lengthMtr || undefined,
            pieces: heatForm.pieces || undefined,
            make: heatForm.make || undefined,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add heat entry");
      }
      toast.success("Heat entry added");
      setHeatForm({ heatNo: "", lengthMtr: "", pieces: "", make: "" });
      setAddingHeat(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to add heat entry");
    } finally {
      setSavingHeat(false);
    }
  };

  const handleDeleteHeat = async (heatId: string) => {
    try {
      const res = await fetch(
        `/api/quality/inspection-prep/${prepId}/items/${item.id}/heats/${heatId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete heat entry");
      toast.success("Heat entry deleted");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete heat entry");
    }
  };

  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none py-3"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
            <CardTitle className="text-sm font-medium">
              {item.description || "Unnamed Item"}
              {item.sizeLabel && (
                <span className="ml-2 text-muted-foreground font-normal">
                  {item.sizeLabel}
                </span>
              )}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {item.heatEntries.length} heat{item.heatEntries.length !== 1 ? "s" : ""}
            </span>
            <Badge variant={item.status === "READY" ? "default" : "secondary"} className="text-xs">
              {item.status}
            </Badge>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 pb-4">
          {!showMtc ? (
            // ------- Tab 1: Heat entries table -------
            <div className="space-y-3">
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Heat No.</TableHead>
                      <TableHead className="text-right">Length (m)</TableHead>
                      <TableHead className="text-right">Pieces</TableHead>
                      <TableHead>Make</TableHead>
                      <TableHead className="w-[50px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {item.heatEntries.map((heat) => (
                      <TableRow key={heat.id}>
                        <TableCell className="font-mono">{heat.heatNo}</TableCell>
                        <TableCell className="text-right">
                          {heat.lengthMtr ? parseFloat(heat.lengthMtr).toFixed(3) : "—"}
                        </TableCell>
                        <TableCell className="text-right">{heat.pieces ?? "—"}</TableCell>
                        <TableCell>{heat.make || "—"}</TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDeleteHeat(heat.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Inline add row */}
                    {addingHeat && (
                      <TableRow>
                        <TableCell>
                          <Input
                            className="h-8"
                            placeholder="Heat No. *"
                            value={heatForm.heatNo}
                            onChange={(e) =>
                              setHeatForm((f) => ({ ...f, heatNo: e.target.value }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8"
                            type="number"
                            placeholder="0.000"
                            step="0.001"
                            value={heatForm.lengthMtr}
                            onChange={(e) =>
                              setHeatForm((f) => ({ ...f, lengthMtr: e.target.value }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8"
                            type="number"
                            placeholder="0"
                            value={heatForm.pieces}
                            onChange={(e) =>
                              setHeatForm((f) => ({ ...f, pieces: e.target.value }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8"
                            placeholder="Make"
                            value={heatForm.make}
                            onChange={(e) =>
                              setHeatForm((f) => ({ ...f, make: e.target.value }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              className="h-8"
                              onClick={handleAddHeat}
                              disabled={savingHeat}
                            >
                              {savingHeat ? "…" : "Add"}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => {
                                setAddingHeat(false);
                                setHeatForm({ heatNo: "", lengthMtr: "", pieces: "", make: "" });
                              }}
                            >
                              ✕
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}

                    {item.heatEntries.length === 0 && !addingHeat && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-4 text-sm">
                          No heat entries yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {!addingHeat && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAddingHeat(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Heat Entry
                </Button>
              )}
            </div>
          ) : (
            // ------- Tab 2: MTC documents per heat -------
            <div className="space-y-4">
              {item.heatEntries.length === 0 && (
                <p className="text-sm text-muted-foreground">No heat entries for this item.</p>
              )}
              {item.heatEntries.map((heat) => (
                <MtcHeatBlock
                  key={heat.id}
                  heat={heat}
                  prepId={prepId}
                  itemId={item.id}
                  isQA={isQA}
                  onRefresh={onRefresh}
                />
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// MtcHeatBlock — per-heat MTC document section (used in Tab 2)
// ---------------------------------------------------------------------------

interface MtcHeatBlockProps {
  heat: HeatEntry;
  prepId: string;
  itemId: string;
  isQA: boolean;
  onRefresh: () => void;
}

function MtcHeatBlock({ heat, prepId, itemId, isQA, onRefresh }: MtcHeatBlockProps) {
  const [addingMtc, setAddingMtc] = useState(false);
  const [mtcForm, setMtcForm] = useState({ mtcNo: "", mtcDate: "" });
  const [savingMtc, setSavingMtc] = useState(false);

  const handleAddMtc = async () => {
    if (!mtcForm.mtcNo.trim()) {
      toast.error("MTC number is required");
      return;
    }
    setSavingMtc(true);
    try {
      const res = await fetch(
        `/api/quality/inspection-prep/${prepId}/items/${itemId}/heats/${heat.id}/mtc`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mtcNo: mtcForm.mtcNo.trim(),
            mtcDate: mtcForm.mtcDate || undefined,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add MTC document");
      }
      toast.success("MTC document added");
      setMtcForm({ mtcNo: "", mtcDate: "" });
      setAddingMtc(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to add MTC document");
    } finally {
      setSavingMtc(false);
    }
  };

  const handleDeleteMtc = async (mtcId: string) => {
    try {
      const res = await fetch(
        `/api/quality/inspection-prep/${prepId}/items/${itemId}/heats/${heat.id}/mtc/${mtcId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete MTC document");
      toast.success("MTC document deleted");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete MTC document");
    }
  };

  return (
    <div className="border rounded-md p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium font-mono">{heat.heatNo}</span>
        <span className="text-xs text-muted-foreground">
          {heat.lengthMtr ? `${parseFloat(heat.lengthMtr).toFixed(3)} m` : ""}
          {heat.pieces != null ? ` · ${heat.pieces} pcs` : ""}
        </span>
      </div>

      {/* Existing MTC docs */}
      {heat.mtcDocuments.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="py-1.5 text-xs">MTC No.</TableHead>
              <TableHead className="py-1.5 text-xs">Date</TableHead>
              {isQA && <TableHead className="py-1.5 w-[50px]" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {heat.mtcDocuments.map((mtc) => (
              <TableRow key={mtc.id}>
                <TableCell className="py-1.5 font-mono text-sm">{mtc.mtcNo}</TableCell>
                <TableCell className="py-1.5 text-sm">
                  {mtc.mtcDate
                    ? format(new Date(mtc.mtcDate), "dd/MM/yyyy")
                    : "—"}
                </TableCell>
                {isQA && (
                  <TableCell className="py-1.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDeleteMtc(mtc.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {heat.mtcDocuments.length === 0 && !addingMtc && (
        <p className="text-xs text-muted-foreground">No MTC documents</p>
      )}

      {/* Add MTC inline row */}
      {isQA && (
        <>
          {addingMtc ? (
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                className="h-8 w-36"
                placeholder="MTC No. *"
                value={mtcForm.mtcNo}
                onChange={(e) => setMtcForm((f) => ({ ...f, mtcNo: e.target.value }))}
              />
              <Input
                type="date"
                className="h-8 w-40"
                value={mtcForm.mtcDate}
                onChange={(e) => setMtcForm((f) => ({ ...f, mtcDate: e.target.value }))}
              />
              <Button size="sm" className="h-8" onClick={handleAddMtc} disabled={savingMtc}>
                {savingMtc ? "…" : "Add MTC"}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => {
                  setAddingMtc(false);
                  setMtcForm({ mtcNo: "", mtcDate: "" });
                }}
              >
                ✕
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setAddingMtc(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add MTC
            </Button>
          )}
        </>
      )}
    </div>
  );
}
