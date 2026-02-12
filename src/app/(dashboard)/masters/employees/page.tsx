"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface User {
  id: string;
  name: string;
  email: string;
}

interface EmployeeFormData {
  name: string;
  department: string;
  designation: string;
  email: string;
  mobile: string;
  telephone: string;
  userId: string;
  isActive: boolean;
}

const DEPARTMENTS = ["Purchase", "Sales", "Quality", "Warehouse", "Accounts"];

const emptyForm: EmployeeFormData = {
  name: "",
  department: "",
  designation: "",
  email: "",
  mobile: "",
  telephone: "",
  userId: "",
  isActive: true,
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

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

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      // Users fetch is optional, don't show error
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
    fetchUsers();
  }, [fetchEmployees, fetchUsers]);

  const handleOpenCreate = () => {
    setEditingEmployee(null);
    setFormData(emptyForm);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      department: employee.department || "",
      designation: employee.designation || "",
      email: employee.email || "",
      mobile: employee.mobile || "",
      telephone: employee.telephone || "",
      userId: employee.userId || "",
      isActive: employee.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingEmployee(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...formData,
        userId: formData.userId || null,
        department: formData.department || null,
      };

      if (editingEmployee) {
        const res = await fetch(`/api/masters/employees/${editingEmployee.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to update employee");
        }
        toast.success("Employee updated successfully");
      } else {
        const res = await fetch("/api/masters/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to create employee");
        }
        toast.success("Employee created successfully");
      }

      handleCloseDialog();
      fetchEmployees();
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

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
          onClick={() => handleOpenEdit(row)}
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
        <Button onClick={handleOpenCreate}>
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

      {/* Create / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingEmployee ? "Edit" : "Add"} Employee
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Employee Code (read-only on edit) */}
              {editingEmployee && (
                <div className="grid gap-2">
                  <Label htmlFor="code">Employee Code</Label>
                  <Input
                    id="code"
                    value={editingEmployee.code}
                    disabled
                    className="bg-muted"
                  />
                </div>
              )}

              {/* Name */}
              <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter employee name"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Department */}
                <div className="grid gap-2">
                  <Label htmlFor="department">Department</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) =>
                      setFormData({ ...formData, department: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Designation */}
                <div className="grid gap-2">
                  <Label htmlFor="designation">Designation *</Label>
                  <Input
                    id="designation"
                    value={formData.designation}
                    onChange={(e) =>
                      setFormData({ ...formData, designation: e.target.value })
                    }
                    placeholder="e.g., Manager, Executive"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Email */}
                <div className="grid gap-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="employee@company.com"
                    required
                  />
                </div>

                {/* Mobile */}
                <div className="grid gap-2">
                  <Label htmlFor="mobile">Mobile *</Label>
                  <Input
                    id="mobile"
                    value={formData.mobile}
                    onChange={(e) =>
                      setFormData({ ...formData, mobile: e.target.value })
                    }
                    placeholder="+91 9876543210"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Telephone */}
                <div className="grid gap-2">
                  <Label htmlFor="telephone">Telephone</Label>
                  <Input
                    id="telephone"
                    value={formData.telephone}
                    onChange={(e) =>
                      setFormData({ ...formData, telephone: e.target.value })
                    }
                    placeholder="022-12345678"
                  />
                </div>

                {/* Linked User Account */}
                <div className="grid gap-2">
                  <Label htmlFor="userId">Linked User Account</Label>
                  <Select
                    value={formData.userId}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        userId: value === "__none__" ? "" : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select user account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No linked user</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Status Toggle */}
              <div className="grid gap-2">
                <Label>Status</Label>
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="isActive"
                      checked={formData.isActive === true}
                      onChange={() =>
                        setFormData({ ...formData, isActive: true })
                      }
                    />
                    <span>Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="isActive"
                      checked={formData.isActive === false}
                      onChange={() =>
                        setFormData({ ...formData, isActive: false })
                      }
                    />
                    <span>Inactive</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? "Saving..."
                  : editingEmployee
                  ? "Update"
                  : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
