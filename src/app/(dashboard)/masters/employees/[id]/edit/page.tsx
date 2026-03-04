"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { PageLoading } from "@/components/shared/page-loading";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

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
  isActive: boolean;
}

interface EmployeeFormData {
  name: string;
  designation: string;
  email: string;
  mobile: string;
  telephone: string;
  department: string;
  userId: string;
  userRole: string;
}

const DEPARTMENTS = ["Purchase", "Sales", "Quality", "Warehouse", "Accounts"];
const USER_ROLES = ["SUPER_ADMIN", "SALES", "PURCHASE", "QC", "STORES", "ACCOUNTS", "MANAGEMENT"];

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState<EmployeeFormData>({
    name: "",
    designation: "",
    email: "",
    mobile: "",
    telephone: "",
    department: "",
    userId: "",
    userRole: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empRes, usersRes] = await Promise.all([
          fetch("/api/masters/employees"),
          fetch("/api/admin/users"),
        ]);

        let fetchedUsers: User[] = [];
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          fetchedUsers = usersData.users || [];
          setUsers(fetchedUsers);
        }

        if (!empRes.ok) throw new Error("Failed to fetch employees");
        const empData = await empRes.json();
        const found = (empData.employees || []).find((e: Employee) => e.id === id);

        if (!found) {
          toast.error("Employee not found");
          router.push("/masters/employees");
          return;
        }

        setEmployee(found);

        const linkedUser = fetchedUsers.find((u) => u.id === found.userId);
        setFormData({
          name: found.name,
          designation: found.designation || "",
          email: found.email || "",
          mobile: found.mobile || "",
          telephone: found.telephone || "",
          department: found.department || "",
          userId: found.userId || "",
          userRole: linkedUser?.role || "",
        });
      } catch {
        toast.error("Failed to load employee data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const update = (field: keyof EmployeeFormData, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Employee name is required");
      return;
    }
    if (!formData.designation.trim()) {
      toast.error("Designation is required");
      return;
    }
    if (!formData.email.trim()) {
      toast.error("Email is required");
      return;
    }
    if (!formData.mobile.trim()) {
      toast.error("Mobile is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        designation: formData.designation,
        email: formData.email,
        mobile: formData.mobile,
        telephone: formData.telephone || null,
        department: formData.department || null,
        linkedUserId: formData.userId || null,
        userRole: formData.userId && formData.userRole ? formData.userRole : undefined,
      };

      const res = await fetch(`/api/masters/employees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to update employee");
        return;
      }

      toast.success("Employee updated successfully");
      router.push("/masters/employees");
    } catch {
      toast.error("Failed to update employee");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Employee"
        description={employee ? `Editing: ${employee.name}` : "Update employee record"}
      >
        <Button variant="outline" onClick={() => router.push("/masters/employees")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button type="submit" form="employee-form" disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </PageHeader>

      <form id="employee-form" onSubmit={handleSubmit} className="space-y-6">
        {employee && (
          <Card>
            <CardHeader>
              <CardTitle>Employee Code</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={employee.code}
                  disabled
                  className="bg-muted font-mono"
                />
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Employee Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Enter employee name"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="designation">Designation *</Label>
              <Input
                id="designation"
                value={formData.designation}
                onChange={(e) => update("designation", e.target.value)}
                placeholder="e.g. Manager, Executive"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="employee@company.com"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="mobile">Mobile *</Label>
                <Input
                  id="mobile"
                  value={formData.mobile}
                  onChange={(e) => update("mobile", e.target.value)}
                  placeholder="+91 9876543210"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="telephone">Telephone</Label>
                <Input
                  id="telephone"
                  value={formData.telephone}
                  onChange={(e) => update("telephone", e.target.value)}
                  placeholder="022-12345678"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="department">Department</Label>
              <Select
                value={formData.department}
                onValueChange={(v) => update("department", v === "__none__" ? "" : v)}
              >
                <SelectTrigger id="department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- None --</SelectItem>
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="userId">User Account</Label>
              <Select
                value={formData.userId}
                onValueChange={(v) => {
                  const selectedUser = users.find((u) => u.id === v);
                  setFormData((prev) => ({
                    ...prev,
                    userId: v === "__none__" ? "" : v,
                    userRole: v === "__none__" ? "" : (selectedUser?.role || ""),
                  }));
                }}
              >
                <SelectTrigger id="userId">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.userId && formData.userId !== "__none__" && (
              <div className="grid gap-2">
                <Label htmlFor="userRole">User Role</Label>
                <Select
                  value={formData.userRole}
                  onValueChange={(v) => update("userRole", v)}
                >
                  <SelectTrigger id="userRole">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
