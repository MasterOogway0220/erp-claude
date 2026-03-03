"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Warehouse, MapPin, Pencil } from "lucide-react";
import { toast } from "sonner";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

interface WarehouseForm {
  code: string;
  name: string;
  gstNo: string;
  addressLine1: string;
  addressLine2: string;
  pincode: string;
  state: string;
  country: string;
  stockVisible: boolean;
  isSelfStock: boolean;
  isActive: boolean;
}

const defaultForm: WarehouseForm = {
  code: "",
  name: "",
  gstNo: "",
  addressLine1: "",
  addressLine2: "",
  pincode: "",
  state: "",
  country: "India",
  stockVisible: true,
  isSelfStock: true,
  isActive: true,
};

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<WarehouseForm>(defaultForm);
  const [submitting, setSubmitting] = useState(false);

  // Location dialog state
  const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);
  const [showLocDialog, setShowLocDialog] = useState(false);
  const [locZone, setLocZone] = useState("");
  const [locRack, setLocRack] = useState("");
  const [locBay, setLocBay] = useState("");
  const [locShelf, setLocShelf] = useState("");
  const [locType, setLocType] = useState("GENERAL");
  const [locCapacity, setLocCapacity] = useState("");
  const [locPreservation, setLocPreservation] = useState("");
  const [locStorageConditions, setLocStorageConditions] = useState("");

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const res = await fetch("/api/masters/warehouses");
      if (res.ok) {
        const data = await res.json();
        setWarehouses(data.warehouses || []);
      }
    } catch (error) {
      console.error("Failed to fetch warehouses:", error);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setSheetOpen(true);
  };

  const openEdit = (wh: any) => {
    setEditingId(wh.id);
    setForm({
      code: wh.code || "",
      name: wh.name || "",
      gstNo: wh.gstNo || "",
      addressLine1: wh.addressLine1 || "",
      addressLine2: wh.addressLine2 || "",
      pincode: wh.pincode || "",
      state: wh.state || "",
      country: wh.country || "India",
      stockVisible: wh.stockVisible ?? true,
      isSelfStock: wh.isSelfStock ?? true,
      isActive: wh.isActive ?? true,
    });
    setSheetOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.code || !form.name) {
      toast.error("Code and name are required");
      return;
    }

    setSubmitting(true);
    try {
      const url = editingId
        ? `/api/masters/warehouses/${editingId}`
        : "/api/masters/warehouses";
      const method = editingId ? "PATCH" : "POST";

      const payload: any = { ...form };
      if (editingId) {
        delete payload.code; // Code can't be changed
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || `Failed to ${editingId ? "update" : "create"} warehouse`);
        return;
      }

      toast.success(`Warehouse ${editingId ? "updated" : "created"} successfully`);
      setSheetOpen(false);
      setForm(defaultForm);
      setEditingId(null);
      fetchWarehouses();
    } catch (error) {
      toast.error(`Failed to ${editingId ? "update" : "create"} warehouse`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddLocation = async () => {
    if (!selectedWarehouse) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/masters/warehouses/${selectedWarehouse.id}/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zone: locZone,
          rack: locRack,
          bay: locBay,
          shelf: locShelf,
          locationType: locType,
          capacity: locCapacity,
          preservationMethod: locPreservation || null,
          storageConditions: locStorageConditions || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to add location");
        return;
      }
      toast.success("Location added");
      setShowLocDialog(false);
      setLocZone("");
      setLocRack("");
      setLocBay("");
      setLocShelf("");
      setLocType("GENERAL");
      setLocCapacity("");
      setLocPreservation("");
      setLocStorageConditions("");
      fetchWarehouses();
    } catch (error) {
      toast.error("Failed to add location");
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<any>[] = [
    {
      key: "code",
      header: "Code",
      cell: (row) => <span className="font-mono font-medium">{row.code as string}</span>,
    },
    { key: "name", header: "Name" },
    {
      key: "gstNo",
      header: "GST No",
      cell: (row) => row.gstNo ? <span className="font-mono text-xs">{row.gstNo as string}</span> : <span className="text-muted-foreground">{"\u2014"}</span>,
    },
    {
      key: "state",
      header: "State",
      cell: (row) => (row.state as string) || "\u2014",
    },
    {
      key: "_count",
      header: "Locations",
      cell: (row) => {
        const count = (row._count as any)?.locations || 0;
        return <Badge variant="outline">{count}</Badge>;
      },
    },
    {
      key: "stockVisible",
      header: "Stock Visible",
      cell: (row) => (
        <Badge variant={row.stockVisible ? "default" : "secondary"}>
          {row.stockVisible ? "Yes" : "No"}
        </Badge>
      ),
    },
    {
      key: "isSelfStock",
      header: "Self Stock",
      cell: (row) => (
        <Badge variant={row.isSelfStock ? "default" : "secondary"}>
          {row.isSelfStock ? "Own" : "Third-Party"}
        </Badge>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      cell: (row) => (
        <Badge className={row.isActive ? "bg-green-500" : "bg-gray-500"}>
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(row);
            }}
          >
            <Pencil className="w-3 h-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedWarehouse(row);
              setShowLocDialog(true);
            }}
          >
            <MapPin className="w-3 h-3 mr-1" />
            Location
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouse Master"
        description="Manage warehouses and storage locations"
      >
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          New Warehouse
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Warehouse className="h-5 w-5" />
            Warehouses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={warehouses}
            searchKey="name"
            searchPlaceholder="Search warehouses..."
          />
        </CardContent>
      </Card>

      {/* Locations display for each warehouse */}
      {warehouses.filter(w => w.locations?.length > 0).map((wh) => (
        <Card key={wh.id}>
          <CardHeader>
            <CardTitle className="text-base">{wh.code} &mdash; {wh.name} Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left">Location Tag</th>
                    <th className="p-2 text-left">Zone</th>
                    <th className="p-2 text-left">Rack</th>
                    <th className="p-2 text-left">Bay</th>
                    <th className="p-2 text-left">Shelf</th>
                    <th className="p-2 text-left">Type</th>
                    <th className="p-2 text-left">Capacity</th>
                    <th className="p-2 text-left">Preservation</th>
                    <th className="p-2 text-left">Storage Conditions</th>
                    <th className="p-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {wh.locations.map((loc: any) => (
                    <tr key={loc.id} className="border-b">
                      <td className="p-2 font-mono text-xs">{loc.locationTag || "\u2014"}</td>
                      <td className="p-2">{loc.zone || "\u2014"}</td>
                      <td className="p-2">{loc.rack || "\u2014"}</td>
                      <td className="p-2">{loc.bay || "\u2014"}</td>
                      <td className="p-2">{loc.shelf || "\u2014"}</td>
                      <td className="p-2"><Badge variant="outline">{loc.locationType}</Badge></td>
                      <td className="p-2">{loc.capacity || "\u2014"}</td>
                      <td className="p-2">{loc.preservationMethod || "\u2014"}</td>
                      <td className="p-2 max-w-[200px] truncate">{loc.storageConditions || "\u2014"}</td>
                      <td className="p-2">
                        <Badge className={loc.isActive ? "bg-green-500" : "bg-gray-500"}>
                          {loc.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Create / Edit Warehouse Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingId ? "Edit Warehouse" : "Create Warehouse"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="e.g. WH-NM"
                  disabled={!!editingId}
                />
              </div>
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Navi Mumbai Warehouse"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>GST Number</Label>
              <Input
                value={form.gstNo}
                onChange={(e) => setForm({ ...form, gstNo: e.target.value.toUpperCase() })}
                placeholder="e.g. 27AABCN1234A1Z5"
                maxLength={15}
              />
            </div>

            <div className="space-y-2">
              <Label>Address Line 1</Label>
              <Input
                value={form.addressLine1}
                onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
                placeholder="Street address"
              />
            </div>

            <div className="space-y-2">
              <Label>Address Line 2</Label>
              <Input
                value={form.addressLine2}
                onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
                placeholder="Area, landmark (optional)"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pincode</Label>
                <Input
                  value={form.pincode}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                  placeholder="e.g. 400001"
                  maxLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Select value={form.state} onValueChange={(v) => setForm({ ...form, state: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Country</Label>
              <Input
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                placeholder="India"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm font-medium">Stock Visible</Label>
                <p className="text-xs text-muted-foreground">Show stock from this warehouse in listings</p>
              </div>
              <Switch
                checked={form.stockVisible}
                onCheckedChange={(v) => setForm({ ...form, stockVisible: v })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm font-medium">Self Stock</Label>
                <p className="text-xs text-muted-foreground">Own warehouse vs third-party storage</p>
              </div>
              <Switch
                checked={form.isSelfStock}
                onCheckedChange={(v) => setForm({ ...form, isSelfStock: v })}
              />
            </div>

            {editingId && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label className="text-sm font-medium">Active</Label>
                  <p className="text-xs text-muted-foreground">Enable or disable this warehouse</p>
                </div>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                />
              </div>
            )}

            <Button onClick={handleSubmit} disabled={submitting} className="w-full">
              {submitting ? (editingId ? "Updating..." : "Creating...") : (editingId ? "Update Warehouse" : "Create Warehouse")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Location Dialog */}
      <Dialog open={showLocDialog} onOpenChange={setShowLocDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Location to {selectedWarehouse?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Zone</Label>
                <Input value={locZone} onChange={(e) => setLocZone(e.target.value)} placeholder="e.g. A" />
              </div>
              <div className="space-y-2">
                <Label>Rack</Label>
                <Input value={locRack} onChange={(e) => setLocRack(e.target.value)} placeholder="e.g. R1" />
              </div>
              <div className="space-y-2">
                <Label>Bay</Label>
                <Input value={locBay} onChange={(e) => setLocBay(e.target.value)} placeholder="e.g. B1" />
              </div>
              <div className="space-y-2">
                <Label>Shelf</Label>
                <Input value={locShelf} onChange={(e) => setLocShelf(e.target.value)} placeholder="e.g. S1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location Type</Label>
                <Select value={locType} onValueChange={setLocType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GENERAL">General</SelectItem>
                    <SelectItem value="YARD">Yard</SelectItem>
                    <SelectItem value="COLD_STORAGE">Cold Storage</SelectItem>
                    <SelectItem value="HAZARDOUS">Hazardous</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Capacity</Label>
                <Input value={locCapacity} onChange={(e) => setLocCapacity(e.target.value)} placeholder="e.g. 50 MT" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Preservation Method</Label>
              <Select value={locPreservation} onValueChange={setLocPreservation}>
                <SelectTrigger><SelectValue placeholder="Select preservation method" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Indoor Protected">Indoor Protected</SelectItem>
                  <SelectItem value="Climate Controlled">Climate Controlled</SelectItem>
                  <SelectItem value="Open Yard">Open Yard</SelectItem>
                  <SelectItem value="Covered Shed">Covered Shed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Storage Conditions</Label>
              <Textarea
                value={locStorageConditions}
                onChange={(e) => setLocStorageConditions(e.target.value)}
                placeholder="Special storage notes..."
                rows={2}
              />
            </div>
            <Button onClick={handleAddLocation} disabled={submitting} className="w-full">
              {submitting ? "Adding..." : "Add Location"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
