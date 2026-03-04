"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

type TabValue = "ALL" | "BUYER" | "SUPPLIER";

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabValue>("ALL");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (activeTab !== "ALL") params.set("companyType", activeTab);
      const res = await fetch(`/api/masters/customers?${params}`);
      if (res.ok) {
        const d = await res.json();
        setCustomers(d.customers || []);
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [search, activeTab]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/masters/customers/${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
      }
      toast.success("Customer deleted");
      fetchCustomers();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete customer");
    } finally {
      setDeleteId(null);
    }
  };

  const addLabel = activeTab === "BUYER" ? "Add Buyer" : activeTab === "SUPPLIER" ? "Add Vendor" : "Add Customer";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Master"
        description="Manage customer information for quotations and sales orders"
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="ALL">All</TabsTrigger>
            <TabsTrigger value="BUYER">Buyers</TabsTrigger>
            <TabsTrigger value="SUPPLIER">Vendors</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or GST..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-72"
              />
            </div>
            <Button onClick={() => router.push("/masters/customers/create")}>
              <Plus className="h-4 w-4 mr-2" />
              {addLabel}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border bg-card mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>City</TableHead>
                <TableHead>GST No.</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No {activeTab === "BUYER" ? "buyers" : activeTab === "SUPPLIER" ? "vendors" : "customers"} found
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          c.companyType === "BOTH"
                            ? "text-xs border-purple-400 text-purple-600"
                            : c.companyType === "SUPPLIER"
                            ? "text-xs border-orange-400 text-orange-600"
                            : "text-xs border-blue-400 text-blue-600"
                        }
                      >
                        {c.companyType === "BOTH" ? "Buyer & Vendor" : c.companyType === "SUPPLIER" ? "Vendor" : "Buyer"}
                      </Badge>
                    </TableCell>
                    <TableCell>{c.contactPerson || "—"}</TableCell>
                    <TableCell>{c.email || "—"}</TableCell>
                    <TableCell>{c.city || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{c.gstNo || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {c.tags?.map((t: any) => (
                          <Badge key={t.id} variant="secondary" className="text-xs">
                            {t.tag.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.isActive ? "default" : "secondary"}>
                        {c.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/masters/customers/${c.id}/edit`)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(c.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Tabs>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All data associated with this customer will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
