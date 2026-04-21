"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { DataTable, Column } from "@/components/shared/data-table";
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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Employee {
  id: string;
  code: string;
  name: string;
  department: string | null;
  email: string | null;
  mobile: string | null;
  moduleAccess: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/masters/employees");
      if (!res.ok) throw new Error("Failed to fetch employees");
      const data = await res.json();
      setEmployees(data.employees || []);
    } catch {
      toast.error("Failed to fetch employees");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleToggleActive = async (id: string, next: boolean) => {
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, isActive: next } : e)));
    try {
      const res = await fetch(`/api/masters/employees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update status");
      }
      toast.success(next ? "Employee activated — login enabled" : "Employee deactivated — login blocked");
    } catch (error: any) {
      setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, isActive: !next } : e)));
      toast.error(error.message || "Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/masters/employees/${deleteId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete");
      }
      toast.success("Employee deleted");
      fetchEmployees();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete employee");
    } finally {
      setDeleteId(null);
    }
  };

  const columns: Column<Employee>[] = [
    {
      key: "code",
      header: "Emp Code",
      sortable: true,
      cell: (row: Employee) => (
        <span className="font-mono text-sm">{row.code}</span>
      ),
    },
    {
      key: "name",
      header: "Name",
      sortable: true,
      cell: (row: Employee) => (
        <span className="font-medium">{row.name}</span>
      ),
    },
    {
      key: "department",
      header: "Department",
      sortable: true,
      cell: (row: Employee) => row.department || "—",
    },
    {
      key: "email",
      header: "Email",
      cell: (row: Employee) => row.email || "—",
    },
    {
      key: "mobile",
      header: "Mobile",
      cell: (row: Employee) => row.mobile || "—",
    },
    {
      key: "moduleAccess",
      header: "Module Access",
      cell: (row: Employee) =>
        row.moduleAccess.length === 0 ? (
          <span className="text-muted-foreground text-xs">—</span>
        ) : row.moduleAccess.length === 8 ? (
          <Badge variant="secondary">All modules</Badge>
        ) : (
          <div className="flex flex-wrap gap-1">
            {row.moduleAccess.map((m) => (
              <Badge key={m} variant="outline" className="text-xs capitalize">
                {m}
              </Badge>
            ))}
          </div>
        ),
    },
    {
      key: "isActive",
      header: "Status",
      cell: (row: Employee) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={row.isActive}
            onCheckedChange={(v) => handleToggleActive(row.id, v)}
            aria-label={row.isActive ? "Deactivate employee" : "Activate employee"}
          />
          <span className={row.isActive ? "text-xs text-foreground" : "text-xs text-muted-foreground"}>
            {row.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: Employee) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/masters/employees/${row.id}/edit`)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Employee Master"
          description="Manage employee records and link to user accounts"
        />
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              Loading employees...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Master"
        description="Manage employee records and link to user accounts"
      >
        <Button onClick={() => router.push("/masters/employees/create")}>
          <Plus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Employees ({employees.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<Employee>
            columns={columns}
            data={employees}
            searchKey="name"
            searchPlaceholder="Search by employee name..."
            pageSize={10}
          />
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The employee and their linked user account will be permanently removed.
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
