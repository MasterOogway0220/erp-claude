"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  MapPin,
  CreditCard,
  Plus,
  Eye,
  EyeOff,
  Shield,
  LogIn,
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

export default function SuperAdminCompanyPicker() {
  const router = useRouter();
  const { user, isLoading } = useCurrentUser();
  const isSuperAdmin = (user?.role as string) === "SUPER_ADMIN";

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);

  // Add Company dialog
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

  // Add Admin dialog
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [adminForm, setAdminForm] = useState({ name: "", email: "", password: "", companyId: "" });
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [savingAdmin, setSavingAdmin] = useState(false);

  useEffect(() => {
    if (!isLoading && !isSuperAdmin) {
      router.push("/");
    }
  }, [isLoading, isSuperAdmin, router]);

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await fetch("/api/masters/company");
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies || []);
      }
    } catch {
      toast.error("Failed to fetch companies");
    } finally {
      setLoadingCompanies(false);
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin) fetchCompanies();
  }, [isSuperAdmin, fetchCompanies]);

  const handleSelectCompany = async (company: Company) => {
    setSwitching(company.id);
    try {
      const res = await fetch("/api/company/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: company.id }),
      });
      if (!res.ok) throw new Error("Failed to switch company");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Failed to select company");
      setSwitching(null);
    }
  };

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
      toast.success("Company created");
      setCompanyDialogOpen(false);
      setCompanyForm({ companyName: "", companyType: "Trading", regCity: "", regState: "", gstNo: "", email: "", telephoneNo: "" });
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
      toast.error("Please select a company");
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
        body: JSON.stringify({ name: adminForm.name, email: adminForm.email, password: adminForm.password, role: "ADMIN" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create admin");
      }
      toast.success("Admin created");
      setAdminDialogOpen(false);
      setAdminForm({ name: "", email: "", password: "", companyId: "" });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSavingAdmin(false);
    }
  };

  if (isLoading || !isSuperAdmin) return null;

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Header */}
      <div className="bg-background border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/n-pipe-logo.jpg.jpeg" alt="Logo" className="h-8" />
          <div>
            <p className="text-xs text-muted-foreground">Super Admin</p>
            <p className="text-sm font-medium">{user?.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setAdminDialogOpen(true)}>
            <Shield className="h-4 w-4 mr-2" />
            Create Admin
          </Button>
          <Button size="sm" onClick={() => setCompanyDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Company
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-6 py-8 max-w-6xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Select a Company</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Choose a company to access its data and manage its operations.
          </p>
        </div>

        {loadingCompanies ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="h-40" />
              </Card>
            ))}
          </div>
        ) : companies.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <Building2 className="h-12 w-12 opacity-30" />
              <p className="font-medium">No companies yet</p>
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
                className="cursor-pointer hover:border-primary hover:shadow-md transition-all group"
                onClick={() => !switching && handleSelectCompany(company)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{company.companyName}</CardTitle>
                      {company.companyType && (
                        <p className="text-xs text-muted-foreground mt-0.5">{company.companyType}</p>
                      )}
                    </div>
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      {switching === company.id ? (
                        <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <LogIn className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
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
                  <div className="flex items-center justify-between pt-2 border-t mt-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {company._count.users} users · {company._count.employees} employees
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(company.createdAt), "MMM yyyy")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Company Dialog */}
      <Dialog open={companyDialogOpen} onOpenChange={setCompanyDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Company</DialogTitle>
            <DialogDescription>Register a new company in the system.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Company Name *</Label>
                <Input value={companyForm.companyName} onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })} placeholder="e.g., NPS Piping Solutions" />
              </div>
              <div className="space-y-1">
                <Label>Company Type</Label>
                <Input value={companyForm.companyType} onChange={(e) => setCompanyForm({ ...companyForm, companyType: e.target.value })} placeholder="Trading, Manufacturing..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>City</Label>
                <Input value={companyForm.regCity} onChange={(e) => setCompanyForm({ ...companyForm, regCity: e.target.value })} placeholder="City" />
              </div>
              <div className="space-y-1">
                <Label>State</Label>
                <Input value={companyForm.regState} onChange={(e) => setCompanyForm({ ...companyForm, regState: e.target.value })} placeholder="State" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>GST No.</Label>
              <Input value={companyForm.gstNo} onChange={(e) => setCompanyForm({ ...companyForm, gstNo: e.target.value.toUpperCase() })} placeholder="22AAAAA0000A1Z5" className="font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={companyForm.email} onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })} placeholder="info@company.com" />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input value={companyForm.telephoneNo} onChange={(e) => setCompanyForm({ ...companyForm, telephoneNo: e.target.value })} placeholder="+91 XXXXX XXXXX" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompanyDialogOpen(false)} disabled={savingCompany}>Cancel</Button>
            <Button onClick={handleCreateCompany} disabled={savingCompany}>{savingCompany ? "Creating..." : "Create Company"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Admin Dialog */}
      <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-500" />
              Create Company Admin
            </DialogTitle>
            <DialogDescription>Create an admin user for a company.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Company *</Label>
              <Select value={adminForm.companyId || "NONE"} onValueChange={(v) => setAdminForm({ ...adminForm, companyId: v === "NONE" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE" disabled>Select company</SelectItem>
                  {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Full Name *</Label>
              <Input value={adminForm.name} onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })} placeholder="Admin full name" />
            </div>
            <div className="space-y-1">
              <Label>Email *</Label>
              <Input type="email" value={adminForm.email} onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })} placeholder="admin@company.com" />
            </div>
            <div className="space-y-1">
              <Label>Password *</Label>
              <div className="relative">
                <Input type={showAdminPassword ? "text" : "password"} value={adminForm.password} onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })} placeholder="Minimum 6 characters" className="pr-10" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowAdminPassword(!showAdminPassword)} tabIndex={-1}>
                  {showAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdminDialogOpen(false)} disabled={savingAdmin}>Cancel</Button>
            <Button onClick={handleCreateAdmin} disabled={savingAdmin}>{savingAdmin ? "Creating..." : "Create Admin"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
