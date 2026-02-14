"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { PageLoading } from "@/components/shared/page-loading";

interface PackingList {
  id: string;
  plNo: string;
  plDate: string;
  salesOrder: {
    id: string;
    soNo: string;
    customer: {
      id: string;
      name: string;
    };
  };
  items: any[];
  dispatchNotes: any[];
}

interface Transporter {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
}

export default function CreateDispatchNotePageWrapper() {
  return (
    <Suspense fallback={<PageLoading />}>
      <CreateDispatchNotePage />
    </Suspense>
  );
}

function CreateDispatchNotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPlId = searchParams.get("plId") || "";

  const [loading, setLoading] = useState(false);
  const [packingLists, setPackingLists] = useState<PackingList[]>([]);
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [selectedPL, setSelectedPL] = useState<PackingList | null>(null);

  const [formData, setFormData] = useState({
    packingListId: preselectedPlId,
    vehicleNo: "",
    lrNo: "",
    transporterId: "",
    destination: "",
    ewayBillNo: "",
    remarks: "",
  });

  useEffect(() => {
    fetchPackingLists();
    fetchTransporters();
  }, []);

  useEffect(() => {
    if (formData.packingListId) {
      const pl = packingLists.find((p) => p.id === formData.packingListId);
      setSelectedPL(pl || null);
    } else {
      setSelectedPL(null);
    }
  }, [formData.packingListId, packingLists]);

  const fetchPackingLists = async () => {
    try {
      const response = await fetch("/api/dispatch/packing-lists");
      if (response.ok) {
        const data = await response.json();
        // Filter to only show PLs without dispatch notes
        const eligible = (data.packingLists || []).filter(
          (pl: PackingList) => !pl.dispatchNotes || pl.dispatchNotes.length === 0
        );
        setPackingLists(eligible);
      }
    } catch (error) {
      console.error("Failed to fetch packing lists:", error);
    }
  };

  const fetchTransporters = async () => {
    try {
      const response = await fetch("/api/masters/other?type=transporters");
      if (response.ok) {
        const data = await response.json();
        setTransporters(data.transporters || []);
      }
    } catch (error) {
      console.error("Failed to fetch transporters:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.packingListId) {
      toast.error("Please select a Packing List");
      return;
    }

    if (!selectedPL) {
      toast.error("Packing List not found");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/dispatch/dispatch-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packingListId: formData.packingListId,
          salesOrderId: selectedPL.salesOrder?.id,
          vehicleNo: formData.vehicleNo || null,
          lrNo: formData.lrNo || null,
          transporterId: formData.transporterId || null,
          destination: formData.destination || null,
          ewayBillNo: formData.ewayBillNo || null,
          remarks: formData.remarks || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create dispatch note");
      }

      const data = await response.json();
      toast.success(`Dispatch Note ${data.dnNo} created successfully`);
      router.push(`/dispatch/dispatch-notes/${data.id}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Dispatch Note"
        description="Dispatch packed materials with transport details"
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Dispatch Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Packing List *</Label>
                <Select
                  value={formData.packingListId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, packingListId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Packing List" />
                  </SelectTrigger>
                  <SelectContent>
                    {packingLists.map((pl) => (
                      <SelectItem key={pl.id} value={pl.id}>
                        {pl.plNo} - {pl.salesOrder?.soNo} ({pl.salesOrder?.customer?.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedPL && (
                <div className="space-y-2">
                  <Label>Sales Order</Label>
                  <Input
                    value={`${selectedPL.salesOrder?.soNo} - ${selectedPL.salesOrder?.customer?.name}`}
                    disabled
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Vehicle Number</Label>
                <Input
                  value={formData.vehicleNo}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicleNo: e.target.value })
                  }
                  placeholder="e.g., MH-12-AB-1234"
                />
              </div>
              <div className="space-y-2">
                <Label>LR Number</Label>
                <Input
                  value={formData.lrNo}
                  onChange={(e) =>
                    setFormData({ ...formData, lrNo: e.target.value })
                  }
                  placeholder="Lorry Receipt number"
                />
              </div>
              <div className="space-y-2">
                <Label>Transporter</Label>
                <Select
                  value={formData.transporterId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, transporterId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Transporter" />
                  </SelectTrigger>
                  <SelectContent>
                    {transporters.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Destination</Label>
                <Input
                  value={formData.destination}
                  onChange={(e) =>
                    setFormData({ ...formData, destination: e.target.value })
                  }
                  placeholder="Delivery destination"
                />
              </div>
              <div className="space-y-2">
                <Label>E-Way Bill Number</Label>
                <Input
                  value={formData.ewayBillNo}
                  onChange={(e) =>
                    setFormData({ ...formData, ewayBillNo: e.target.value })
                  }
                  placeholder="E-Way bill number"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                value={formData.remarks}
                onChange={(e) =>
                  setFormData({ ...formData, remarks: e.target.value })
                }
                rows={2}
                placeholder="Optional remarks..."
              />
            </div>
          </CardContent>
        </Card>

        {selectedPL && selectedPL.items?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Items from Packing List ({selectedPL.plNo})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Heat No.</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Qty (Mtr)</TableHead>
                    <TableHead className="text-right">Pcs</TableHead>
                    <TableHead>Bundle</TableHead>
                    <TableHead className="text-right">Gross Wt</TableHead>
                    <TableHead className="text-right">Net Wt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedPL.items.map((item: any, index: number) => (
                    <TableRow key={item.id || index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-mono">
                        {item.heatNo || "---"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {item.sizeLabel || "---"}
                      </TableCell>
                      <TableCell>{item.material || "---"}</TableCell>
                      <TableCell className="text-right">
                        {Number(item.quantityMtr).toFixed(3)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.pieces}
                      </TableCell>
                      <TableCell>{item.bundleNo || "---"}</TableCell>
                      <TableCell className="text-right">
                        {item.grossWeightKg
                          ? Number(item.grossWeightKg).toFixed(3)
                          : "---"}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.netWeightKg
                          ? Number(item.netWeightKg).toFixed(3)
                          : "---"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !formData.packingListId}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Creating..." : "Create Dispatch Note"}
          </Button>
        </div>
      </form>
    </div>
  );
}
