"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, ShieldCheck, FileText } from "lucide-react";
import { toast } from "sonner";

interface TPIAgency {
  id: string;
  name: string;
  code: string;
}

interface QualityRequirement {
  id: string;
  companyId: string | null;
  parameter: string;
  value: string | null;
  colourCodingRequired: boolean;
  inspectionRequired: boolean;
  tpiAgencyId: string | null;
  tpiAgency: TPIAgency | null;
  testingRequired: boolean;
  testType: string | null;
  inspectionLocation: string | null;
  qapDocumentPath: string | null;
  remarks: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const TEST_TYPES: Record<string, string> = {
  HYDRO: "Hydro Test",
  CHEMICAL: "Chemical Analysis",
  MECHANICAL: "Mechanical Testing",
  IGC: "IGC (Intergranular Corrosion)",
  IMPACT: "Impact Test",
};

export default function QualityRequirementsPage() {
  const router = useRouter();
  const [requirements, setRequirements] = useState<QualityRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<QualityRequirement | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRequirements = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/quality/requirements");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setRequirements(data.requirements || []);
    } catch {
      toast.error("Failed to fetch quality requirements");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequirements();
  }, [fetchRequirements]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/quality/requirements/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete");
      }
      toast.success("Quality requirement deleted");
      setDeleteTarget(null);
      fetchRequirements();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<QualityRequirement>[] = [
    {
      key: "parameter",
      header: "Parameter",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-medium text-sm">{row.parameter}</span>
          {row.value && (
            <div className="text-xs text-muted-foreground mt-0.5 max-w-[200px] truncate">
              {row.value}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "colourCodingRequired",
      header: "Colour Coding",
      cell: (row) => (
        <Badge variant={row.colourCodingRequired ? "default" : "secondary"} className="text-xs">
          {row.colourCodingRequired ? "Yes" : "No"}
        </Badge>
      ),
    },
    {
      key: "inspectionRequired",
      header: "Inspection",
      cell: (row) => (
        <div className="space-y-0.5">
          <Badge variant={row.inspectionRequired ? "default" : "secondary"} className="text-xs">
            {row.inspectionRequired ? "Required" : "No"}
          </Badge>
          {row.inspectionRequired && row.inspectionLocation && (
            <div className="text-xs text-muted-foreground">
              {row.inspectionLocation === "WAREHOUSE" ? "Warehouse" : "Lab"}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "tpiAgency",
      header: "TPI Agency",
      cell: (row) =>
        row.tpiAgency ? (
          <span className="text-sm">{row.tpiAgency.name}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "testingRequired",
      header: "Testing",
      cell: (row) => (
        <div className="space-y-0.5">
          <Badge variant={row.testingRequired ? "default" : "secondary"} className="text-xs">
            {row.testingRequired ? "Required" : "No"}
          </Badge>
          {row.testingRequired && row.testType && (
            <div className="text-xs text-muted-foreground">
              {TEST_TYPES[row.testType] || row.testType}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "qapDocumentPath",
      header: "QAP Doc",
      cell: (row) =>
        row.qapDocumentPath ? (
          <a
            href={row.qapDocumentPath}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline text-xs flex items-center gap-1"
          >
            <FileText className="h-3.5 w-3.5" />
            View
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.push(`/quality/requirements/${row.id}/edit`)}
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => setDeleteTarget(row)}
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const activeCount = requirements.filter((r) => r.isActive).length;
  const inspectionCount = requirements.filter((r) => r.inspectionRequired).length;
  const testingCount = requirements.filter((r) => r.testingRequired).length;
  const withDocsCount = requirements.filter((r) => r.qapDocumentPath).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quality Requirement Definitions"
        description="Define quality requirements as per QAP (Quality Assurance Plan)"
      >
        <Button onClick={() => router.push("/quality/requirements/create")}>
          <Plus className="h-4 w-4 mr-2" />
          Add Requirement
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground">Active Requirements</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold">{inspectionCount}</div>
            <p className="text-xs text-muted-foreground">Inspection Required</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold">{testingCount}</div>
            <p className="text-xs text-muted-foreground">Testing Required</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold">{withDocsCount}</div>
            <p className="text-xs text-muted-foreground">With QAP Documents</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
            Quality Requirements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-24 text-muted-foreground">
              Loading requirements...
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={requirements}
              searchKey="parameter"
              searchPlaceholder="Search by parameter, value, test type..."
              pageSize={25}
            />
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quality Requirement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the requirement for{" "}
              <strong>{deleteTarget?.parameter}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
