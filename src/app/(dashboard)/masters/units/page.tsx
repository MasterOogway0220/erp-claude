"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/shared/data-table";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

interface Unit {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function UnitsPage() {
  const router = useRouter();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUnits = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/masters/units");
      if (!res.ok) throw new Error("Failed to fetch units");
      const data = await res.json();
      setUnits(data.units || []);
    } catch {
      toast.error("Failed to load units");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const columns: Column<Unit>[] = [
    {
      key: "code",
      header: "Code",
      sortable: true,
      cell: (row: Unit) => (
        <span className="font-medium">{row.code}</span>
      ),
    },
    {
      key: "name",
      header: "Name",
      sortable: true,
    },
    {
      key: "isActive",
      header: "Status",
      cell: (row: Unit) => (
        <Badge variant={row.isActive ? "default" : "secondary"}>
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: Unit) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/masters/units/${row.id}/edit`)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Unit Master (UOM)"
        description="Manage units of measurement for products and materials"
      >
        <Button onClick={() => router.push("/masters/units/create")}>
          <Plus className="h-4 w-4 mr-2" />
          Add Unit
        </Button>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Units
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{units.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {units.filter((u) => u.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Inactive
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {units.filter((u) => !u.isActive).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          Loading units...
        </div>
      ) : (
        <DataTable<Unit>
          columns={columns}
          data={units}
          searchKey="code"
          searchPlaceholder="Search by code..."
          pageSize={15}
        />
      )}

      {/* Pre-seeded reference */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <h3 className="font-semibold mb-2">Pre-seeded Units</h3>
        <p className="text-sm text-muted-foreground mb-3">
          The following standard units are pre-loaded in the system:
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { code: "Kg", name: "Kilogram" },
            { code: "Pcs", name: "Pieces" },
            { code: "Nos", name: "Numbers" },
            { code: "Mtr", name: "Meter" },
            { code: "Ft", name: "Feet" },
            { code: "MM", name: "Millimeter" },
            { code: "In", name: "Inch" },
            { code: "MT", name: "Metric Ton" },
            { code: "Set", name: "Set" },
            { code: "Lot", name: "Lot" },
            { code: "Bundle", name: "Bundle" },
          ].map((u) => (
            <Badge key={u.code} variant="outline">
              {u.code} - {u.name}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
