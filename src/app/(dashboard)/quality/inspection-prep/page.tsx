"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Eye } from "lucide-react";
import { format } from "date-fns";
import { PageLoading } from "@/components/shared/page-loading";

interface InspectionPrepRow {
  id: string;
  prepNo: string;
  createdAt: string;
  status: string;
  purchaseOrder: { id: string; poNo: string } | null;
  warehouseIntimation: { id: string; mprNo: string } | null;
  preparedBy: { name: string } | null;
  items: { id: string; status: string }[];
}

function statusBadgeVariant(
  status: string
): "secondary" | "default" | "outline" {
  if (status === "DRAFT") return "secondary";
  if (status === "READY") return "default";
  return "outline"; // OFFER_GENERATED
}

export default function InspectionPrepListPage() {
  const router = useRouter();
  const [preps, setPreps] = useState<InspectionPrepRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchPreps();
  }, [search]);

  const fetchPreps = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/quality/inspection-prep?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPreps(data.preps || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inspection Prep"
        description="Manage material inspection preparation records"
      >
        <Button onClick={() => router.push("/quality/inspection-prep/create")}>
          <Plus className="w-4 h-4 mr-2" />
          New Inspection Prep
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by prep no, PO number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <PageLoading />
          ) : preps.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              No inspection prep records found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prep No.</TableHead>
                    <TableHead>PO No.</TableHead>
                    <TableHead>MPR No.</TableHead>
                    <TableHead>Items Ready</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prepared By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preps.map((prep) => {
                    const readyCount = prep.items.filter(
                      (i) => i.status === "READY"
                    ).length;
                    const totalCount = prep.items.length;
                    return (
                      <TableRow key={prep.id}>
                        <TableCell className="font-medium">
                          {prep.prepNo}
                        </TableCell>
                        <TableCell>
                          {prep.purchaseOrder?.poNo || "-"}
                        </TableCell>
                        <TableCell>
                          {prep.warehouseIntimation?.mprNo || "-"}
                        </TableCell>
                        <TableCell>
                          {readyCount} / {totalCount}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(prep.status)}>
                            {prep.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>{prep.preparedBy?.name || "-"}</TableCell>
                        <TableCell>
                          {format(new Date(prep.createdAt), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(`/quality/inspection-prep/${prep.id}`)
                            }
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
