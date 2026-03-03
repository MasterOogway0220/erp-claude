"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Warehouse,
  CheckCircle,
  Clock,
  AlertTriangle,
  Package,
  Plus,
  Filter,
  X,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

const stockStatusColors: Record<string, string> = {
  UNDER_INSPECTION: "bg-yellow-500",
  ACCEPTED: "bg-green-500",
  REJECTED: "bg-red-500",
  HOLD: "bg-orange-500",
  RESERVED: "bg-blue-500",
  DISPATCHED: "bg-gray-500",
};

interface WarehouseOption {
  id: string;
  code: string;
  name: string;
  isSelfStock: boolean;
  locations: {
    id: string;
    rack: string | null;
    bay: string | null;
  }[];
}

interface VendorOption {
  id: string;
  name: string;
}

export default function InventoryPage() {
  const router = useRouter();
  const [stocks, setStocks] = useState<any[]>([]);
  const [grns, setGrns] = useState<any[]>([]);
  const [stockIssues, setStockIssues] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [warehouseId, setWarehouseId] = useState<string>("all");
  const [rack, setRack] = useState<string>("all");
  const [bay, setBay] = useState<string>("all");
  const [vendorId, setVendorId] = useState<string>("all");
  const [selfStockFilter, setSelfStockFilter] = useState<string>("all"); // "all" | "true" | "false"

  // Reference data
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);

  // Fetch reference data on mount
  useEffect(() => {
    fetchWarehouses();
    fetchVendors();
  }, []);

  // Fetch stock when filters change
  useEffect(() => {
    fetchStock();
  }, [statusFilter, warehouseId, rack, bay, vendorId, selfStockFilter]);

  // Fetch GRN and stock issues on mount
  useEffect(() => {
    fetchGRNs();
    fetchStockIssues();
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
    }
  };

  const fetchVendors = async () => {
    try {
      const res = await fetch("/api/masters/vendors");
      if (res.ok) {
        const data = await res.json();
        setVendors(data.vendors || []);
      }
    } catch (error) {
      console.error("Failed to fetch vendors:", error);
    }
  };

  const fetchStock = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      if (warehouseId && warehouseId !== "all") params.append("warehouseId", warehouseId);
      if (rack && rack !== "all") params.append("rack", rack);
      if (bay && bay !== "all") params.append("bay", bay);
      if (vendorId && vendorId !== "all") params.append("vendorId", vendorId);
      if (selfStockFilter !== "all") params.append("selfStock", selfStockFilter);
      const response = await fetch(`/api/inventory/stock?${params}`);
      if (response.ok) {
        const data = await response.json();
        setStocks(data.stocks || []);
        setSummary(data.summary || {});
      }
    } catch (error) {
      console.error("Failed to fetch stock:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGRNs = async () => {
    try {
      const response = await fetch("/api/inventory/grn");
      if (response.ok) {
        const data = await response.json();
        setGrns(data.grns || []);
      }
    } catch (error) {
      console.error("Failed to fetch GRNs:", error);
    }
  };

  const fetchStockIssues = async () => {
    try {
      const response = await fetch("/api/inventory/stock-issue");
      if (response.ok) {
        const data = await response.json();
        setStockIssues(data.stockIssues || []);
      }
    } catch (error) {
      console.error("Failed to fetch stock issues:", error);
    }
  };

  // Cascading location options
  const selectedWarehouse = warehouses.find((w) => w.id === warehouseId);

  const rackOptions = useMemo(() => {
    if (!selectedWarehouse) return [];
    const racks = new Set<string>();
    selectedWarehouse.locations.forEach((loc) => {
      if (loc.rack) racks.add(loc.rack);
    });
    return Array.from(racks).sort();
  }, [selectedWarehouse]);

  const bayOptions = useMemo(() => {
    if (!selectedWarehouse || rack === "all") return [];
    const bays = new Set<string>();
    selectedWarehouse.locations.forEach((loc) => {
      if (loc.rack === rack && loc.bay) bays.add(loc.bay);
    });
    return Array.from(bays).sort();
  }, [selectedWarehouse, rack]);

  // Reset dependent dropdowns
  const handleWarehouseChange = (val: string) => {
    setWarehouseId(val);
    setRack("all");
    setBay("all");
  };

  const handleRackChange = (val: string) => {
    setRack(val);
    setBay("all");
  };

  const hasActiveFilters =
    warehouseId !== "all" ||
    rack !== "all" ||
    bay !== "all" ||
    vendorId !== "all" ||
    selfStockFilter !== "all";

  const clearFilters = () => {
    setWarehouseId("all");
    setRack("all");
    setBay("all");
    setVendorId("all");
    setSelfStockFilter("all");
  };

  const stockColumns: Column<any>[] = [
    {
      key: "heatNo",
      header: "Heat No.",
      cell: (row) => (
        <Link
          href={`/inventory/stock/${row.id}`}
          className="font-mono text-sm text-blue-600 hover:underline"
        >
          {(row.heatNo as string) || "—"}
        </Link>
      ),
    },
    { key: "product", header: "Product" },
    { key: "specification", header: "Specification" },
    { key: "sizeLabel", header: "Size" },
    {
      key: "quantityMtr",
      header: "Qty (Mtr)",
      cell: (row) => Number(row.quantityMtr).toFixed(3),
    },
    { key: "pieces", header: "Pcs" },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge className={stockStatusColors[row.status as string] || "bg-gray-500"}>
          {(row.status as string).replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "warehouseLocation",
      header: "Warehouse",
      cell: (row) => {
        const wl = row.warehouseLocation as any;
        if (!wl?.warehouse) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="text-xs">
            <div className="font-medium">{wl.warehouse.code}</div>
            {wl.warehouse.isSelfStock ? (
              <Badge variant="outline" className="text-[10px] px-1 py-0">Self</Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px] px-1 py-0">Vendor</Badge>
            )}
          </div>
        );
      },
    },
    {
      key: "rackLocation",
      header: "Rack / Bay",
      cell: (row) => {
        const wl = row.warehouseLocation as any;
        if (!wl) return row.rackNo || row.location || "—";
        const parts = [wl.rack, wl.bay, wl.shelf].filter(Boolean);
        return parts.length > 0 ? (
          <span className="font-mono text-xs">{parts.join(" / ")}</span>
        ) : (
          "—"
        );
      },
    },
    {
      key: "vendor",
      header: "Vendor",
      cell: (row) => {
        const vendor = (row.grnItem as any)?.grn?.vendor;
        return vendor?.name ? (
          <span className="text-xs">{vendor.name}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      key: "grnItem",
      header: "GRN",
      cell: (row) => {
        const grnItem = row.grnItem as any;
        return grnItem?.grn ? (
          <Link
            href={`/inventory/grn/${grnItem.grn.id}`}
            className="text-sm text-blue-600 hover:underline"
          >
            {grnItem.grn.grnNo}
          </Link>
        ) : (
          "—"
        );
      },
    },
  ];

  const grnColumns: Column<any>[] = [
    {
      key: "grnNo",
      header: "GRN No.",
      cell: (row) => (
        <Link
          href={`/inventory/grn/${row.id}`}
          className="font-mono text-sm text-blue-600 hover:underline"
        >
          {row.grnNo as string}
        </Link>
      ),
    },
    {
      key: "grnDate",
      header: "Date",
      cell: (row) => format(new Date(row.grnDate as string), "dd MMM yyyy"),
    },
    {
      key: "purchaseOrder",
      header: "PO No.",
      cell: (row) => (row.purchaseOrder as any)?.poNo || "—",
    },
    {
      key: "vendor",
      header: "Vendor",
      cell: (row) => (row.vendor as any)?.name || "—",
    },
    {
      key: "items",
      header: "Items",
      cell: (row) => (row.items as any[])?.length || 0,
    },
    {
      key: "receivedBy",
      header: "Received By",
      cell: (row) => (row.receivedBy as any)?.name || "—",
    },
  ];

  const issueStatusColors: Record<string, string> = {
    DRAFT: "bg-gray-500",
    PENDING_AUTHORIZATION: "bg-yellow-500",
    AUTHORIZED: "bg-green-500",
    REJECTED: "bg-red-500",
  };

  const stockIssueColumns: Column<any>[] = [
    {
      key: "issueNo",
      header: "Issue No.",
      cell: (row) => (
        <Link
          href={`/inventory/stock-issue/${row.id}`}
          className="font-mono text-sm text-blue-600 hover:underline"
        >
          {row.issueNo as string}
        </Link>
      ),
    },
    {
      key: "issueDate",
      header: "Date",
      cell: (row) => format(new Date(row.issueDate as string), "dd MMM yyyy"),
    },
    {
      key: "salesOrder",
      header: "SO No.",
      cell: (row) => (row.salesOrder as any)?.soNo || "—",
    },
    {
      key: "customer",
      header: "Customer",
      cell: (row) => (row.salesOrder as any)?.customer?.name || "—",
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge className={issueStatusColors[row.status as string] || "bg-gray-500"}>
          {(row.status as string || "DRAFT").replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "items",
      header: "Items",
      cell: (row) => (row.items as any[])?.length || 0,
    },
    {
      key: "issuedBy",
      header: "Issued By",
      cell: (row) => (row.issuedBy as any)?.name || "—",
    },
  ];

  const totalStock = summary.total || 0;
  const accepted = summary.byStatus?.ACCEPTED || 0;
  const underInspection = summary.byStatus?.UNDER_INSPECTION || 0;
  const reserved = summary.byStatus?.RESERVED || 0;
  const rejected = summary.byStatus?.REJECTED || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Management"
        description="Stock view, GRN register, and inventory tracking"
      >
        <Button onClick={() => router.push("/inventory/grn/create")}>
          <Plus className="w-4 h-4 mr-2" />
          New GRN
        </Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStock}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{accepted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Inspection</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{underInspection}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reserved</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{reserved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rejected}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="stock" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stock">Stock View</TabsTrigger>
          <TabsTrigger value="grn">GRN Register</TabsTrigger>
          <TabsTrigger value="stock-issues">Stock Issues</TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Inventory Stock
                </CardTitle>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="UNDER_INSPECTION">Under Inspection</SelectItem>
                    <SelectItem value="ACCEPTED">Accepted</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="HOLD">Hold</SelectItem>
                    <SelectItem value="RESERVED">Reserved</SelectItem>
                    <SelectItem value="DISPATCHED">Dispatched</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Location Mapping & Filters */}
              <div className="mt-4 p-3 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Location & Vendor Filters</span>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                      <X className="h-3 w-3 mr-1" />
                      Clear filters
                    </Button>
                  )}
                </div>

                {/* Row 1: Warehouse → Rack → Rack Number (Bay) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Warehouse</Label>
                    <Select value={warehouseId} onValueChange={handleWarehouseChange}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All Warehouses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Warehouses</SelectItem>
                        {warehouses.map((wh) => (
                          <SelectItem key={wh.id} value={wh.id}>
                            {wh.code} — {wh.name}
                            {!wh.isSelfStock ? " (Third-Party)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Rack</Label>
                    <Select
                      value={rack}
                      onValueChange={handleRackChange}
                      disabled={warehouseId === "all"}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All Racks" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Racks</SelectItem>
                        {rackOptions.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Rack Number (Bay)</Label>
                    <Select
                      value={bay}
                      onValueChange={setBay}
                      disabled={rack === "all"}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All Bays" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Bays</SelectItem>
                        {bayOptions.map((b) => (
                          <SelectItem key={b} value={b}>
                            {b}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row 2: Vendor + Self Stock toggle */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Vendor</Label>
                    <Select value={vendorId} onValueChange={setVendorId}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All Vendors" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Vendors</SelectItem>
                        {vendors.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Stock Type</Label>
                    <Select value={selfStockFilter} onValueChange={setSelfStockFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All Stock" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Stock</SelectItem>
                        <SelectItem value="true">Self Stock Only</SelectItem>
                        <SelectItem value="false">Vendor Stock Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {hasActiveFilters && (
                    <div className="flex flex-wrap gap-1.5">
                      {warehouseId !== "all" && (
                        <Badge variant="secondary" className="text-xs">
                          {warehouses.find((w) => w.id === warehouseId)?.code}
                        </Badge>
                      )}
                      {rack !== "all" && (
                        <Badge variant="secondary" className="text-xs">
                          Rack: {rack}
                        </Badge>
                      )}
                      {bay !== "all" && (
                        <Badge variant="secondary" className="text-xs">
                          Bay: {bay}
                        </Badge>
                      )}
                      {vendorId !== "all" && (
                        <Badge variant="secondary" className="text-xs">
                          {vendors.find((v) => v.id === vendorId)?.name}
                        </Badge>
                      )}
                      {selfStockFilter !== "all" && (
                        <Badge variant="secondary" className="text-xs">
                          {selfStockFilter === "true" ? "Self Stock" : "Vendor Stock"}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={stockColumns}
                data={stocks}
                searchKey="heatNo"
                searchPlaceholder="Search by heat number..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grn">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Goods Receipt Notes</CardTitle>
                <Button onClick={() => router.push("/inventory/grn/create")}>
                  <Plus className="w-4 h-4 mr-2" />
                  New GRN
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={grnColumns}
                data={grns}
                searchKey="grnNo"
                searchPlaceholder="Search by GRN number..."
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="stock-issues">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Stock Issues</CardTitle>
                <Button onClick={() => router.push("/inventory/stock-issue/create")}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Stock Issue
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={stockIssueColumns}
                data={stockIssues}
                searchKey="issueNo"
                searchPlaceholder="Search by issue number..."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
