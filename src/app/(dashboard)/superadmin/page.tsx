"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Users,
  Shield,
  Plus,
  Pencil,
  Eye,
  EyeOff,
  UserPlus,
  Activity,
  ArrowLeft,
  MapPin,
  Mail,
  Phone,
  CreditCard,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Company {
  id: string;
  companyName: string;
  companyType: string | null;
  regCity: string | null;
  regState: string | null;
  gstNo: string | null;
  email: string | null;
  telephoneNo: string | null;
  createdAt: string;
  _count: { users: number; employees: number };
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLogin: string | null;
  companyId: string | null;
  company: { id: string; companyName: string } | null;
  createdAt: string;
}

const roleColors: Record<string, string> = {
  SUPER_ADMIN: "bg-red-600",
  ADMIN: "bg-red-500",
  SALES: "bg-blue-500",
  PURCHASE: "bg-green-500",
  QC: "bg-yellow-500",
  STORES: "bg-purple-500",
  ACCOUNTS: "bg-orange-500",
  MANAGEMENT: "bg-indigo-500",
};

export default function SuperAdminDashboard() {
  const router = useRouter();
  const { user, isLoading } = useCurrentUser();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // Company form
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    companyName: "",
    companyType: "Trading",
    regCity: "",
    regState: "",
    gstNo: "",
    email: "",
    telephoneNo: "",
  });
  const [savingCompany, setSavingCompany] = useState(false);

  // Admin user creation form
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [adminForm, setAdminForm] = useState({
    name: "",
    email: "",
    password: "",
    companyId: "",
  });
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [savingAdmin, setSavingAdmin] = useState(false);

  const isSuperAdmin = (user?.role as string) === "SUPER_ADMIN";

  // Redirect non-super-admins
  useEffect(() => {
    if (!isLoading && !isSuperAdmin) {
      router.push("/");
    }
  }, [user, isLoading, isSuperAdmin, router]);

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await fetch("/api/masters/company");
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies || []);
      }
    } catch {
      toast.error("Failed to fetch companies");
    }
  }, []);

  const fetchAllUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data.users || []);
      }
    } catch {
      toast.error("Failed to fetch users");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchCompanies();
      fetchAllUsers();
    }
  }, [isSuperAdmin, fetchCompanies, fetchAllUsers]);

  // Keep selectedCompany in sync if companies list refreshes
  useEffect(() => {
    if (selectedCompany) {
      const updated = companies.find((c) => c.id === selectedCompany.id);
      if (updated) setSelectedCompany(updated);
    }
  }, [companies]);

  const handleCreateCompany = async () => {
    if (!companyForm.companyName.trim()) {
      toast.error("Company name is required");
      return;
    }
    setSavingCompany(true);
    try {
      const res = await fetch("/api/masters/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(companyForm),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create company");
      }
      toast.success("Company created successfully");
      setCompanyDialogOpen(false);
      setCompanyForm({
        companyName: "",
        companyType: "Trading",
        regCity: "",
        regState: "",
        gstNo: "",
        email: "",
        telephoneNo: "",
      });
      fetchCompanies();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSavingCompany(false);
    }
  };

  const handleCreateAdmin = async () => {
    if (!adminForm.name || !adminForm.email || !adminForm.password) {
      toast.error("Name, email, and password are required");
      return;
    }
    if (adminForm.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (!adminForm.companyId) {
      toast.error("Please select a company for the admin");
      return;
    }
    setSavingAdmin(true);
    try {
      await fetch("/api/company/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: adminForm.companyId }),
      });

      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: adminForm.name,
          email: adminForm.email,
          password: adminForm.password,
          role: "ADMIN",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create admin user");
      }
      toast.success("Admin user created successfully");
      setAdminDialogOpen(false);
      setAdminForm({ name: "", email: "", password: "", companyId: "" });
      setShowAdminPassword(false);
      fetchAllUsers();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSavingAdmin(false);
    }
  };

  const openAdminDialogForCompany = (company: Company) => {
    setAdminForm({ name: "", email: "", password: "", companyId: company.id });
    setAdminDialogOpen(true);
  };

  if (isLoading || !isSuperAdmin) return null;

  const totalUsers = allUsers.length;
  const activeUsers = allUsers.filter((u) => u.isActive).length;

  // ─── Company Detail View ───────────────────────────────────────────────────
  if (selectedCompany) {
    const companyUsers = allUsers.filter((u) => u.companyId === selectedCompany.id);
    const activeCompanyUsers = companyUsers.filter((u) => u.isActive).length;

    return (
      <div className="space-y-6">
        <PageHeader
          title={selectedCompany.companyName}
          description={[selectedCompany.companyType, selectedCompany.regCity, selectedCompany.regState].filter(Boolean).join(" · ")}
        >
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setSelectedCompany(null)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              All Companies
            </Button>
            <Button variant="outline" onClick={() => openAdminDialogForCompany(selectedCompany)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Admin
            </Button>
            <Button onClick={() => router.push(`/masters/company`)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Details
            </Button>
          </div>
        </PageHeader>

        {/* Company Info Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedCompany._count.users}</div>
              <p className="text-xs text-muted-foreground">{activeCompanyUsers} active</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedCompany._count.employees}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Registered</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-semibold">{format(new Date(selectedCompany.createdAt), "dd MMM yyyy")}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">GST No.</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-mono font-semibold">{selectedCompany.gstNo || "—"}</div>
            </CardContent>
          </Card>
        </div>

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Company Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Location
                </p>
                <p className="font-medium">
                  {[selectedCompany.regCity, selectedCompany.regState].filter(Boolean).join(", ") || "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" /> Email
                </p>
                <p className="font-medium">{selectedCompany.email || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Phone
                </p>
                <p className="font-medium">{selectedCompany.telephoneNo || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Company Type</p>
                <p className="font-medium">{selectedCompany.companyType || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Users ({companyUsers.length})</CardTitle>
              <Button size="sm" onClick={() => openAdminDialogForCompany(selectedCompany)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Admin
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingData ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Loading users...
                      </TableCell>
                    </TableRow>
                  ) : companyUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No users for this company yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    companyUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell className="text-sm">{u.email}</TableCell>
                        <TableCell>
                          <Badge className={roleColors[u.role] || "bg-gray-500"}>
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.isActive ? "default" : "destructive"}>
                            {u.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {u.lastLogin
                            ? format(new Date(u.lastLogin), "dd MMM yyyy HH:mm")
                            : "Never"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Admin Dialog */}
        {adminDialogOpen && (
          <AdminDialog
            open={adminDialogOpen}
            onOpenChange={setAdminDialogOpen}
            adminForm={adminForm}
            setAdminForm={setAdminForm}
            showAdminPassword={showAdminPassword}
            setShowAdminPassword={setShowAdminPassword}
            savingAdmin={savingAdmin}
            onSubmit={handleCreateAdmin}
            companies={companies}
            lockCompany
          />
        )}
      </div>
    );
  }

  // ─── Company Cards Landing ─────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="Super Admin Dashboard"
        description="Master control panel — manage companies, admins, and system-wide settings"
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAdminDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Create Company Admin
          </Button>
          <Button onClick={() => setCompanyDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Company
          </Button>
        </div>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companies.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">{activeUsers} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Online</div>
          </CardContent>
        </Card>
      </div>

      {/* Company Cards */}
      <div>
        <h2 className="text-base font-semibold mb-3">Companies</h2>
        {companies.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Building2 className="h-10 w-10 opacity-30" />
              <p>No companies registered yet.</p>
              <Button onClick={() => setCompanyDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Company
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {companies.map((company) => (
              <Card
                key={company.id}
                className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
                onClick={() => setSelectedCompany(company)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{company.companyName}</CardTitle>
                      {company.companyType && (
                        <p className="text-xs text-muted-foreground mt-0.5">{company.companyType}</p>
                      )}
                    </div>
                    <Building2 className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(company.regCity || company.regState) && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {[company.regCity, company.regState].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  )}
                  {company.gstNo && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                      <CreditCard className="h-3.5 w-3.5 shrink-0" />
                      <span>{company.gstNo}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1 border-t">
                    <div className="flex gap-3">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        {company._count.users} users
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Shield className="h-3.5 w-3.5" />
                        {company._count.employees} employees
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(company.createdAt), "dd MMM yyyy")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Company Dialog */}
      <Dialog open={companyDialogOpen} onOpenChange={setCompanyDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Company</DialogTitle>
            <DialogDescription>
              Register a new company in the system. An admin user can be assigned after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Company Name *</Label>
                <Input
                  value={companyForm.companyName}
                  onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })}
                  placeholder="e.g., NPS Piping Solutions"
                />
              </div>
              <div className="space-y-1">
                <Label>Company Type</Label>
                <Input
                  value={companyForm.companyType}
                  onChange={(e) => setCompanyForm({ ...companyForm, companyType: e.target.value })}
                  placeholder="e.g., Trading, Manufacturing"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>City</Label>
                <Input
                  value={companyForm.regCity}
                  onChange={(e) => setCompanyForm({ ...companyForm, regCity: e.target.value })}
                  placeholder="City"
                />
              </div>
              <div className="space-y-1">
                <Label>State</Label>
                <Input
                  value={companyForm.regState}
                  onChange={(e) => setCompanyForm({ ...companyForm, regState: e.target.value })}
                  placeholder="State"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>GST No.</Label>
              <Input
                value={companyForm.gstNo}
                onChange={(e) => setCompanyForm({ ...companyForm, gstNo: e.target.value.toUpperCase() })}
                placeholder="22AAAAA0000A1Z5"
                className="font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={companyForm.email}
                  onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                  placeholder="info@company.com"
                />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input
                  value={companyForm.telephoneNo}
                  onChange={(e) => setCompanyForm({ ...companyForm, telephoneNo: e.target.value })}
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompanyDialogOpen(false)} disabled={savingCompany}>
              Cancel
            </Button>
            <Button onClick={handleCreateCompany} disabled={savingCompany}>
              {savingCompany ? "Creating..." : "Create Company"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Admin Dialog (landing level) */}
      {adminDialogOpen && (
        <AdminDialog
          open={adminDialogOpen}
          onOpenChange={setAdminDialogOpen}
          adminForm={adminForm}
          setAdminForm={setAdminForm}
          showAdminPassword={showAdminPassword}
          setShowAdminPassword={setShowAdminPassword}
          savingAdmin={savingAdmin}
          onSubmit={handleCreateAdmin}
          companies={companies}
          lockCompany={false}
        />
      )}
    </div>
  );
}

// ─── Shared Admin Dialog ───────────────────────────────────────────────────
function AdminDialog({
  open,
  onOpenChange,
  adminForm,
  setAdminForm,
  showAdminPassword,
  setShowAdminPassword,
  savingAdmin,
  onSubmit,
  companies,
  lockCompany,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  adminForm: { name: string; email: string; password: string; companyId: string };
  setAdminForm: (f: any) => void;
  showAdminPassword: boolean;
  setShowAdminPassword: (v: boolean) => void;
  savingAdmin: boolean;
  onSubmit: () => void;
  companies: Company[];
  lockCompany: boolean;
}) {
  const selectedName = companies.find((c) => c.id === adminForm.companyId)?.companyName;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-500" />
            Create Company Admin
          </DialogTitle>
          <DialogDescription>
            Create an admin user who will manage employees and data for their assigned company.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Company *</Label>
            {lockCompany ? (
              <div className="h-9 px-3 flex items-center rounded-md border bg-muted text-sm font-medium">
                {selectedName}
              </div>
            ) : (
              <Select
                value={adminForm.companyId || "NONE"}
                onValueChange={(v) => setAdminForm({ ...adminForm, companyId: v === "NONE" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE" disabled>Select company</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-1">
            <Label>Full Name *</Label>
            <Input
              value={adminForm.name}
              onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
              placeholder="Admin full name"
            />
          </div>
          <div className="space-y-1">
            <Label>Email *</Label>
            <Input
              type="email"
              value={adminForm.email}
              onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
              placeholder="admin@company.com"
            />
          </div>
          <div className="space-y-1">
            <Label>Password *</Label>
            <div className="relative">
              <Input
                type={showAdminPassword ? "text" : "password"}
                value={adminForm.password}
                onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                placeholder="Minimum 6 characters"
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowAdminPassword(!showAdminPassword)}
                tabIndex={-1}
              >
                {showAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={savingAdmin}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={savingAdmin}>
            {savingAdmin ? "Creating..." : "Create Admin"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
