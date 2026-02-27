"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Warehouse, MapPin } from "lucide-react";
import { toast } from "sonner";

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);
  const [showLocDialog, setShowLocDialog] = useState(false);

  // Create form
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Location form
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

  const handleCreate = async () => {
    if (!code || !name) {
      toast.error("Code and name are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/masters/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name, address }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to create warehouse");
        return;
      }
      toast.success("Warehouse created");
      setShowCreate(false);
      setCode("");
      setName("");
      setAddress("");
      fetchWarehouses();
    } catch (error) {
      toast.error("Failed to create warehouse");
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
      key: "address",
      header: "Address",
      cell: (row) => (row.address as string) || "\u2014",
    },
    {
      key: "_count",
      header: "Locations",
      cell: (row) => {
        const count = (row._count as any)?.locations || 0;
        return <Badge variant="outline">{count} location(s)</Badge>;
      },
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
          Add Location
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouse Master"
        description="Manage warehouses and storage locations"
      >
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Warehouse
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Warehouse</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. WH-NM" />
              </div>
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Navi Mumbai Warehouse" />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Warehouse address..." rows={2} />
              </div>
              <Button onClick={handleCreate} disabled={submitting} className="w-full">
                {submitting ? "Creating..." : "Create Warehouse"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
