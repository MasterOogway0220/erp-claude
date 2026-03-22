"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { PageLoading } from "@/components/shared/page-loading";

interface Customer {
  id: string;
  name: string;
}

interface CustomerContact {
  id: string;
  customerId: string;
  contactName: string;
  designation: string | null;
  email: string | null;
  phone: string | null;
  department: string;
  isActive: boolean;
  customer: { id: string; name: string };
}

const DEPARTMENT_LABELS: Record<string, string> = {
  FOLLOW_UP: "Follow-up",
  QUALITY_INSPECTION: "Quality / Inspection",
  ACCOUNTS: "Accounts",
  OTHER: "Other",
};

const DEPARTMENT_COLORS: Record<string, string> = {
  FOLLOW_UP: "default",
  QUALITY_INSPECTION: "secondary",
  ACCOUNTS: "outline",
  OTHER: "secondary",
};

export default function CustomerContactsPage() {
  const [contacts, setContacts] = useState<CustomerContact[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCustomer, setFilterCustomer] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<CustomerContact | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    customerId: "",
    contactName: "",
    designation: "",
    email: "",
    phone: "",
    department: "FOLLOW_UP",
  });

  useEffect(() => {
    fetchContacts();
    fetchCustomers();
  }, []);

  const fetchContacts = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterCustomer) params.set("customerId", filterCustomer);
      if (filterDepartment) params.set("department", filterDepartment);

      const response = await fetch(`/api/masters/customer-contacts?${params}`);
      if (response.ok) {
        setContacts(await response.json());
      }
    } catch (error) {
      console.error("Failed to fetch contacts:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/masters/customers");
      if (response.ok) {
        const data = await response.json();
        setCustomers(Array.isArray(data) ? data : data.customers || []);
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchContacts();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, filterCustomer, filterDepartment]);

  const openCreateDialog = () => {
    setEditingContact(null);
    setForm({
      customerId: filterCustomer || "",
      contactName: "",
      designation: "",
      email: "",
      phone: "",
      department: "FOLLOW_UP",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (contact: CustomerContact) => {
    setEditingContact(contact);
    setForm({
      customerId: contact.customerId,
      contactName: contact.contactName,
      designation: contact.designation || "",
      email: contact.email || "",
      phone: contact.phone || "",
      department: contact.department,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.customerId || !form.contactName || !form.department) {
      toast.error("Customer, name, and department are required");
      return;
    }

    setSaving(true);
    try {
      const url = editingContact
        ? `/api/masters/customer-contacts/${editingContact.id}`
        : "/api/masters/customer-contacts";
      const method = editingContact ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (response.ok) {
        toast.success(editingContact ? "Contact updated" : "Contact created");
        setDialogOpen(false);
        fetchContacts();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to save contact");
      }
    } catch (error) {
      toast.error("Failed to save contact");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;

    try {
      const response = await fetch(`/api/masters/customer-contacts/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        toast.success("Contact deleted");
        fetchContacts();
      } else {
        toast.error("Failed to delete contact");
      }
    } catch (error) {
      toast.error("Failed to delete contact");
    }
  };

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer / Vendor Contacts"
        description="Company directory — manage contacts for follow-up, quality, and accounts"
      >
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Add Contact
        </Button>
      </PageHeader>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, designation..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={filterCustomer} onValueChange={setFilterCustomer}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="All Customers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="FOLLOW_UP">Follow-up</SelectItem>
                <SelectItem value="QUALITY_INSPECTION">Quality / Inspection</SelectItem>
                <SelectItem value="ACCOUNTS">Accounts</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Contacts Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact Name</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No contacts found. Add your first contact to get started.
                  </TableCell>
                </TableRow>
              ) : (
                contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">{contact.contactName}</TableCell>
                    <TableCell>{contact.designation || "-"}</TableCell>
                    <TableCell>{contact.customer.name}</TableCell>
                    <TableCell>
                      <Badge variant={DEPARTMENT_COLORS[contact.department] as any}>
                        {DEPARTMENT_LABELS[contact.department]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{contact.email || "-"}</TableCell>
                    <TableCell className="text-sm">{contact.phone || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={contact.isActive ? "default" : "secondary"}>
                        {contact.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(contact)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(contact.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingContact ? "Edit Contact" : "Add Contact"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Customer *</Label>
              <Select
                value={form.customerId}
                onValueChange={(v) => setForm({ ...form, customerId: v })}
                disabled={!!editingContact}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department *</Label>
              <Select
                value={form.department}
                onValueChange={(v) => setForm({ ...form, department: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FOLLOW_UP">Follow-up</SelectItem>
                  <SelectItem value="QUALITY_INSPECTION">Quality / Inspection</SelectItem>
                  <SelectItem value="ACCOUNTS">Accounts</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Contact Name *</Label>
              <Input
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                placeholder="Mr. / Ms. Full Name"
              />
            </div>
            <div className="space-y-2">
              <Label>Designation</Label>
              <Input
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
                placeholder="e.g., Purchase Manager"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+91-XXXXXXXXXX"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingContact ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
