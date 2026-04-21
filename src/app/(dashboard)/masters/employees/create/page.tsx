"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, Save, User, Shield, Eye, EyeOff, ChevronDown } from "lucide-react";
import { toast } from "sonner";

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

const emptyForm: EmployeeFormData = {
  name: "",
  designation: "",
  email: "",
  password: "",
  mobile: "",
  department: "",
  role: "",
  moduleAccess: [],
};

export default function CreateEmployeePage() {
  const router = useRouter();
  const [formData, setFormData] = useState<EmployeeFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetch("/api/masters/departments")
      .then((r) => r.json())
      .then((d) => setDepartments(d.departments || []))
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
    if (!formData.password.trim()) { toast.error("Password is required"); return; }
    if (formData.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (!formData.mobile.trim()) { toast.error("Mobile is required"); return; }
    if (!formData.role) { toast.error("Role is required"); return; }

    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        designation: formData.designation,
        email: formData.email,
        password: formData.password,
        mobile: formData.mobile,
        department: formData.department || null,
        role: formData.role,
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
      router.refresh();
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
      <PageHeader title="Add Employee" description="Create a new employee with login credentials">
        <Button variant="outline" className="mr-auto" onClick={() => router.push("/masters/employees")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button type="submit" form="employee-form" disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Employee"}
        </Button>
      </PageHeader>

      <form id="employee-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information — single row */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="w-4 h-4 text-primary" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-medium">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Employee name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="designation" className="text-sm font-medium">
                  Designation <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="designation"
                  value={formData.designation}
                  onChange={(e) => update("designation", e.target.value)}
                  placeholder="e.g. Manager"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="employee@company.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => update("password", e.target.value)}
                    placeholder="Min 6 characters"
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
                <Label htmlFor="mobile" className="text-sm font-medium">
                  Mobile <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="mobile"
                  value={formData.mobile}
                  onChange={(e) => update("mobile", e.target.value)}
                  placeholder="+91 9876543210"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="department" className="text-sm font-medium">Department</Label>
                <Select
                  value={formData.department || "__none__"}
                  onValueChange={(v) => update("department", v === "__none__" ? "" : v)}
                >
                  <SelectTrigger id="department">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- None --</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Role & Access — Role select + Module Access multi-select dropdown */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="w-4 h-4 text-primary" />
              Role & Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="role" className="text-sm font-medium">
                  Role <span className="text-destructive">*</span>
                </Label>
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
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Module Access</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" className="w-full justify-between font-normal">
                      <span className="truncate">
                        {formData.moduleAccess.length === 0
                          ? "Select modules"
                          : formData.moduleAccess.length === MODULE_GROUPS.length
                            ? "All modules"
                            : `${formData.moduleAccess.length} module${formData.moduleAccess.length === 1 ? "" : "s"} selected`}
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]" align="start">
                    <DropdownMenuLabel className="flex items-center justify-between py-1.5">
                      <span>Modules</span>
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline"
                        onClick={(e) => { e.preventDefault(); toggleAll(); }}
                      >
                        {allSelected ? "Deselect All" : "Select All"}
                      </button>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {MODULE_GROUPS.map((mod) => (
                      <DropdownMenuCheckboxItem
                        key={mod.key}
                        checked={formData.moduleAccess.includes(mod.key)}
                        onCheckedChange={() => toggleModule(mod.key)}
                        onSelect={(e) => e.preventDefault()}
                      >
                        <div className="flex flex-col">
                          <span className="text-sm">{mod.group}</span>
                          <span className="text-xs text-muted-foreground">{mod.description}</span>
                        </div>
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
