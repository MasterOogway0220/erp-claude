"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/shared/data-table";
import { PageLoading } from "@/components/shared/page-loading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, FileText } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

const statusVariant: Record<string, string> = {
  DRAFT: "secondary",
  ISSUED: "green",
  CANCELLED: "destructive",
};

export default function LabLettersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["lab-letters"],
    queryFn: async () => {
      const res = await fetch("/api/quality/lab-letters");
      if (!res.ok) throw new Error("Failed to fetch lab letters");
      return res.json();
    },
  });

  if (isLoading) return <PageLoading />;

  const labLetters = data?.labLetters || [];

  const columns: Column<any>[] = [
    {
      key: "letterNo",
      header: "Letter No",
      cell: (row) => (
        <Link
          href={`/quality/lab-letters/${row.id}`}
          className="font-mono text-sm text-blue-600 hover:underline"
        >
          {row.letterNo as string}
        </Link>
      ),
    },
    {
      key: "letterDate",
      header: "Date",
      cell: (row) =>
        row.letterDate
          ? format(new Date(row.letterDate as string), "dd MMM yyyy")
          : "—",
    },
    {
      key: "labName",
      header: "Lab Name",
      cell: (row) => (row.labName as string) || "—",
    },
    {
      key: "heatNo",
      header: "Heat No",
      cell: (row) => (
        <span className="font-mono text-sm">{(row.heatNo as string) || "—"}</span>
      ),
    },
    {
      key: "poNumber",
      header: "PO Number",
      cell: (row) => (
        <span className="font-mono text-sm">{(row.poNumber as string) || "—"}</span>
      ),
    },
    {
      key: "clientName",
      header: "Client",
      cell: (row) => (row.clientName as string) || "—",
    },
    {
      key: "testNames",
      header: "Tests",
      cell: (row) => {
        const tests = row.testNames as string[] | null;
        if (!tests || tests.length === 0) return "—";
        return (
          <div className="flex flex-wrap gap-1">
            {tests.map((test: string, i: number) => (
              <Badge key={i} variant="outline" className="text-xs">
                {test}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => {
        const status = (row.status as string) || "DRAFT";
        const variant = statusVariant[status] || "secondary";
        return (
          <Badge
            variant={variant as any}
            className={
              variant === "green"
                ? "bg-green-500 hover:bg-green-600 text-white"
                : undefined
            }
          >
            {status}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <Link href={`/quality/lab-letters/${row.id}`}>
          <Button variant="ghost" size="sm">
            <Eye className="w-4 h-4" />
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lab Letters"
        description="Manage lab test request letters"
      >
        <Link href="/quality/lab-letters/create">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Lab Letter
          </Button>
        </Link>
      </PageHeader>

      <DataTable
        columns={columns}
        data={labLetters}
        searchKey="letterNo"
        searchPlaceholder="Search by letter number..."
      />
    </div>
  );
}
