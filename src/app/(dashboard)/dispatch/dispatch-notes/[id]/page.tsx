"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";

export default function DispatchNoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [dn, setDN] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) fetchDispatchNote(params.id as string);
  }, [params.id]);

  const fetchDispatchNote = async (id: string) => {
    try {
      // Fetch dispatch note from the list endpoint and find by id
      const response = await fetch("/api/dispatch/dispatch-notes");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      const found = (data.dispatchNotes || []).find(
        (d: any) => d.id === id
      );
      if (!found) throw new Error("Not found");

      // Also fetch the packing list details for items
      if (found.packingList?.id) {
        const plRes = await fetch(
          `/api/dispatch/packing-lists/${found.packingList.id}`
        );
        if (plRes.ok) {
          const plData = await plRes.json();
          found.packingListFull = plData.packingList;
        }
      }

      setDN(found);
    } catch (error) {
      toast.error("Failed to load dispatch note");
      router.push("/dispatch");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!dn) return null;

  const plItems = dn.packingListFull?.items || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Dispatch Note: ${dn.dnNo}`}
        description={`Dispatched on ${format(new Date(dn.dispatchDate), "dd MMM yyyy")}`}
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              window.open(
                `/api/dispatch/dispatch-notes/${dn.id}/bundle-pdf`,
                "_blank"
              )
            }
          >
            <Download className="w-4 h-4 mr-2" />
            Download Bundle PDF
          </Button>
          {(!dn.invoices || dn.invoices.length === 0) && (
            <Button
              onClick={() =>
                router.push(`/dispatch/invoices/create?dnId=${dn.id}`)
              }
            >
              <FileText className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          )}
        </div>
      </PageHeader>

      <div className="grid grid-cols-3 gap-6">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Dispatch Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">DN Number</div>
                <div className="font-mono font-medium">{dn.dnNo}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">
                  Dispatch Date
                </div>
                <div>
                  {format(new Date(dn.dispatchDate), "dd MMM yyyy")}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">
                  Packing List
                </div>
                <Link
                  href={`/dispatch/packing-lists/${dn.packingList?.id}`}
                  className="font-mono text-blue-600 hover:underline"
                >
                  {dn.packingList?.plNo}
                </Link>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">
                  Sales Order
                </div>
                <Link
                  href={`/sales/${dn.salesOrder?.id}`}
                  className="font-mono text-blue-600 hover:underline"
                >
                  {dn.salesOrder?.soNo}
                </Link>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">
                  Vehicle Number
                </div>
                <div className="font-medium">{dn.vehicleNo || "---"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">LR Number</div>
                <div>{dn.lrNo || "---"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">
                  Transporter
                </div>
                <div className="font-medium">
                  {dn.transporter?.name || "---"}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">
                  E-Way Bill No.
                </div>
                <div>{dn.ewayBillNo || "---"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">
                  Destination
                </div>
                <div>{dn.destination || "---"}</div>
              </div>
            </div>

            {dn.remarks && (
              <>
                <Separator />
                <div>
                  <div className="text-sm text-muted-foreground">Remarks</div>
                  <div className="text-sm mt-1">{dn.remarks}</div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <div className="text-sm text-muted-foreground">Customer Name</div>
              <div className="font-medium">
                {dn.salesOrder?.customer?.name || "---"}
              </div>
            </div>
            {dn.invoices && dn.invoices.length > 0 && (
              <div>
                <div className="text-sm text-muted-foreground">Invoices</div>
                <div className="space-y-1 mt-1">
                  {dn.invoices.map((inv: any) => (
                    <Link
                      key={inv.id}
                      href={`/dispatch/invoices/${inv.id}`}
                      className="block font-mono text-sm text-blue-600 hover:underline"
                    >
                      {inv.invoiceNo} -{" "}
                      {"\u20B9"}{Number(inv.totalAmount).toFixed(2)}
                      <Badge
                        className={`ml-2 ${
                          inv.status === "PAID"
                            ? "bg-green-500"
                            : inv.status === "PARTIALLY_PAID"
                            ? "bg-yellow-500"
                            : "bg-gray-500"
                        }`}
                      >
                        {inv.status?.replace(/_/g, " ")}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dispatched Items (from Packing List)</CardTitle>
        </CardHeader>
        <CardContent>
          {plItems.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No items found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Heat No.</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty (Mtr)</TableHead>
                  <TableHead className="text-right">Pcs</TableHead>
                  <TableHead>Bundle</TableHead>
                  <TableHead className="text-right">Gross Wt (Kg)</TableHead>
                  <TableHead className="text-right">Net Wt (Kg)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plItems.map((item: any, index: number) => (
                  <TableRow key={item.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-mono">
                      {item.heatNo || item.inventoryStock?.heatNo || "---"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {item.sizeLabel ||
                        item.inventoryStock?.sizeLabel ||
                        "---"}
                    </TableCell>
                    <TableCell>{item.material || "---"}</TableCell>
                    <TableCell className="font-medium">
                      {item.inventoryStock?.product || "---"}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(item.quantityMtr).toFixed(3)}
                    </TableCell>
                    <TableCell className="text-right">{item.pieces}</TableCell>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
