"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

interface Customer {
  id: string;
  name: string;
}

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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");

  const fetchBuyers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (customerFilter) params.set("customerId", customerFilter);
      const res = await fetch(`/api/masters/buyers?${params}`);
      if (!res.ok) throw new Error("Failed to fetch buyers");
      const data = await res.json();
      setBuyers(data.buyers);
    } catch {
      toast.error("Failed to load buyers");
    } finally {
      setLoading(false);
    }
  }, [search, customerFilter]);

  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/masters/customers");
      if (!res.ok) throw new Error("Failed to fetch customers");
      const data = await res.json();
      setCustomers(data.customers);
    } catch {
      toast.error("Failed to load customers");
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      fetchBuyers();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchBuyers]);

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
      cell: (row) => row.customer?.name || "\u2014",
    },
    {
      key: "designation",
      header: "Designation",
      cell: (row) => row.designation || "\u2014",
    },
    {
      key: "email",
      header: "Email",
      cell: (row) => row.email || "\u2014",
    },
    {
      key: "mobile",
      header: "Mobile",
      cell: (row) => row.mobile || "\u2014",
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
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/masters/buyers/${row.id}/edit`)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buyer Master"
        description="Manage buyer contacts for each customer"
      >
        <Button onClick={() => router.push("/masters/buyers/create")}>
          <Plus className="h-4 w-4 mr-2" />
          Add Buyer
        </Button>
      </PageHeader>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px] max-w-sm">
              <Label htmlFor="search" className="mb-2 block text-sm">
                Search
              </Label>
              <Input
                id="search"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="min-w-[200px] max-w-sm">
              <Label htmlFor="customerFilter" className="mb-2 block text-sm">
                Customer
              </Label>
              <Select
                value={customerFilter}
                onValueChange={(value) =>
                  setCustomerFilter(value === "all" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
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
