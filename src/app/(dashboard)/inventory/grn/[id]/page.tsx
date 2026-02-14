"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";
import { PageLoading } from "@/components/shared/page-loading";

const stockStatusColors: Record<string, string> = {
  UNDER_INSPECTION: "bg-yellow-500", ACCEPTED: "bg-green-500", REJECTED: "bg-red-500",
  HOLD: "bg-orange-500", RESERVED: "bg-blue-500", DISPATCHED: "bg-gray-500",
};

export default function GRNDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [grn, setGrn] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) fetchGRN(params.id as string);
  }, [params.id]);

  const fetchGRN = async (id: string) => {
    try {
      const response = await fetch(`/api/inventory/grn/${id}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setGrn(data.grn);
    } catch (error) {
      toast.error("Failed to load GRN");
      router.push("/inventory");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageLoading />;
  if (!grn) return null;

  return (
    <div className="space-y-6">
      <PageHeader title={`GRN: ${grn.grnNo}`} description={`Received on ${format(new Date(grn.grnDate), "dd MMM yyyy")}`}>
        <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
      </PageHeader>

      <div className="grid grid-cols-3 gap-6">
        <Card className="col-span-2">
          <CardHeader><CardTitle>GRN Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><div className="text-sm text-muted-foreground">GRN Number</div><div className="font-mono font-medium">{grn.grnNo}</div></div>
              <div><div className="text-sm text-muted-foreground">GRN Date</div><div>{format(new Date(grn.grnDate), "dd MMM yyyy")}</div></div>
              <div><div className="text-sm text-muted-foreground">Purchase Order</div>
                <Link href={`/purchase/orders/${grn.purchaseOrder?.id}`} className="font-mono text-blue-600 hover:underline">{grn.purchaseOrder?.poNo}</Link>
              </div>
              <div><div className="text-sm text-muted-foreground">Received By</div><div>{grn.receivedBy?.name}</div></div>
            </div>
            {grn.remarks && (<><Separator /><div><div className="text-sm text-muted-foreground">Remarks</div><div className="text-sm mt-1">{grn.remarks}</div></div></>)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Vendor Details</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div><div className="text-sm text-muted-foreground">Vendor Name</div><div className="font-medium">{grn.vendor?.name}</div></div>
            {grn.vendor?.city && <div><div className="text-sm text-muted-foreground">City</div><div>{grn.vendor.city}</div></div>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Received Items</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead><TableHead>Product</TableHead><TableHead>Material</TableHead>
                <TableHead>Size</TableHead><TableHead>Heat No.</TableHead><TableHead className="text-right">Qty (Mtr)</TableHead>
                <TableHead className="text-right">Pcs</TableHead><TableHead>MTC No.</TableHead><TableHead>Stock Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grn.items?.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>{item.sNo}</TableCell>
                  <TableCell className="font-medium">{item.product}</TableCell>
                  <TableCell>{item.material}</TableCell>
                  <TableCell className="font-mono text-sm">{item.sizeLabel}</TableCell>
                  <TableCell className="font-mono">{item.heatNo}</TableCell>
                  <TableCell className="text-right">{Number(item.receivedQtyMtr).toFixed(3)}</TableCell>
                  <TableCell className="text-right">{item.pieces}</TableCell>
                  <TableCell>{item.mtcNo || "—"}</TableCell>
                  <TableCell>
                    {item.inventoryStocks?.map((stock: any) => (
                      <Link key={stock.id} href={`/inventory/stock/${stock.id}`}>
                        <Badge className={stockStatusColors[stock.status] || "bg-gray-500"}>{stock.status.replace(/_/g, " ")}</Badge>
                      </Link>
                    ))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
