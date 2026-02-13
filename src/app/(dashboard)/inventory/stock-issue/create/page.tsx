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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { format } from "date-fns";

export default function CreateStockIssuePage() {
  const router = useRouter();
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [selectedSO, setSelectedSO] = useState("");
  const [availableStock, setAvailableStock] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [authorizedById, setAuthorizedById] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSalesOrders();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedSO) {
      fetchAvailableStock();
    }
  }, [selectedSO]);

  const fetchSalesOrders = async () => {
    try {
      const res = await fetch("/api/sales");
      if (res.ok) {
        const data = await res.json();
        const openSOs = (data.salesOrders || []).filter(
          (so: any) => so.status === "OPEN" || so.status === "PARTIALLY_DISPATCHED"
        );
        setSalesOrders(openSOs);
      }
    } catch (error) {
      console.error("Failed to fetch SOs:", error);
    }
  };

  const fetchAvailableStock = async () => {
    try {
      const res = await fetch("/api/inventory/stock?status=ACCEPTED");
      if (res.ok) {
        const data = await res.json();
        setAvailableStock(data.stocks || []);
      }
    } catch (error) {
      console.error("Failed to fetch stock:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const toggleItem = (stock: any) => {
    const exists = selectedItems.find((i) => i.inventoryStockId === stock.id);
    if (exists) {
      setSelectedItems(selectedItems.filter((i) => i.inventoryStockId !== stock.id));
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          inventoryStockId: stock.id,
          heatNo: stock.heatNo || "",
          sizeLabel: stock.sizeLabel || "",
          material: stock.specification || stock.product || "",
          quantityMtr: Number(stock.quantityMtr),
          pieces: stock.pieces || 0,
          location: stock.location || "",
        },
      ]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedSO) {
      toast.error("Please select a Sales Order");
      return;
    }
    if (selectedItems.length === 0) {
      toast.error("Please select at least one stock item");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/stock-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salesOrderId: selectedSO,
          authorizedById: authorizedById || undefined,
          remarks,
          items: selectedItems,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to create stock issue");
        return;
      }

      const data = await res.json();
      toast.success(`Stock Issue ${data.issueNo} created successfully`);
      router.push(`/inventory/stock-issue/${data.id}`);
    } catch (error) {
      toast.error("Failed to create stock issue");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Stock Issue"
        description="Issue stock against a Sales Order"
      />

      <Card>
        <CardHeader>
          <CardTitle>Issue Details</CardTitle>
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
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Authorized By</Label>
              <Select value={authorizedById} onValueChange={setAuthorizedById}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Authorizer" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.role})
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
                placeholder="Optional remarks..."
                rows={1}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedSO && (
        <Card>
          <CardHeader>
            <CardTitle>Available Stock (ACCEPTED)</CardTitle>
          </CardHeader>
          <CardContent>
            {availableStock.length === 0 ? (
              <p className="text-muted-foreground">No accepted stock available</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2 text-left">Select</th>
                      <th className="p-2 text-left">Heat No.</th>
                      <th className="p-2 text-left">Product</th>
                      <th className="p-2 text-left">Size</th>
                      <th className="p-2 text-left">Specification</th>
                      <th className="p-2 text-right">Qty (Mtr)</th>
                      <th className="p-2 text-right">Pieces</th>
                      <th className="p-2 text-left">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableStock.map((stock) => {
                      const isSelected = selectedItems.some(
                        (i) => i.inventoryStockId === stock.id
                      );
                      return (
                        <tr
                          key={stock.id}
                          className={`border-b cursor-pointer hover:bg-accent/50 ${
                            isSelected ? "bg-accent/30" : ""
                          }`}
                          onClick={() => toggleItem(stock)}
                        >
                          <td className="p-2">
                            <Checkbox checked={isSelected} />
                          </td>
                          <td className="p-2 font-mono">{stock.heatNo || "\u2014"}</td>
                          <td className="p-2">{stock.product || "\u2014"}</td>
                          <td className="p-2">{stock.sizeLabel || "\u2014"}</td>
                          <td className="p-2">{stock.specification || "\u2014"}</td>
                          <td className="p-2 text-right">{Number(stock.quantityMtr).toFixed(3)}</td>
                          <td className="p-2 text-right">{stock.pieces}</td>
                          <td className="p-2">{stock.location || "\u2014"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
                    <th className="p-2 text-left">Heat No.</th>
                    <th className="p-2 text-left">Size</th>
                    <th className="p-2 text-left">Material</th>
                    <th className="p-2 text-right">Qty (Mtr)</th>
                    <th className="p-2 text-right">Pieces</th>
                    <th className="p-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedItems.map((item, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2 font-mono">{item.heatNo || "\u2014"}</td>
                      <td className="p-2">{item.sizeLabel || "\u2014"}</td>
                      <td className="p-2">{item.material || "\u2014"}</td>
                      <td className="p-2 text-right">{Number(item.quantityMtr).toFixed(3)}</td>
                      <td className="p-2 text-right">{item.pieces}</td>
                      <td className="p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500"
                          onClick={() =>
                            setSelectedItems(
                              selectedItems.filter((_, i) => i !== idx)
                            )
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

            <div className="flex justify-end mt-4">
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Creating..." : "Create Stock Issue"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
