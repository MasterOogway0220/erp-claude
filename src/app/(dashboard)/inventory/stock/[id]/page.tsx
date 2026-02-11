"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Edit, SplitSquareHorizontal } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";

const stockStatusColors: Record<string, string> = {
  UNDER_INSPECTION: "bg-yellow-500", ACCEPTED: "bg-green-500", REJECTED: "bg-red-500",
  HOLD: "bg-orange-500", RESERVED: "bg-blue-500", DISPATCHED: "bg-gray-500",
};

export default function StockDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [stock, setStock] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [partialDialogOpen, setPartialDialogOpen] = useState(false);
  const [updateData, setUpdateData] = useState({ status: "", location: "", rackNo: "", notes: "" });
  const [partialData, setPartialData] = useState({ acceptedQty: "", acceptedPcs: "", rejectedQty: "", rejectedPcs: "", rejectionNotes: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (params.id) fetchStock(params.id as string); }, [params.id]);

  const fetchStock = async (id: string) => {
    try {
      const response = await fetch(`/api/inventory/stock/${id}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setStock(data.stock);
      setUpdateData({ status: data.stock.status, location: data.stock.location || "", rackNo: data.stock.rackNo || "", notes: data.stock.notes || "" });
    } catch (error) {
      toast.error("Failed to load stock details");
      router.push("/inventory");
    } finally { setLoading(false); }
  };

  const handleUpdateStock = async () => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/inventory/stock/${params.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updateData) });
      if (!response.ok) { const error = await response.json(); throw new Error(error.error || "Failed to update"); }
      toast.success("Stock updated successfully");
      setStatusDialogOpen(false);
      fetchStock(params.id as string);
    } catch (error: any) { toast.error(error.message); } finally { setSubmitting(false); }
  };

  const handlePartialAccept = async () => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/inventory/stock/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "PARTIAL_ACCEPT",
          acceptedQty: parseFloat(partialData.acceptedQty),
          acceptedPcs: parseInt(partialData.acceptedPcs) || 0,
          rejectedQty: parseFloat(partialData.rejectedQty),
          rejectedPcs: parseInt(partialData.rejectedPcs) || 0,
          rejectionNotes: partialData.rejectionNotes,
        }),
      });
      if (!response.ok) { const error = await response.json(); throw new Error(error.error || "Failed to process"); }
      toast.success("Partial acceptance completed. Rejected portion split into separate stock with NCR.");
      setPartialDialogOpen(false);
      fetchStock(params.id as string);
    } catch (error: any) { toast.error(error.message); } finally { setSubmitting(false); }
  };

  const handleAcceptedQtyChange = (val: string) => {
    const accepted = parseFloat(val) || 0;
    const total = stock ? Number(stock.quantityMtr) : 0;
    const rejected = Math.max(0, total - accepted);
    setPartialData({ ...partialData, acceptedQty: val, rejectedQty: rejected.toFixed(3) });
  };

  if (loading) return <div className="flex items-center justify-center h-96"><div className="text-muted-foreground">Loading...</div></div>;
  if (!stock) return null;

  const grn = stock.grnItem?.grn;
  const po = grn?.purchaseOrder;

  return (
    <div className="space-y-6">
      <PageHeader title={`Heat No: ${stock.heatNo || "N/A"}`} description={`${stock.product || ""} | ${stock.sizeLabel || ""} | ${stock.specification || ""}`}>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
          {stock.status === "UNDER_INSPECTION" && (
            <Dialog open={partialDialogOpen} onOpenChange={setPartialDialogOpen}>
              <DialogTrigger asChild><Button variant="secondary"><SplitSquareHorizontal className="w-4 h-4 mr-2" />Partial Accept</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Partial Acceptance</DialogTitle></DialogHeader>
                <p className="text-sm text-muted-foreground">Split this stock into accepted and rejected portions. Total: <strong>{Number(stock.quantityMtr).toFixed(3)} Mtr, {stock.pieces} Pcs</strong></p>
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-green-700">Accepted Qty (Mtr) *</Label>
                      <Input type="number" step="0.001" value={partialData.acceptedQty} onChange={(e) => handleAcceptedQtyChange(e.target.value)} placeholder="0.000" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-green-700">Accepted Pieces</Label>
                      <Input type="number" value={partialData.acceptedPcs} onChange={(e) => setPartialData({ ...partialData, acceptedPcs: e.target.value })} placeholder="0" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-red-700">Rejected Qty (Mtr) *</Label>
                      <Input type="number" step="0.001" value={partialData.rejectedQty} onChange={(e) => setPartialData({ ...partialData, rejectedQty: e.target.value })} disabled className="bg-muted" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-red-700">Rejected Pieces</Label>
                      <Input type="number" value={partialData.rejectedPcs} onChange={(e) => setPartialData({ ...partialData, rejectedPcs: e.target.value })} placeholder="0" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Rejection Notes</Label>
                    <Textarea value={partialData.rejectionNotes} onChange={(e) => setPartialData({ ...partialData, rejectionNotes: e.target.value })} rows={2} placeholder="Reason for partial rejection..." />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="outline" onClick={() => setPartialDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handlePartialAccept} disabled={submitting || !partialData.acceptedQty || !partialData.rejectedQty}>{submitting ? "Processing..." : "Confirm Split"}</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
            <DialogTrigger asChild><Button><Edit className="w-4 h-4 mr-2" />Update Stock</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Update Stock Details</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={updateData.status} onValueChange={(value) => setUpdateData({ ...updateData, status: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UNDER_INSPECTION">Under Inspection</SelectItem>
                      <SelectItem value="ACCEPTED">Accepted</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                      <SelectItem value="HOLD">Hold</SelectItem>
                      <SelectItem value="RESERVED">Reserved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Location</Label><Input value={updateData.location} onChange={(e) => setUpdateData({ ...updateData, location: e.target.value })} placeholder="e.g., Warehouse A" /></div>
                <div className="space-y-2"><Label>Rack No.</Label><Input value={updateData.rackNo} onChange={(e) => setUpdateData({ ...updateData, rackNo: e.target.value })} placeholder="e.g., R-01-A" /></div>
                <div className="space-y-2"><Label>Notes</Label><Textarea value={updateData.notes} onChange={(e) => setUpdateData({ ...updateData, notes: e.target.value })} rows={3} /></div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleUpdateStock} disabled={submitting}>{submitting ? "Updating..." : "Update"}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      <Card>
        <CardHeader><CardTitle>Lifecycle</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            {po && (<><Link href={`/purchase/orders/${po.id}`} className="text-blue-600 hover:underline">PO: {po.poNo}</Link><span className="text-muted-foreground">&rarr;</span></>)}
            {grn && (<><Link href={`/inventory/grn/${grn.id}`} className="text-blue-600 hover:underline">GRN: {grn.grnNo}</Link><span className="text-muted-foreground">&rarr;</span></>)}
            <Badge className={stockStatusColors[stock.status] || "bg-gray-500"}>{stock.status.replace(/_/g, " ")}</Badge>
            {stock.stockReservations?.length > 0 && (<><span className="text-muted-foreground">&rarr;</span><span>Reserved</span></>)}
            {stock.packingListItems?.length > 0 && (<><span className="text-muted-foreground">&rarr;</span><span>Packed</span></>)}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Stock Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div><div className="text-sm text-muted-foreground">Product</div><div className="font-medium">{stock.product || "—"}</div></div>
              <div><div className="text-sm text-muted-foreground">Specification</div><div>{stock.specification || "—"}</div></div>
              <div><div className="text-sm text-muted-foreground">Size</div><div className="font-mono">{stock.sizeLabel || "—"}</div></div>
              <div><div className="text-sm text-muted-foreground">Quantity (Mtr)</div><div className="font-medium">{Number(stock.quantityMtr).toFixed(3)}</div></div>
              <div><div className="text-sm text-muted-foreground">Pieces</div><div>{stock.pieces}</div></div>
              <div><div className="text-sm text-muted-foreground">Make</div><div>{stock.make || "—"}</div></div>
              <div><div className="text-sm text-muted-foreground">Ends</div><div>{stock.ends || "—"}</div></div>
              <div><div className="text-sm text-muted-foreground">Length</div><div>{stock.length || "—"}</div></div>
              <div><div className="text-sm text-muted-foreground">Dimension Std</div><div>{stock.dimensionStd || "—"}</div></div>
            </div>
            <Separator />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div><div className="text-sm text-muted-foreground">MTC No.</div><div>{stock.mtcNo || "—"}</div></div>
              <div><div className="text-sm text-muted-foreground">MTC Type</div><div>{stock.mtcType?.replace(/_/g, " ") || "—"}</div></div>
              <div><div className="text-sm text-muted-foreground">TPI Agency</div><div>{stock.tpiAgency || "—"}</div></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Location & Status</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><div className="text-sm text-muted-foreground">Status</div><Badge className={`${stockStatusColors[stock.status] || "bg-gray-500"} mt-1`}>{stock.status.replace(/_/g, " ")}</Badge></div>
            <div><div className="text-sm text-muted-foreground">Location</div><div>{stock.location || "Not assigned"}</div></div>
            <div><div className="text-sm text-muted-foreground">Rack No.</div><div>{stock.rackNo || "Not assigned"}</div></div>
            {stock.notes && <div><div className="text-sm text-muted-foreground">Notes</div><div className="text-sm mt-1">{stock.notes}</div></div>}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="inspections" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inspections">Inspections ({stock.inspections?.length || 0})</TabsTrigger>
          <TabsTrigger value="reservations">Reservations ({stock.stockReservations?.length || 0})</TabsTrigger>
          <TabsTrigger value="ncr">NCRs ({stock.ncrs?.length || 0})</TabsTrigger>
          <TabsTrigger value="mtc">MTCs ({stock.mtcDocuments?.length || 0})</TabsTrigger>
        </TabsList>
        <TabsContent value="inspections">
          <Card><CardContent className="pt-6">
            {stock.inspections?.length > 0 ? (
              <Table><TableHeader><TableRow><TableHead>Inspection No.</TableHead><TableHead>Date</TableHead><TableHead>Inspector</TableHead><TableHead>Result</TableHead><TableHead>Remarks</TableHead></TableRow></TableHeader>
                <TableBody>{stock.inspections.map((insp: any) => (
                  <TableRow key={insp.id}>
                    <TableCell><Link href={`/quality/inspections/${insp.id}`} className="text-blue-600 hover:underline font-mono">{insp.inspectionNo}</Link></TableCell>
                    <TableCell>{format(new Date(insp.inspectionDate), "dd MMM yyyy")}</TableCell>
                    <TableCell>{insp.inspector?.name}</TableCell>
                    <TableCell><Badge className={insp.overallResult === "PASS" ? "bg-green-500" : insp.overallResult === "FAIL" ? "bg-red-500" : "bg-yellow-500"}>{insp.overallResult}</Badge></TableCell>
                    <TableCell>{insp.remarks || "—"}</TableCell>
                  </TableRow>
                ))}</TableBody></Table>
            ) : <div className="text-center text-muted-foreground py-8">No inspections recorded</div>}
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="reservations">
          <Card><CardContent className="pt-6">
            {stock.stockReservations?.length > 0 ? (
              <Table><TableHeader><TableRow><TableHead>Sales Order</TableHead><TableHead>Reserved Qty</TableHead><TableHead>Reserved Pcs</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>{stock.stockReservations.map((res: any) => (
                  <TableRow key={res.id}>
                    <TableCell><Link href={`/sales/${res.salesOrderItem?.salesOrder?.id}`} className="text-blue-600 hover:underline">{res.salesOrderItem?.salesOrder?.soNo}</Link></TableCell>
                    <TableCell>{Number(res.reservedQtyMtr).toFixed(3)}</TableCell>
                    <TableCell>{res.reservedPieces}</TableCell>
                    <TableCell>{format(new Date(res.reservedDate), "dd MMM yyyy")}</TableCell>
                    <TableCell><Badge variant="outline">{res.status}</Badge></TableCell>
                  </TableRow>
                ))}</TableBody></Table>
            ) : <div className="text-center text-muted-foreground py-8">No reservations</div>}
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="ncr">
          <Card><CardContent className="pt-6">
            {stock.ncrs?.length > 0 ? (
              <Table><TableHeader><TableRow><TableHead>NCR No.</TableHead><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>{stock.ncrs.map((ncr: any) => (
                  <TableRow key={ncr.id}>
                    <TableCell><Link href={`/quality/ncr/${ncr.id}`} className="text-blue-600 hover:underline font-mono">{ncr.ncrNo}</Link></TableCell>
                    <TableCell>{format(new Date(ncr.ncrDate), "dd MMM yyyy")}</TableCell>
                    <TableCell>{ncr.nonConformanceType || "—"}</TableCell>
                    <TableCell><Badge className={ncr.status === "CLOSED" ? "bg-green-500" : ncr.status === "UNDER_INVESTIGATION" ? "bg-yellow-500" : "bg-red-500"}>{ncr.status.replace(/_/g, " ")}</Badge></TableCell>
                  </TableRow>
                ))}</TableBody></Table>
            ) : <div className="text-center text-muted-foreground py-8">No NCRs recorded</div>}
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="mtc">
          <Card><CardContent className="pt-6">
            {stock.mtcDocuments?.length > 0 ? (
              <Table><TableHeader><TableRow><TableHead>MTC No.</TableHead><TableHead>Heat No.</TableHead><TableHead>Upload Date</TableHead><TableHead>Remarks</TableHead></TableRow></TableHeader>
                <TableBody>{stock.mtcDocuments.map((mtc: any) => (
                  <TableRow key={mtc.id}>
                    <TableCell className="font-mono">{mtc.mtcNo}</TableCell>
                    <TableCell>{mtc.heatNo}</TableCell>
                    <TableCell>{format(new Date(mtc.uploadDate), "dd MMM yyyy")}</TableCell>
                    <TableCell>{mtc.remarks || "—"}</TableCell>
                  </TableRow>
                ))}</TableBody></Table>
            ) : <div className="text-center text-muted-foreground py-8">No MTC documents</div>}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
