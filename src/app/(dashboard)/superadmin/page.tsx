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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Database,
  Activity,
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

  // Redirect non-super-admins
  useEffect(() => {
    if (!isLoading && user?.role !== "SUPER_ADMIN") {
      router.push("/");
    }
  }, [user, isLoading, router]);

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
    if (user?.role === "SUPER_ADMIN") {
      fetchCompanies();
      fetchAllUsers();
    }
  }, [user, fetchCompanies, fetchAllUsers]);

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
      // Switch to the target company first
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

  if (isLoading || user?.role !== "SUPER_ADMIN") return null;

  const totalUsers = allUsers.length;
  const activeUsers = allUsers.filter((u) => u.isActive).length;
  const adminCount = allUsers.filter((u) => u.role === "ADMIN").length;

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
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Companies</CardTitle>
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
            <CardTitle className="text-sm font-medium">Company Admins</CardTitle>
            <Shield className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminCount}</div>
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

      <Tabs defaultValue="companies" className="space-y-4">
        <TabsList>
          <TabsTrigger value="companies">
            <Building2 className="h-4 w-4 mr-1.5" />
            Companies
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-1.5" />
            All Users
          </TabsTrigger>
        </TabsList>

        {/* Companies Tab */}
        <TabsContent value="companies">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Registered Companies</CardTitle>
                <Button size="sm" onClick={() => setCompanyDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Company
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>GST No.</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Employees</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No companies registered yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      companies.map((company) => (
                        <TableRow key={company.id}>
                          <TableCell className="font-medium">{company.companyName}</TableCell>
                          <TableCell>{company.companyType || "—"}</TableCell>
                          <TableCell>{company.regCity || "—"}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {company.gstNo || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{company._count.users}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{company._count.employees}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(company.createdAt), "dd MMM yyyy")}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => router.push(`/masters/company/${company.id}/edit`)}
                              title="View/Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All System Users</CardTitle>
                <Button size="sm" onClick={() => setAdminDialogOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create Company Admin
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
                      <TableHead>Company</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingData ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Loading users...
                        </TableCell>
                      </TableRow>
                    ) : allUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      allUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.name}</TableCell>
                          <TableCell className="text-sm">{u.email}</TableCell>
                          <TableCell>
                            <Badge className={roleColors[u.role] || "bg-gray-500"}>
                              {u.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {u.company?.companyName || "—"}
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
        </TabsContent>
      </Tabs>

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

      {/* Create Admin User Dialog */}
      <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
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
              <Select
                value={adminForm.companyId || undefined}
                onValueChange={(v) => setAdminForm({ ...adminForm, companyId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Button variant="outline" onClick={() => setAdminDialogOpen(false)} disabled={savingAdmin}>
              Cancel
            </Button>
            <Button onClick={handleCreateAdmin} disabled={savingAdmin}>
              {savingAdmin ? "Creating..." : "Create Admin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
