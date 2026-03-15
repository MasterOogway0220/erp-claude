"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { ArrowLeft, Save, FileCheck, Users, RefreshCw, Upload, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { PageLoading } from "@/components/shared/page-loading";

interface ClientPO {
  id: string;
  cpoNo: string;
  cpoDate: string;
  clientPoNumber: string;
  clientPoDate: string | null;
  projectName: string | null;
  contactPerson: string | null;
  paymentTerms: string | null;
  deliveryTerms: string | null;
  currency: string;
  grandTotal: number | null;
  status: string;
  customer: { id: string; name: string; city: string | null };
  quotation: { id: string; quotationNo: string };
}

interface CustomerContact {
  id: string;
  contactName: string;
  designation: string | null;
  email: string | null;
  phone: string | null;
  department: string;
}

function useFileUploader() {
  const [uploading, setUploading] = useState(false);

  const uploadFile = async (file: File): Promise<{ filePath: string; fileName: string } | null> => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error(`File "${file.name}" exceeds 10MB limit`);
      return null;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const result = await res.json();
      return { filePath: result.filePath, fileName: file.name };
    } catch {
      toast.error(`Failed to upload "${file.name}"`);
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploading, uploadFile };
}

function CreatePOAcceptanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCpoId = searchParams.get("cpoId");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clientPOs, setClientPOs] = useState<ClientPO[]>([]);
  const [selectedCPO, setSelectedCPO] = useState<ClientPO | null>(null);
  const [contacts, setContacts] = useState<CustomerContact[]>([]);
  const [attachmentFile, setAttachmentFile] = useState<{ filePath: string; fileName: string } | null>(null);
  const { uploading, uploadFile } = useFileUploader();

  const [form, setForm] = useState({
    clientPurchaseOrderId: "",
    acceptanceDate: format(new Date(), "yyyy-MM-dd"),
    committedDeliveryDate: "",
    remarks: "",
    followUpName: "",
    followUpEmail: "",
    followUpPhone: "",
    qualityName: "",
    qualityEmail: "",
    qualityPhone: "",
    accountsName: "",
    accountsEmail: "",
    accountsPhone: "",
  });

  useEffect(() => {
    fetchClientPOs();
  }, []);

  useEffect(() => {
    if (preselectedCpoId && clientPOs.length > 0) {
      const cpo = clientPOs.find((c) => c.id === preselectedCpoId);
      if (cpo) {
        setSelectedCPO(cpo);
        setForm((prev) => ({ ...prev, clientPurchaseOrderId: cpo.id }));
        fetchContacts(cpo.customer.id);
      }
    }
  }, [preselectedCpoId, clientPOs]);

  const fetchClientPOs = async () => {
    try {
      const response = await fetch("/api/client-purchase-orders?status=REGISTERED");
      if (response.ok) {
        const data = await response.json();
        // Filter out CPOs that already have acceptance
        const cpos = (data.clientPOs || data || []).filter(
          (c: any) => c.status === "REGISTERED"
        );
        setClientPOs(cpos);
      }
    } catch (error) {
      console.error("Failed to fetch CPOs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async (customerId: string) => {
    try {
      const response = await fetch(
        `/api/masters/customer-contacts?customerId=${customerId}`
      );
      if (response.ok) {
        setContacts(await response.json());
      }
    } catch (error) {
      console.error("Failed to fetch contacts:", error);
    }
  };

  const handleCPOSelect = (cpoId: string) => {
    const cpo = clientPOs.find((c) => c.id === cpoId);
    if (cpo) {
      setSelectedCPO(cpo);
      setForm((prev) => ({ ...prev, clientPurchaseOrderId: cpo.id }));
      fetchContacts(cpo.customer.id);
    }
  };

  const fillContactFromDirectory = (
    department: string,
    contact: CustomerContact
  ) => {
    if (department === "FOLLOW_UP") {
      setForm((prev) => ({
        ...prev,
        followUpName: contact.contactName,
        followUpEmail: contact.email || "",
        followUpPhone: contact.phone || "",
      }));
    } else if (department === "QUALITY_INSPECTION") {
      setForm((prev) => ({
        ...prev,
        qualityName: contact.contactName,
        qualityEmail: contact.email || "",
        qualityPhone: contact.phone || "",
      }));
    } else if (department === "ACCOUNTS") {
      setForm((prev) => ({
        ...prev,
        accountsName: contact.contactName,
        accountsEmail: contact.email || "",
        accountsPhone: contact.phone || "",
      }));
    }
  };

  const autoFillAllContacts = () => {
    const followUp = contacts.find((c) => c.department === "FOLLOW_UP");
    const quality = contacts.find((c) => c.department === "QUALITY_INSPECTION");
    const accounts = contacts.find((c) => c.department === "ACCOUNTS");

    setForm((prev) => ({
      ...prev,
      followUpName: followUp?.contactName || prev.followUpName,
      followUpEmail: followUp?.email || prev.followUpEmail,
      followUpPhone: followUp?.phone || prev.followUpPhone,
      qualityName: quality?.contactName || prev.qualityName,
      qualityEmail: quality?.email || prev.qualityEmail,
      qualityPhone: quality?.phone || prev.qualityPhone,
      accountsName: accounts?.contactName || prev.accountsName,
      accountsEmail: accounts?.email || prev.accountsEmail,
      accountsPhone: accounts?.phone || prev.accountsPhone,
    }));

    toast.success("Contacts auto-filled from directory");
  };

  const handleSubmit = async () => {
    if (!form.clientPurchaseOrderId) {
      toast.error("Please select a Client Purchase Order");
      return;
    }
    if (!form.acceptanceDate) {
      toast.error("Acceptance date is required");
      return;
    }
    if (!form.committedDeliveryDate) {
      toast.error("Committed delivery date is required");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/po-acceptance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          attachmentUrl: attachmentFile?.filePath || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`PO Acceptance ${data.acceptanceNo} created`);
        router.push(`/po-acceptance/${data.id}`);
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to create acceptance");
      }
    } catch (error) {
      toast.error("Failed to create acceptance");
    } finally {
      setSaving(false);
    }
  };

  const contactsByDept = (dept: string) =>
    contacts.filter((c) => c.department === dept);

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create P.O. Acceptance"
        description="Generate acceptance document for a verified Client Purchase Order"
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      {/* Select Client PO */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Client Purchase Order</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client Purchase Order *</Label>
              <Select
                value={form.clientPurchaseOrderId}
                onValueChange={handleCPOSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a registered Client P.O." />
                </SelectTrigger>
                <SelectContent>
                  {clientPOs.map((cpo) => (
                    <SelectItem key={cpo.id} value={cpo.id}>
                      {cpo.cpoNo} — {cpo.customer.name} — {cpo.clientPoNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCPO && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <div className="text-xs text-muted-foreground">Client</div>
                  <div className="text-sm font-medium">{selectedCPO.customer.name}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Client PO</div>
                  <div className="text-sm font-medium">{selectedCPO.clientPoNumber}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Quotation Ref</div>
                  <div className="text-sm font-medium">{selectedCPO.quotation.quotationNo}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Order Value</div>
                  <div className="text-sm font-medium">
                    {selectedCPO.currency === "INR" ? "\u20B9" : selectedCPO.currency}{" "}
                    {selectedCPO.grandTotal?.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    }) || "-"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Project</div>
                  <div className="text-sm">{selectedCPO.projectName || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Payment Terms</div>
                  <div className="text-sm">{selectedCPO.paymentTerms || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Delivery Terms</div>
                  <div className="text-sm">{selectedCPO.deliveryTerms || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">CPO Date</div>
                  <div className="text-sm">
                    {format(new Date(selectedCPO.cpoDate), "dd/MM/yyyy")}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Acceptance Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Acceptance Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Acceptance Date *</Label>
              <Input
                type="date"
                value={form.acceptanceDate}
                onChange={(e) =>
                  setForm({ ...form, acceptanceDate: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Committed Delivery Date *</Label>
              <Input
                type="date"
                value={form.committedDeliveryDate}
                onChange={(e) =>
                  setForm({ ...form, committedDeliveryDate: e.target.value })
                }
              />
            </div>
            <div className="md:col-span-1" />
          </div>
          <div className="mt-4 space-y-2">
            <Label>Remarks</Label>
            <Textarea
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              placeholder="Any additional remarks or conditions..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Attachment Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Signed PO Acceptance Copy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Upload a signed copy of the PO acceptance (PDF, DOC, or image).
            </p>
            {attachmentFile ? (
              <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{attachmentFile.fileName}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                  onClick={() => setAttachmentFile(null)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-md border border-dashed p-6">
                <div className="text-xs text-muted-foreground">
                  No file uploaded yet
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => document.getElementById("upload-po-attachment")?.click()}
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  {uploading ? "Uploading..." : "Upload File"}
                </Button>
              </div>
            )}
            <input
              id="upload-po-attachment"
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const result = await uploadFile(file);
                  if (result) {
                    setAttachmentFile(result);
                  }
                }
                e.target.value = "";
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Client Contact / Department Contact Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Client Contact / Department Contact Details
            </CardTitle>
            {selectedCPO && contacts.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={autoFillAllContacts}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Auto-fill from Directory
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Follow-up Contact */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge>Follow-up</Badge>
              {contactsByDept("FOLLOW_UP").length > 0 && (
                <Select
                  onValueChange={(v) => {
                    const c = contacts.find((c) => c.id === v);
                    if (c) fillContactFromDirectory("FOLLOW_UP", c);
                  }}
                >
                  <SelectTrigger className="w-[250px] h-8 text-xs">
                    <SelectValue placeholder="Pick from directory..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contactsByDept("FOLLOW_UP").map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.contactName}
                        {c.designation ? ` (${c.designation})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Mr. / Ms.</Label>
                <Input
                  value={form.followUpName}
                  onChange={(e) =>
                    setForm({ ...form, followUpName: e.target.value })
                  }
                  placeholder="Contact person name"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.followUpEmail}
                  onChange={(e) =>
                    setForm({ ...form, followUpEmail: e.target.value })
                  }
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Contact No</Label>
                <Input
                  value={form.followUpPhone}
                  onChange={(e) =>
                    setForm({ ...form, followUpPhone: e.target.value })
                  }
                  placeholder="+91-XXXXXXXXXX"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Quality / Inspection Contact */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary">Quality / Inspection</Badge>
              {contactsByDept("QUALITY_INSPECTION").length > 0 && (
                <Select
                  onValueChange={(v) => {
                    const c = contacts.find((c) => c.id === v);
                    if (c) fillContactFromDirectory("QUALITY_INSPECTION", c);
                  }}
                >
                  <SelectTrigger className="w-[250px] h-8 text-xs">
                    <SelectValue placeholder="Pick from directory..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contactsByDept("QUALITY_INSPECTION").map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.contactName}
                        {c.designation ? ` (${c.designation})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Mr. / Ms.</Label>
                <Input
                  value={form.qualityName}
                  onChange={(e) =>
                    setForm({ ...form, qualityName: e.target.value })
                  }
                  placeholder="Contact person name"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.qualityEmail}
                  onChange={(e) =>
                    setForm({ ...form, qualityEmail: e.target.value })
                  }
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Contact No</Label>
                <Input
                  value={form.qualityPhone}
                  onChange={(e) =>
                    setForm({ ...form, qualityPhone: e.target.value })
                  }
                  placeholder="+91-XXXXXXXXXX"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Accounts Contact */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline">Accounts</Badge>
              {contactsByDept("ACCOUNTS").length > 0 && (
                <Select
                  onValueChange={(v) => {
                    const c = contacts.find((c) => c.id === v);
                    if (c) fillContactFromDirectory("ACCOUNTS", c);
                  }}
                >
                  <SelectTrigger className="w-[250px] h-8 text-xs">
                    <SelectValue placeholder="Pick from directory..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contactsByDept("ACCOUNTS").map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.contactName}
                        {c.designation ? ` (${c.designation})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Mr. / Ms.</Label>
                <Input
                  value={form.accountsName}
                  onChange={(e) =>
                    setForm({ ...form, accountsName: e.target.value })
                  }
                  placeholder="Contact person name"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.accountsEmail}
                  onChange={(e) =>
                    setForm({ ...form, accountsEmail: e.target.value })
                  }
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Contact No</Label>
                <Input
                  value={form.accountsPhone}
                  onChange={(e) =>
                    setForm({ ...form, accountsPhone: e.target.value })
                  }
                  placeholder="+91-XXXXXXXXXX"
                />
              </div>
            </div>
          </div>

          {selectedCPO && contacts.length === 0 && (
            <div className="text-center py-4 border border-dashed rounded-lg">
              <p className="text-sm text-muted-foreground">
                No contacts in directory for this customer.{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto text-sm"
                  onClick={() => router.push("/masters/customer-contacts")}
                >
                  Add contacts to the directory
                </Button>{" "}
                to enable auto-fill.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={saving || uploading}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Creating..." : "Create Acceptance"}
        </Button>
      </div>
    </div>
  );
}

export default function CreatePOAcceptancePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <CreatePOAcceptanceContent />
    </Suspense>
  );
}
