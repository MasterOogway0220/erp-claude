"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";

export default function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayment();
  }, [id]);

  const fetchPayment = async () => {
    try {
      const response = await fetch(`/api/dispatch/payments/${id}`);
      if (response.ok) {
        const data = await response.json();
        setPayment(data.paymentReceipt);
      } else {
        toast.error("Failed to load payment receipt");
        router.push("/dispatch");
      }
    } catch (error) {
      toast.error("Failed to load payment receipt");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-muted animate-pulse rounded" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!payment) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={payment.receiptNo}
        description="Payment Receipt Details"
      >
        <Button variant="outline" onClick={() => router.push("/dispatch")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Receipt Date</p>
                <p className="font-medium">
                  {format(new Date(payment.receiptDate), "dd MMM yyyy")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payment Mode</p>
                <Badge variant="outline">{payment.paymentMode}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Amount Received</p>
                <p className="text-xl font-bold text-green-600">
                  {"\u20B9"}{Number(payment.amountReceived).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">TDS Amount</p>
                <p className="font-medium">
                  {"\u20B9"}{Number(payment.tdsAmount).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reference No</p>
                <p className="font-medium font-mono">
                  {payment.referenceNo || "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bank Name</p>
                <p className="font-medium">{payment.bankName || "—"}</p>
              </div>
            </div>
            {payment.remarks && (
              <div>
                <p className="text-sm text-muted-foreground">Remarks</p>
                <p className="text-sm">{payment.remarks}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice & Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice & Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Invoice</p>
                <p className="font-medium">
                  {payment.invoice ? (
                    <Link
                      href={`/dispatch/invoices/${payment.invoice.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {payment.invoice.invoiceNo}
                    </Link>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-medium">
                  {payment.customer?.name || "—"}
                </p>
              </div>
              {payment.invoice?.salesOrder && (
                <div>
                  <p className="text-sm text-muted-foreground">Sales Order</p>
                  <p className="font-medium">
                    <Link
                      href={`/sales/${payment.invoice.salesOrder.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {payment.invoice.salesOrder.soNo}
                    </Link>
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
