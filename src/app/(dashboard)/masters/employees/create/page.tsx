"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, User, Shield, LayoutGrid } from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
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
  moduleAccess: string[];
}

const DEPARTMENTS = ["Purchase", "Sales", "Quality", "Warehouse", "Accounts"];
const USER_ROLES = ["SUPER_ADMIN", "SALES", "PURCHASE", "QC", "STORES", "ACCOUNTS", "MANAGEMENT"];

const MODULE_GROUPS = [
  {
    group: "Quotation",
    key: "quotation",
    description: "Create and manage quotations",
  },
  {
    group: "Sales",
    key: "sales",
    description: "Sales orders and customer management",
  },
  {
    group: "Purchase",
    key: "purchase",
    description: "Purchase requisitions and orders",
  },
  {
    group: "Inventory",
    key: "inventory",
    description: "Stock, GRN and inventory management",
  },
  {
    group: "Quality",
    key: "quality",
    description: "QC inspection, NCR and MTC",
  },
  {
    group: "Dispatch",
    key: "dispatch",
    description: "Packing list and dispatch notes",
  },
  {
    group: "Finance",
    key: "finance",
    description: "Invoices, payments and accounts",
  },
];

const emptyForm: EmployeeFormData = {
  name: "",
  designation: "",
  email: "",
  mobile: "",
  telephone: "",
  department: "",
  userId: "",
  userRole: "",
  moduleAccess: [],
};

export default function CreateEmployeePage() {
  const router = useRouter();
  const [formData, setFormData] = useState<EmployeeFormData>(emptyForm);
  const [users, setUsers] = useState<User[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .catch(() => {});
  }, []);

  const update = (field: keyof EmployeeFormData, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const toggleModule = (key: string) => {
    setFormData((prev) => ({
      ...prev,
      moduleAccess: prev.moduleAccess.includes(key)
        ? prev.moduleAccess.filter((m) => m !== key)
        : [...prev.moduleAccess, key],
    }));
  };

  const toggleAll = () => {
    const allKeys = MODULE_GROUPS.map((m) => m.key);
    const allSelected = allKeys.every((k) => formData.moduleAccess.includes(k));
    setFormData((prev) => ({
      ...prev,
      moduleAccess: allSelected ? [] : allKeys,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error("Employee name is required"); return; }
    if (!formData.designation.trim()) { toast.error("Designation is required"); return; }
    if (!formData.email.trim()) { toast.error("Email is required"); return; }
    if (!formData.mobile.trim()) { toast.error("Mobile is required"); return; }

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
        moduleAccess: formData.moduleAccess,
      };

      const res = await fetch("/api/masters/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to create employee");
        return;
      }

      toast.success("Employee created successfully");
      router.push("/masters/employees");
    } catch {
      toast.error("Failed to create employee");
    } finally {
      setSaving(false);
    }
  };

  const allSelected = MODULE_GROUPS.every((m) => formData.moduleAccess.includes(m.key));

  return (
    <div className="space-y-6">
      <PageHeader title="Add Employee" description="Create a new employee record">
        <Button variant="outline" onClick={() => router.push("/masters/employees")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button type="submit" form="employee-form" disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Employee"}
        </Button>
      </PageHeader>

      <form id="employee-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Employee Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="w-4 h-4" />
              Employee Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Row 1: Name, Email, Mobile */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Enter employee name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="employee@company.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mobile">Mobile *</Label>
                <Input
                  id="mobile"
                  value={formData.mobile}
                  onChange={(e) => update("mobile", e.target.value)}
                  placeholder="+91 9876543210"
                />
              </div>
            </div>

            {/* Row 2: Designation, Department, Telephone */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="designation">Designation *</Label>
                <Input
                  id="designation"
                  value={formData.designation}
                  onChange={(e) => update("designation", e.target.value)}
                  placeholder="e.g. Manager, Executive"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="department">Department</Label>
                <Select
                  value={formData.department || "__none__"}
                  onValueChange={(v) => update("department", v === "__none__" ? "" : v)}
                >
                  <SelectTrigger id="department">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- None --</SelectItem>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="telephone">Telephone</Label>
                <Input
                  id="telephone"
                  value={formData.telephone}
                  onChange={(e) => update("telephone", e.target.value)}
                  placeholder="022-12345678"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Module Access */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LayoutGrid className="w-4 h-4" />
              Module Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b">
              <Checkbox
                id="select-all"
                checked={allSelected}
                onCheckedChange={toggleAll}
              />
              <Label htmlFor="select-all" className="font-medium cursor-pointer">
                {allSelected ? "Deselect All" : "Select All Modules"}
              </Label>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {MODULE_GROUPS.map((mod) => {
                const checked = formData.moduleAccess.includes(mod.key);
                return (
                  <div
                    key={mod.key}
                    onClick={() => toggleModule(mod.key)}
                    className={`flex flex-col gap-1.5 rounded-lg border p-3 cursor-pointer transition-colors select-none ${
                      checked
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{mod.group}</span>
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleModule(mod.key)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground leading-tight">{mod.description}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* System Access */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="w-4 h-4" />
              System Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="userId">User Account</Label>
                <Select
                  value={formData.userId || "__none__"}
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
                <div className="space-y-1.5">
                  <Label htmlFor="userRole">User Role</Label>
                  <Select value={formData.userRole} onValueChange={(v) => update("userRole", v)}>
                    <SelectTrigger id="userRole">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {USER_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
