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
import { ArrowLeft, Truck } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";
import { PageLoading } from "@/components/shared/page-loading";

export default function PackingListDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [packingList, setPackingList] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) fetchPackingList(params.id as string);
  }, [params.id]);

  const fetchPackingList = async (id: string) => {
    try {
      const response = await fetch(`/api/dispatch/packing-lists/${id}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setPackingList(data.packingList);
    } catch (error) {
      toast.error("Failed to load packing list");
      router.push("/dispatch");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <PageLoading />;
  }

  if (!packingList) return null;

  const hasDN = packingList.dispatchNotes?.length > 0;
  const totalQty = packingList.items?.reduce(
    (sum: number, item: any) => sum + Number(item.quantityMtr),
    0
  );
  const totalPcs = packingList.items?.reduce(
    (sum: number, item: any) => sum + Number(item.pieces),
    0
  );
  const totalGrossWt = packingList.items?.reduce(
    (sum: number, item: any) => sum + Number(item.grossWeightKg || 0),
    0
  );
  const totalNetWt = packingList.items?.reduce(
    (sum: number, item: any) => sum + Number(item.netWeightKg || 0),
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Packing List: ${packingList.plNo}`}
        description={`Created on ${format(new Date(packingList.plDate), "dd MMM yyyy")}`}
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          {!hasDN && (
            <Button
              onClick={() =>
                router.push(
                  `/dispatch/dispatch-notes/create?plId=${packingList.id}`
                )
              }
            >
              <Truck className="w-4 h-4 mr-2" />
              Create Dispatch Note
            </Button>
          )}
        </div>
      </PageHeader>

      <div className="grid grid-cols-3 gap-6">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Packing List Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">PL Number</div>
                <div className="font-mono font-medium">{packingList.plNo}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">PL Date</div>
                <div>
                  {format(new Date(packingList.plDate), "dd MMM yyyy")}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">
                  Sales Order
                </div>
                <Link
                  href={`/sales/${packingList.salesOrder?.id}`}
                  className="font-mono text-blue-600 hover:underline"
                >
                  {packingList.salesOrder?.soNo}
                </Link>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <Badge className={hasDN ? "bg-green-500" : "bg-blue-500"}>
                  {hasDN ? "DISPATCHED" : "PACKED"}
                </Badge>
              </div>
            </div>
            {packingList.remarks && (
              <>
                <Separator />
                <div>
                  <div className="text-sm text-muted-foreground">Remarks</div>
                  <div className="text-sm mt-1">{packingList.remarks}</div>
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
                {packingList.salesOrder?.customer?.name}
              </div>
            </div>
            {packingList.dispatchNotes?.length > 0 && (
              <div>
                <div className="text-sm text-muted-foreground">
                  Dispatch Notes
                </div>
                <div className="space-y-1 mt-1">
                  {packingList.dispatchNotes.map((dn: any) => (
                    <Link
                      key={dn.id}
                      href={`/dispatch/dispatch-notes/${dn.id}`}
                      className="block font-mono text-sm text-blue-600 hover:underline"
                    >
                      {dn.dnNo} -{" "}
                      {format(new Date(dn.dispatchDate), "dd MMM yyyy")}
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
          <CardTitle>Packed Items</CardTitle>
        </CardHeader>
        <CardContent>
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
                <TableHead>Bundle No.</TableHead>
                <TableHead className="text-right">Gross Wt (Kg)</TableHead>
                <TableHead className="text-right">Net Wt (Kg)</TableHead>
                <TableHead>Marking</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packingList.items?.map((item: any, index: number) => (
                <TableRow key={item.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-mono">
                    {item.heatNo || item.inventoryStock?.heatNo || "---"}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {item.sizeLabel || item.inventoryStock?.sizeLabel || "---"}
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
                  <TableCell className="text-sm">
                    {item.markingDetails || "---"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-end mt-4 pt-4 border-t">
            <div className="grid grid-cols-4 gap-6 text-right">
              <div>
                <div className="text-sm text-muted-foreground">Total Qty</div>
                <div className="font-bold">{totalQty.toFixed(3)} Mtr</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Pcs</div>
                <div className="font-bold">{totalPcs}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">
                  Gross Weight
                </div>
                <div className="font-bold">{totalGrossWt.toFixed(3)} Kg</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Net Weight</div>
                <div className="font-bold">{totalNetWt.toFixed(3)} Kg</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
