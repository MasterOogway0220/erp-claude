"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft, CheckCircle2, Clock, Package, Truck, XCircle } from "lucide-react";
import { PageLoading } from "@/components/shared/page-loading";

const STATUS_CONFIG: Record<string, { label: string; variant: string }> = {
  PENDING: { label: "Pending", variant: "secondary" },
  IN_PROGRESS: { label: "In Progress", variant: "default" },
  MATERIAL_READY: { label: "Material Ready", variant: "outline" },
  DISPATCHED: { label: "Dispatched", variant: "default" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
};

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  NORMAL: { label: "Normal", className: "bg-slate-100 text-slate-700" },
  URGENT: { label: "Urgent", className: "bg-amber-100 text-amber-800" },
  CRITICAL: { label: "Critical", className: "bg-red-100 text-red-800" },
};

export default function WarehouseIntimationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [itemUpdates, setItemUpdates] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/warehouse/intimation/${id}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        // Initialize item updates from current data
        const updates: Record<string, any> = {};
        json.items?.forEach((item: any) => {
          updates[item.id] = {
            itemStatus: item.itemStatus,
            inspectionStatus: item.inspectionStatus,
            testingStatus: item.testingStatus,
            preparedQty: Number(item.preparedQty),
            remarks: item.remarks || "",
          };
        });
        setItemUpdates(updates);
      } else {
        toast.error("Failed to load MPR details");
        router.push("/warehouse/intimation");
      }
    } catch (error) {
      toast.error("Failed to load MPR details");
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (itemId: string, field: string, value: any) => {
    setItemUpdates((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const items = Object.entries(itemUpdates).map(([itemId, updates]) => ({
        id: itemId,
        ...updates,
      }));

      const res = await fetch(`/api/warehouse/intimation/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      if (res.ok) {
        toast.success("MPR updated successfully");
        fetchDetail();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update");
      }
    } catch (error) {
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/warehouse/intimation/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        toast.success(`Status updated to ${newStatus.replace(/_/g, " ")}`);
        fetchDetail();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update status");
      }
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoading />;
  if (!data) return <div>Not found</div>;

  const statusCfg = STATUS_CONFIG[data.status] || STATUS_CONFIG.PENDING;
  const priorityCfg = PRIORITY_CONFIG[data.priority] || PRIORITY_CONFIG.NORMAL;
  const readyCount = data.items.filter((i: any) => i.itemStatus === "READY" || i.itemStatus === "ISSUED").length;
  const isClosed = data.status === "DISPATCHED" || data.status === "CANCELLED";

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.mprNo}
        description="Material Preparation Request Detail"
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push("/warehouse/intimation")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {!isClosed && (
            <>
              <Button variant="outline" size="sm" onClick={() => handleStatusChange("CANCELLED")} disabled={saving}>
                <XCircle className="w-4 h-4 mr-1" /> Cancel MPR
              </Button>
              {data.status === "MATERIAL_READY" && (
                <Button size="sm" onClick={() => handleStatusChange("DISPATCHED")} disabled={saving}>
                  <Truck className="w-4 h-4 mr-1" /> Mark Dispatched
                </Button>
              )}
            </>
          )}
        </div>
      </PageHeader>

      {/* MPR Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Request Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">MPR No.</span>
              <span className="font-medium">{data.mprNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span>{format(new Date(data.mprDate), "dd/MM/yyyy")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={statusCfg.variant as any}>{statusCfg.label}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Priority</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priorityCfg.className}`}>
                {priorityCfg.label}
              </span>
            </div>
            {data.requiredByDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Required By</span>
                <span className="font-medium">{format(new Date(data.requiredByDate), "dd/MM/yyyy")}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Progress</span>
              <span>{readyCount}/{data.items.length} items ready</span>
            </div>
            {data.warehouse && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Warehouse</span>
                <span>{data.warehouse.name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created By</span>
              <span>{data.createdBy?.name}</span>
            </div>
            {data.assignedTo && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Assigned To</span>
                <span>{data.assignedTo.name}</span>
              </div>
            )}
            {data.remarks && (
              <div>
                <span className="text-muted-foreground block mb-1">Remarks</span>
                <p className="text-sm bg-muted/50 rounded p-2">{data.remarks}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sales Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">SO No.</span>
              <Button
                variant="link"
                className="p-0 h-auto font-medium"
                onClick={() => router.push(`/sales/${data.salesOrder.id}`)}
              >
                {data.salesOrder.soNo}
              </Button>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer</span>
              <span>{data.salesOrder.customer.name}</span>
            </div>
            {data.salesOrder.customerPoNo && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer PO No.</span>
                <span className="font-medium">{data.salesOrder.customerPoNo}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">SO Status</span>
              <Badge variant="secondary">{data.salesOrder.status}</Badge>
            </div>
            {data.salesOrder.deliverySchedule && (
              <div>
                <span className="text-muted-foreground block mb-1">Delivery Schedule</span>
                <p className="text-sm bg-muted/50 rounded p-2">{data.salesOrder.deliverySchedule}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Items Table - The main warehouse dashboard view */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            Material Preparation Items
          </CardTitle>
          {!isClosed && (
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Material / Spec</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Heat No.</TableHead>
                  <TableHead className="text-right">Req. Qty</TableHead>
                  <TableHead className="text-right">Prepared</TableHead>
                  <TableHead>Inspection</TableHead>
                  <TableHead>Testing</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item: any) => {
                  const updates = itemUpdates[item.id] || {};
                  const stockInfo = item.inventoryStock;
                  const latestInspection = stockInfo?.inspections?.[0];

                  return (
                    <TableRow
                      key={item.id}
                      className={
                        updates.itemStatus === "READY" ? "bg-green-50/50" :
                        updates.itemStatus === "ISSUED" ? "bg-blue-50/50" :
                        updates.itemStatus === "PREPARING" ? "bg-amber-50/50" : ""
                      }
                    >
                      <TableCell className="text-muted-foreground">{item.sNo}</TableCell>
                      <TableCell className="font-medium">{item.product || "\u2014"}</TableCell>
                      <TableCell>
                        {item.material || "\u2014"}
                        {item.additionalSpec && (
                          <span className="block text-xs text-muted-foreground">{item.additionalSpec}</span>
                        )}
                      </TableCell>
                      <TableCell>{item.sizeLabel || "\u2014"}</TableCell>
                      <TableCell>
                        {item.heatNo ? (
                          <span className="font-mono text-xs">{item.heatNo}</span>
                        ) : stockInfo?.heatNo ? (
                          <span className="font-mono text-xs text-muted-foreground">{stockInfo.heatNo}</span>
                        ) : (
                          "\u2014"
                        )}
                        {stockInfo && (
                          <span className="block text-xs text-muted-foreground">
                            Stock: {stockInfo.status}
                          </span>
                        )}
                        {latestInspection && (
                          <span className={`block text-xs ${latestInspection.overallResult === "PASS" ? "text-green-600" : latestInspection.overallResult === "FAIL" ? "text-red-600" : "text-amber-600"}`}>
                            Insp: {latestInspection.overallResult}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{Number(item.requiredQty).toFixed(3)}</TableCell>
                      <TableCell className="text-right">
                        {isClosed ? (
                          Number(item.preparedQty).toFixed(3)
                        ) : (
                          <input
                            type="number"
                            step="0.001"
                            min="0"
                            value={updates.preparedQty ?? Number(item.preparedQty)}
                            onChange={(e) => updateItem(item.id, "preparedQty", parseFloat(e.target.value) || 0)}
                            className="w-20 text-right border rounded px-1 py-0.5 text-sm"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {isClosed ? (
                          <span className="text-xs">{item.inspectionStatus}</span>
                        ) : (
                          <select
                            value={updates.inspectionStatus || item.inspectionStatus}
                            onChange={(e) => updateItem(item.id, "inspectionStatus", e.target.value)}
                            className="text-xs border rounded px-1 py-0.5 bg-background"
                          >
                            <option value="PENDING">Pending</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="NA">N/A</option>
                          </select>
                        )}
                      </TableCell>
                      <TableCell>
                        {isClosed ? (
                          <span className="text-xs">{item.testingStatus}</span>
                        ) : (
                          <select
                            value={updates.testingStatus || item.testingStatus}
                            onChange={(e) => updateItem(item.id, "testingStatus", e.target.value)}
                            className="text-xs border rounded px-1 py-0.5 bg-background"
                          >
                            <option value="PENDING">Pending</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="NA">N/A</option>
                          </select>
                        )}
                      </TableCell>
                      <TableCell>
                        {isClosed ? (
                          <Badge variant="secondary" className="text-xs">{item.itemStatus}</Badge>
                        ) : (
                          <select
                            value={updates.itemStatus || item.itemStatus}
                            onChange={(e) => updateItem(item.id, "itemStatus", e.target.value)}
                            className="text-xs border rounded px-1 py-1 bg-background font-medium"
                          >
                            <option value="PENDING">Pending</option>
                            <option value="PREPARING">Preparing</option>
                            <option value="READY">Ready</option>
                            <option value="ISSUED">Issued</option>
                          </select>
                        )}
                      </TableCell>
                      <TableCell>
                        {isClosed ? (
                          <span className="text-xs">{item.remarks || "\u2014"}</span>
                        ) : (
                          <input
                            type="text"
                            value={updates.remarks ?? (item.remarks || "")}
                            onChange={(e) => updateItem(item.id, "remarks", e.target.value)}
                            placeholder="Notes..."
                            className="w-28 text-xs border rounded px-1 py-0.5 bg-background"
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Progress Summary */}
          <div className="mt-4 flex items-center gap-4 text-sm">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${data.items.length > 0 ? (readyCount / data.items.length) * 100 : 0}%` }}
              />
            </div>
            <span className="text-muted-foreground whitespace-nowrap">
              {readyCount}/{data.items.length} items ready ({data.items.length > 0 ? Math.round((readyCount / data.items.length) * 100) : 0}%)
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
