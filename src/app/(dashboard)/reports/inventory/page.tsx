"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Warehouse,
  CheckCircle,
  Clock,
  AlertTriangle,
  Package,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { ExportButton } from "@/components/shared/export-button";

interface InventoryDashboard {
  totalStock: number;
  byStatus: {
    status: string;
    count: number;
  }[];
  byProduct: {
    product: string;
    totalQuantityMtr: number;
    totalPieces: number;
    count: number;
  }[];
  byMaterial: {
    material: string;
    specification: string;
    totalQuantityMtr: number;
    totalPieces: number;
    count: number;
  }[];
}

const statusIcons: Record<string, React.ReactNode> = {
  ACCEPTED: <CheckCircle className="h-4 w-4 text-green-500" />,
  UNDER_INSPECTION: <Clock className="h-4 w-4 text-yellow-500" />,
  REJECTED: <AlertTriangle className="h-4 w-4 text-red-500" />,
  RESERVED: <Package className="h-4 w-4 text-blue-500" />,
};

const statusCardColors: Record<string, string> = {
  ACCEPTED: "text-green-600",
  UNDER_INSPECTION: "text-yellow-600",
  REJECTED: "text-red-600",
  RESERVED: "text-blue-600",
  HOLD: "text-orange-600",
  DISPATCHED: "text-gray-600",
};

export default function InventoryDashboardPage() {
  const [data, setData] = useState<InventoryDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/reports/inventory-dashboard");
      if (!response.ok) throw new Error("Failed to fetch");
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to fetch inventory dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Inventory Dashboard"
          description="Stock summary by status, product, and material breakdown"
        />
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          Loading inventory dashboard...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Inventory Dashboard"
          description="Stock summary by status, product, and material breakdown"
        />
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No inventory data available. Ensure the API endpoint is configured.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Dashboard"
        description="Stock summary by status, product, and material breakdown"
      >
        <ExportButton reportType="inventory" label="Export Inventory CSV" />
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalStock || 0}</div>
          </CardContent>
        </Card>
        {(data.byStatus || []).slice(0, 4).map((s) => (
          <Card key={s.status}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {s.status.replace(/_/g, " ")}
              </CardTitle>
              {statusIcons[s.status] || (
                <Package className="h-4 w-4 text-muted-foreground" />
              )}
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  statusCardColors[s.status] || "text-foreground"
                }`}
              >
                {s.count}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock by Product</CardTitle>
        </CardHeader>
        <CardContent>
          {data.byProduct && data.byProduct.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Total Qty (Mtr)</TableHead>
                  <TableHead className="text-right">Total Pieces</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.byProduct.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{row.product}</TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
                    <TableCell className="text-right font-mono">
                      {Number(row.totalQuantityMtr).toFixed(3)}
                    </TableCell>
                    <TableCell className="text-right">{row.totalPieces}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-4 text-center text-muted-foreground">
              No product-wise data available
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stock by Material / Specification</CardTitle>
        </CardHeader>
        <CardContent>
          {data.byMaterial && data.byMaterial.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Specification</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Total Qty (Mtr)</TableHead>
                  <TableHead className="text-right">Total Pieces</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.byMaterial.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{row.material}</TableCell>
                    <TableCell>{row.specification}</TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
                    <TableCell className="text-right font-mono">
                      {Number(row.totalQuantityMtr).toFixed(3)}
                    </TableCell>
                    <TableCell className="text-right">{row.totalPieces}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-4 text-center text-muted-foreground">
              No material-wise data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
