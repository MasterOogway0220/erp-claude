"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Plus, Eye, Pencil } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageLoading } from "@/components/shared/page-loading";

export default function MaterialSpecsListPage() {
  const router = useRouter();
  const [specs, setSpecs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSpecs();
  }, []);

  const fetchSpecs = async () => {
    try {
      const response = await fetch("/api/mtc/material-specs");
      if (response.ok) {
        const data = await response.json();
        setSpecs(data.specs || []);
      }
    } catch (error) {
      console.error("Failed to fetch material specs:", error);
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<any>[] = [
    {
      key: "specification",
      header: "Material Spec",
      sortable: true,
      cell: (row) => (
        <Link
          href={`/quality/mtc/material-specs/${row.id}`}
          className="font-mono text-sm text-blue-600 hover:underline font-medium"
        >
          {row.specification}
        </Link>
      ),
    },
    {
      key: "description",
      header: "Description",
      cell: (row) => (
        <span className="text-sm">{row.description || "—"}</span>
      ),
    },
    {
      key: "startingMaterial",
      header: "Starting Material",
      cell: (row) => (
        <span className="text-sm">{row.startingMaterial?.replace(/_/g, " ") || "—"}</span>
      ),
    },
    {
      key: "heatTreatment",
      header: "Heat Treatment",
      cell: (row) => (
        <span className="text-sm">{row.heatTreatment || "—"}</span>
      ),
    },
    {
      key: "constructionType",
      header: "Construction",
      cell: (row) => (
        <Badge variant="outline">{row.constructionType?.replace(/_/g, " ") || "—"}</Badge>
      ),
    },
    {
      key: "dimensionStandard",
      header: "Dimension Std",
      cell: (row) => (
        <span className="text-sm">{row.dimensionStandard || "—"}</span>
      ),
    },
    {
      key: "chemicalElements",
      header: "Chemical Elements",
      cell: (row) => (
        <Badge variant="secondary">{row.chemicalElements?.length || 0}</Badge>
      ),
    },
    {
      key: "mechanicalProperties",
      header: "Mech Properties",
      cell: (row) => (
        <Badge variant="secondary">{row.mechanicalProperties?.length || 0}</Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.push(`/quality/mtc/material-specs/${row.id}`)}
            title="View"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.push(`/quality/mtc/material-specs/create?edit=${row.id}`)}
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Material Specifications"
        description="Master list of material specifications for MTC generation"
      >
        <Button onClick={() => router.push("/quality/mtc/material-specs/create")}>
          <Plus className="w-4 h-4 mr-2" />
          New Material Spec
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={specs}
        searchKey="specification"
        searchPlaceholder="Search by specification..."
      />
    </div>
  );
}
