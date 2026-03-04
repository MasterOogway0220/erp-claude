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

interface Employee {
  id: string;
  code: string;
  name: string;
  department: string | null;
  designation: string | null;
  email: string | null;
  mobile: string | null;
  telephone: string | null;
  userId: string | null;
  user?: { id: string; name: string; email: string } | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

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

  const columns: Column<Employee>[] = [
    {
      key: "code",
      header: "Employee Code",
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
      cell: (row: Employee) => row.department || "\u2014",
    },
    {
      key: "designation",
      header: "Designation",
      sortable: true,
      cell: (row: Employee) => row.designation || "\u2014",
    },
    {
      key: "email",
      header: "Email",
      cell: (row: Employee) => row.email || "\u2014",
    },
    {
      key: "mobile",
      header: "Mobile",
      cell: (row: Employee) => row.mobile || "\u2014",
    },
    {
      key: "user",
      header: "Linked User",
      cell: (row: Employee) =>
        row.user ? (
          <Badge variant="outline">{row.user.name}</Badge>
        ) : (
          <span className="text-muted-foreground">\u2014</span>
        ),
    },
    {
      key: "isActive",
      header: "Status",
      cell: (row: Employee) => (
        <Badge variant={row.isActive ? "default" : "secondary"}>
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: Employee) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/masters/employees/${row.id}/edit`)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
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
    </div>
  );
}
