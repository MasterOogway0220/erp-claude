"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Buyer {
  id: string;
  customerId: string;
  buyerName: string;
  designation: string | null;
  email: string | null;
  mobile: string | null;
  telephone: string | null;
  isActive: boolean;
  customer: {
    id: string;
    name: string;
  };
}

export default function BuyersPage() {
  const router = useRouter();
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBuyers = () => {
    setLoading(true);
    fetch("/api/masters/buyers")
      .then((r) => r.json())
      .then((d) => setBuyers(d.buyers || []))
      .catch(() => toast.error("Failed to load buyers"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBuyers(); }, []);

  const handleDelete = async (row: Buyer) => {
    if (!confirm(`Delete "${row.buyerName}"?`)) return;
    const res = await fetch(`/api/masters/buyers/${row.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Buyer deleted");
      fetchBuyers();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Failed to delete buyer");
    }
  };

  const columns: Column<Buyer>[] = [
    {
      key: "buyerName",
      header: "Buyer Name",
      sortable: true,
      cell: (row) => <span className="font-medium">{row.buyerName}</span>,
    },
    {
      key: "customer",
      header: "Customer",
      cell: (row) => row.customer?.name || "—",
    },
    {
      key: "designation",
      header: "Designation",
      cell: (row) => row.designation || "—",
    },
    {
      key: "email",
      header: "Email",
      cell: (row) => row.email || "—",
    },
    {
      key: "mobile",
      header: "Mobile",
      cell: (row) => row.mobile || "—",
    },
    {
      key: "isActive",
      header: "Status",
      cell: (row) => (
        <Badge variant={row.isActive ? "default" : "secondary"}>
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
            size="icon"
            onClick={() => router.push(`/masters/buyers/${row.id}/edit`)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(row)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buyer Contact"
        description="Manage buyer contacts for each customer"
      >
        <Button onClick={() => router.push("/masters/buyers/create")}>
          <Plus className="h-4 w-4 mr-2" />
          Add Buyer
        </Button>
      </PageHeader>

      {loading ? (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          Loading buyers...
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={buyers}
          searchKey="buyerName"
          searchPlaceholder="Search buyers..."
        />
      )}
    </div>
  );
}
