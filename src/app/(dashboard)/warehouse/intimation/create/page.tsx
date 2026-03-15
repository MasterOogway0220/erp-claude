"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";

interface SalesOrder {
  id: string;
  soNo: string;
  status: string;
  customerPoNo: string | null;
  customer: { name: string; city: string | null };
  items: {
    id: string;
    sNo: number;
    product: string | null;
    material: string | null;
    sizeLabel: string | null;
    additionalSpec: string | null;
    quantity: number;
    qtyDispatched: number;
    itemStatus: string;
  }[];
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

export default function CreateWarehouseIntimationPage() {
  const router = useRouter();
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedSO, setSelectedSO] = useState("");
  const [soDetail, setSODetail] = useState<SalesOrder | null>(null);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [requiredByDate, setRequiredByDate] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSalesOrders();
    fetchWarehouses();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedSO) {
      const so = salesOrders.find((s) => s.id === selectedSO);
      setSODetail(so || null);
      setSelectedItems([]);
    } else {
      setSODetail(null);
      setSelectedItems([]);
    }
  }, [selectedSO, salesOrders]);

  const fetchSalesOrders = async () => {
    try {
      const res = await fetch("/api/sales-orders");
      if (res.ok) {
        const data = await res.json();
        const validSOs = (data.salesOrders || []).filter(
          (so: any) => so.status === "OPEN" || so.status === "PARTIALLY_DISPATCHED"
        );
        setSalesOrders(validSOs);
      }
    } catch (error) {
      console.error("Failed to fetch SOs:", error);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await fetch("/api/masters/warehouses");
      if (res.ok) {
        const data = await res.json();
        setWarehouses(data.warehouses || []);
      }
    } catch (error) {
      console.error("Failed to fetch warehouses:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers((data.users || []).filter((u: any) => u.role === "STORES" || u.role === "SUPER_ADMIN"));
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const toggleSOItem = (soItem: any) => {
    const exists = selectedItems.find((i) => i.salesOrderItemId === soItem.id);
    if (exists) {
      setSelectedItems(selectedItems.filter((i) => i.salesOrderItemId !== soItem.id));
    } else {
      const balanceQty = Number(soItem.quantity) - Number(soItem.qtyDispatched);
      setSelectedItems([
        ...selectedItems,
        {
          salesOrderItemId: soItem.id,
          sNo: soItem.sNo,
          product: soItem.product || "",
          material: soItem.material || "",
          sizeLabel: soItem.sizeLabel || "",
          additionalSpec: soItem.additionalSpec || "",
          requiredQty: balanceQty > 0 ? balanceQty : Number(soItem.quantity),
          inspectionStatus: "PENDING",
          testingStatus: "PENDING",
        },
      ]);
    }
  };

  const selectAllItems = () => {
    if (!soDetail) return;
    const openItems = soDetail.items.filter((i) => i.itemStatus === "OPEN" || i.itemStatus === "PARTIALLY_DISPATCHED");
    if (selectedItems.length === openItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(
        openItems.map((soItem) => {
          const balanceQty = Number(soItem.quantity) - Number(soItem.qtyDispatched);
          return {
            salesOrderItemId: soItem.id,
            sNo: soItem.sNo,
            product: soItem.product || "",
            material: soItem.material || "",
            sizeLabel: soItem.sizeLabel || "",
            additionalSpec: soItem.additionalSpec || "",
            requiredQty: balanceQty > 0 ? balanceQty : Number(soItem.quantity),
            inspectionStatus: "PENDING",
            testingStatus: "PENDING",
          };
        })
      );
    }
  };

  const updateItemQty = (salesOrderItemId: string, qty: string) => {
    setSelectedItems(
      selectedItems.map((i) =>
        i.salesOrderItemId === salesOrderItemId
          ? { ...i, requiredQty: parseFloat(qty) || 0 }
          : i
      )
    );
  };

  const handleSubmit = async () => {
    if (!selectedSO) {
      toast.error("Please select a Sales Order");
      return;
    }
    if (selectedItems.length === 0) {
      toast.error("Please select at least one item");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/warehouse/intimation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salesOrderId: selectedSO,
          warehouseId: warehouseId || undefined,
          priority,
          requiredByDate: requiredByDate || undefined,
          assignedToId: assignedToId || undefined,
          remarks,
          items: selectedItems,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to create MPR");
        return;
      }

      const data = await res.json();
      toast.success(`Material Preparation Request ${data.mprNo} created successfully`);
      router.push(`/warehouse/intimation/${data.id}`);
    } catch (error) {
      toast.error("Failed to create MPR");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Material Preparation Request"
        description="Send intimation to warehouse for material preparation"
      />

      <Card>
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Sales Order *</Label>
              <Select value={selectedSO} onValueChange={setSelectedSO}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Sales Order" />
                </SelectTrigger>
                <SelectContent>
                  {salesOrders.map((so) => (
                    <SelectItem key={so.id} value={so.id}>
                      {so.soNo} - {so.customer?.name}
                      {so.customerPoNo ? ` (PO: ${so.customerPoNo})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Warehouse</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((wh) => (
                    <SelectItem key={wh.id} value={wh.id}>
                      {wh.name} ({wh.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Required By Date</Label>
              <Input
                type="date"
                value={requiredByDate}
                onChange={(e) => setRequiredByDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Assign To (Warehouse Personnel)</Label>
              <Select value={assignedToId} onValueChange={setAssignedToId}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Special instructions for warehouse team..."
                rows={1}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SO Items Selection */}
      {soDetail && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              SO Items — {soDetail.soNo}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({soDetail.customer.name})
              </span>
            </CardTitle>
            <Button variant="outline" size="sm" onClick={selectAllItems}>
              {selectedItems.length === soDetail.items.filter((i) => i.itemStatus === "OPEN" || i.itemStatus === "PARTIALLY_DISPATCHED").length
                ? "Deselect All"
                : "Select All Open"}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left">Select</th>
                    <th className="p-2 text-left">#</th>
                    <th className="p-2 text-left">Product</th>
                    <th className="p-2 text-left">Material</th>
                    <th className="p-2 text-left">Size</th>
                    <th className="p-2 text-right">SO Qty</th>
                    <th className="p-2 text-right">Dispatched</th>
                    <th className="p-2 text-right">Balance</th>
                    <th className="p-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {soDetail.items.map((soItem) => {
                    const isSelected = selectedItems.some((i) => i.salesOrderItemId === soItem.id);
                    const balance = Number(soItem.quantity) - Number(soItem.qtyDispatched);
                    const isOpen = soItem.itemStatus === "OPEN" || soItem.itemStatus === "PARTIALLY_DISPATCHED";
                    return (
                      <tr
                        key={soItem.id}
                        className={`border-b ${isOpen ? "cursor-pointer hover:bg-accent/50" : "opacity-50"} ${isSelected ? "bg-accent/30" : ""}`}
                        onClick={() => isOpen && toggleSOItem(soItem)}
                      >
                        <td className="p-2">
                          <Checkbox checked={isSelected} disabled={!isOpen} />
                        </td>
                        <td className="p-2">{soItem.sNo}</td>
                        <td className="p-2 font-medium">{soItem.product || "\u2014"}</td>
                        <td className="p-2">{soItem.material || "\u2014"}</td>
                        <td className="p-2">{soItem.sizeLabel || "\u2014"}</td>
                        <td className="p-2 text-right">{Number(soItem.quantity).toFixed(3)}</td>
                        <td className="p-2 text-right">{Number(soItem.qtyDispatched).toFixed(3)}</td>
                        <td className="p-2 text-right font-medium">{balance.toFixed(3)}</td>
                        <td className="p-2">
                          <Badge variant={isOpen ? "secondary" : "outline"} className="text-xs">
                            {soItem.itemStatus}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Items with Editable Qty */}
      {selectedItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Items ({selectedItems.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left">#</th>
                    <th className="p-2 text-left">Product</th>
                    <th className="p-2 text-left">Material</th>
                    <th className="p-2 text-left">Size</th>
                    <th className="p-2 text-right">Required Qty</th>
                    <th className="p-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedItems.map((item, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2">{item.sNo}</td>
                      <td className="p-2 font-medium">{item.product || "\u2014"}</td>
                      <td className="p-2">{item.material || "\u2014"}</td>
                      <td className="p-2">{item.sizeLabel || "\u2014"}</td>
                      <td className="p-2 text-right">
                        <Input
                          type="number"
                          step="0.001"
                          min="0"
                          value={item.requiredQty}
                          onChange={(e) => updateItemQty(item.salesOrderItemId, e.target.value)}
                          className="w-28 text-right ml-auto"
                        />
                      </td>
                      <td className="p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500"
                          onClick={() =>
                            setSelectedItems(selectedItems.filter((_, i) => i !== idx))
                          }
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-4 gap-3">
              <Button variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Creating..." : "Create MPR"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
