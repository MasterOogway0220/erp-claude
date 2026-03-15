"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { ArrowLeft, Save, User, LayoutGrid, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { PageLoading } from "@/components/shared/page-loading";

interface Employee {
  id: string;
  code: string;
  name: string;
  department: string | null;
  designation: string | null;
  email: string | null;
  mobile: string | null;
  moduleAccess: string[];
  role: string | null;
  isActive: boolean;
}

interface EmployeeFormData {
  name: string;
  designation: string;
  email: string;
  password: string;
  mobile: string;
  department: string;
  role: string;
  moduleAccess: string[];
}

const DEPARTMENTS = ["Purchase", "Sales", "Quality", "Warehouse", "Accounts"];
const USER_ROLES = ["SUPER_ADMIN", "ADMIN", "SALES", "PURCHASE", "QC", "STORES", "ACCOUNTS", "MANAGEMENT"];

const MODULE_GROUPS = [
  { group: "Masters", key: "masters", description: "Employees, vendors, customers" },
  { group: "Quotation", key: "quotation", description: "Create and manage quotations" },
  { group: "Sales", key: "sales", description: "Sales orders and customer management" },
  { group: "Purchase", key: "purchase", description: "Purchase requisitions and orders" },
  { group: "Inventory", key: "inventory", description: "Stock, GRN and inventory management" },
  { group: "Quality", key: "quality", description: "QC inspection, NCR and MTC" },
  { group: "Dispatch", key: "dispatch", description: "Packing list and dispatch notes" },
  { group: "Finance", key: "finance", description: "Invoices, payments and accounts" },
];

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>({
    name: "", designation: "", email: "", password: "", mobile: "",
    department: "", role: "", moduleAccess: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/masters/employees");
        if (!res.ok) throw new Error("Failed to fetch employees");
        const data = await res.json();
        const found = (data.employees || []).find((e: Employee) => e.id === id);

        if (!found) {
          toast.error("Employee not found");
          router.push("/masters/employees");
          return;
        }

        setEmployee(found);
        setFormData({
          name: found.name,
          designation: found.designation || "",
          email: found.email || "",
          password: "",
          mobile: found.mobile || "",
          department: found.department || "",
          role: found.role || "",
          moduleAccess: Array.isArray(found.moduleAccess) ? found.moduleAccess : [],
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

  const toggleModule = (key: string) => {
    setFormData((prev) => ({
      ...prev,
      moduleAccess: prev.moduleAccess.includes(key)
        ? prev.moduleAccess.filter((m) => m !== key)
        : [...prev.moduleAccess, key],
    }));
  };

  const toggleAll = () => {
    setFormData((prev) => {
      const allKeys = MODULE_GROUPS.map((m) => m.key);
      const allSelected = allKeys.every((k) => prev.moduleAccess.includes(k));
      return { ...prev, moduleAccess: allSelected ? [] : allKeys };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error("Employee name is required"); return; }
    if (!formData.designation.trim()) { toast.error("Designation is required"); return; }
    if (!formData.email.trim()) { toast.error("Email is required"); return; }
    if (!formData.mobile.trim()) { toast.error("Mobile is required"); return; }
    if (!formData.role) { toast.error("Role is required"); return; }
    if (formData.password && formData.password.length < 6) {
      toast.error("Password must be at least 6 characters"); return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: formData.name,
        designation: formData.designation,
        email: formData.email,
        mobile: formData.mobile,
        department: formData.department || null,
        role: formData.role,
        moduleAccess: formData.moduleAccess,
      };
      if (formData.password) {
        payload.password = formData.password;
      }

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

  if (loading) return <PageLoading />;

  const allSelected = MODULE_GROUPS.every((m) => formData.moduleAccess.includes(m.key));

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
        {/* Employee Code (read-only) */}
        {employee && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-4">
                <Label className="text-muted-foreground w-28 shrink-0">Employee Code</Label>
                <span className="font-mono text-sm font-medium">{employee.code}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Employee Details - Single Row */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="w-4 h-4" />
              Employee Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Employee name"
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
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => update("password", e.target.value)}
                    placeholder="Leave blank to keep"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
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
              <div className="space-y-1.5">
                <Label htmlFor="designation">Designation *</Label>
                <Input
                  id="designation"
                  value={formData.designation}
                  onChange={(e) => update("designation", e.target.value)}
                  placeholder="e.g. Manager"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="department">Department</Label>
                <Select
                  value={formData.department || "__none__"}
                  onValueChange={(v) => update("department", v === "__none__" ? "" : v)}
                >
                  <SelectTrigger id="department">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- None --</SelectItem>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Module Access & Role */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LayoutGrid className="w-4 h-4" />
              Module Access & Role
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 pb-4 border-b">
              <div className="space-y-1.5">
                <Label htmlFor="role">Role *</Label>
                <Select value={formData.role || "__none__"} onValueChange={(v) => update("role", v === "__none__" ? "" : v)}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- Select Role --</SelectItem>
                    {USER_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4 pb-3 border-b">
              <Checkbox
                id="select-all"
                checked={allSelected}
                onCheckedChange={() => toggleAll()}
              />
              <Label htmlFor="select-all" className="font-medium cursor-pointer">
                {allSelected ? "Deselect All" : "Select All Modules"}
              </Label>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
              {MODULE_GROUPS.map((mod) => {
                const checked = formData.moduleAccess.includes(mod.key);
                return (
                  <label
                    key={mod.key}
                    htmlFor={`mod-${mod.key}`}
                    className={`flex flex-col gap-1.5 rounded-lg border p-3 cursor-pointer transition-colors select-none ${
                      checked
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{mod.group}</span>
                      <Checkbox
                        id={`mod-${mod.key}`}
                        checked={checked}
                        onCheckedChange={() => toggleModule(mod.key)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground leading-tight">{mod.description}</p>
                  </label>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
