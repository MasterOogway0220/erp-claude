"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Eye,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface POTracking {
  id: string;
  poNo: string;
  poDate: string;
  vendor: {
    id: string;
    name: string;
  };
  deliveryDate: string;
  totalAmount: number;
  status: string;
  goodsReceiptNotes: Array<{
    grnDate: string;
  }>;
}

interface VendorPerformance {
  vendorId: string;
  vendorCode: string;
  vendorName: string;
  totalPOs: number;
  onTimeDeliveries: number;
  lateDeliveries: number;
  pendingPOs: number;
  avgDelayDays: number;
  onTimePercentage: number;
  performanceScore: number;
}

export default function POFollowUpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [overduePOs, setOverduePOs] = useState<POTracking[]>([]);
  const [upcomingPOs, setUpcomingPOs] = useState<POTracking[]>([]);
  const [vendorPerformance, setVendorPerformance] = useState<VendorPerformance[]>([]);

  useEffect(() => {
    fetchPOTracking();
  }, []);

  const fetchPOTracking = async () => {
    try {
      const response = await fetch("/api/purchase/orders/tracking");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();

      // Filter overdue POs
      const overdue = data.purchaseOrders.filter((po: POTracking) => {
        return (
          po.deliveryDate &&
          po.status !== "FULLY_RECEIVED" &&
          po.status !== "CLOSED" &&
          differenceInDays(new Date(), new Date(po.deliveryDate)) > 0
        );
      });

      // Filter upcoming POs (next 14 days)
      const upcoming = data.purchaseOrders.filter((po: POTracking) => {
        if (!po.deliveryDate || po.status === "FULLY_RECEIVED" || po.status === "CLOSED") {
          return false;
        }
        const daysUntil = differenceInDays(new Date(po.deliveryDate), new Date());
        return daysUntil >= 0 && daysUntil <= 14;
      });

      setOverduePOs(overdue);
      setUpcomingPOs(upcoming);

      // Calculate vendor performance
      calculateVendorPerformance(data.purchaseOrders);
    } catch (error) {
      toast.error("Failed to load PO tracking data");
    } finally {
      setLoading(false);
    }
  };

  const calculateVendorPerformance = (pos: POTracking[]) => {
    const vendorMap = new Map<string, VendorPerformance>();

    pos.forEach((po) => {
      if (!vendorMap.has(po.vendor.id)) {
        vendorMap.set(po.vendor.id, {
          vendorId: po.vendor.id,
          vendorCode: "",
          vendorName: po.vendor.name,
          totalPOs: 0,
          onTimeDeliveries: 0,
          lateDeliveries: 0,
          pendingPOs: 0,
          avgDelayDays: 0,
          onTimePercentage: 0,
          performanceScore: 0,
        });
      }

      const vendor = vendorMap.get(po.vendor.id)!;
      vendor.totalPOs++;

      if (po.status === "FULLY_RECEIVED" || po.status === "CLOSED") {
        // Check if delivered on time
        if (po.deliveryDate && po.goodsReceiptNotes.length > 0) {
          const actualDelivery = new Date(po.goodsReceiptNotes[0].grnDate);
          const expectedDelivery = new Date(po.deliveryDate);
          const delay = differenceInDays(actualDelivery, expectedDelivery);

          if (delay <= 0) {
            vendor.onTimeDeliveries++;
          } else {
            vendor.lateDeliveries++;
            vendor.avgDelayDays += delay;
          }
        }
      } else if (
        po.status !== "CANCELLED" &&
        po.status !== "REJECTED"
      ) {
        vendor.pendingPOs++;
      }
    });

    // Calculate percentages and scores
    const performanceData: VendorPerformance[] = [];
    vendorMap.forEach((vendor) => {
      const completedPOs = vendor.onTimeDeliveries + vendor.lateDeliveries;
      vendor.onTimePercentage =
        completedPOs > 0 ? (vendor.onTimeDeliveries / completedPOs) * 100 : 0;
      vendor.avgDelayDays =
        vendor.lateDeliveries > 0
          ? vendor.avgDelayDays / vendor.lateDeliveries
          : 0;

      // Performance score: 100 for perfect, deduct 5 points per % late, bonus for no delays
      vendor.performanceScore = Math.max(
        0,
        Math.min(100, vendor.onTimePercentage - vendor.avgDelayDays * 2)
      );

      performanceData.push(vendor);
    });

    // Sort by performance score
    performanceData.sort((a, b) => b.performanceScore - a.performanceScore);
    setVendorPerformance(performanceData);
  };

  const getPerformanceBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-500">Excellent</Badge>;
    if (score >= 75) return <Badge className="bg-blue-500">Good</Badge>;
    if (score >= 60) return <Badge className="bg-yellow-500">Average</Badge>;
    return <Badge className="bg-red-500">Poor</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading tracking data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="PO Follow-up & Tracking"
        description="Monitor purchase orders, delivery schedules, and vendor performance"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Overdue POs</div>
                <div className="text-3xl font-bold text-red-600">
                  {overduePOs.length}
                </div>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Upcoming (14 days)</div>
                <div className="text-3xl font-bold text-yellow-600">
                  {upcomingPOs.length}
                </div>
              </div>
              <Clock className="w-8 h-8 text-yellow-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Active Vendors</div>
                <div className="text-3xl font-bold text-blue-600">
                  {vendorPerformance.length}
                </div>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Avg. On-Time %</div>
                <div className="text-3xl font-bold text-green-600">
                  {vendorPerformance.length > 0
                    ? (
                        vendorPerformance.reduce(
                          (sum, v) => sum + v.onTimePercentage,
                          0
                        ) / vendorPerformance.length
                      ).toFixed(0)
                    : 0}
                  %
                </div>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue POs */}
      {overduePOs.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Overdue Purchase Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Expected Delivery</TableHead>
                  <TableHead>Days Overdue</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overduePOs.map((po) => {
                  const daysOverdue = differenceInDays(
                    new Date(),
                    new Date(po.deliveryDate)
                  );
                  return (
                    <TableRow key={po.id} className="bg-red-50">
                      <TableCell className="font-mono font-medium">
                        {po.poNo}
                      </TableCell>
                      <TableCell>{po.vendor.name}</TableCell>
                      <TableCell>
                        {format(new Date(po.deliveryDate), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">{daysOverdue} days</Badge>
                      </TableCell>
                      <TableCell>₹{Number(po.totalAmount).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge className="bg-yellow-500">
                          {po.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/purchase/orders/${po.id}`)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Deliveries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Upcoming Deliveries (Next 14 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingPOs.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No upcoming deliveries in the next 14 days
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Expected Delivery</TableHead>
                  <TableHead>Days Until</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingPOs.map((po) => {
                  const daysUntil = differenceInDays(
                    new Date(po.deliveryDate),
                    new Date()
                  );
                  return (
                    <TableRow key={po.id}>
                      <TableCell className="font-mono font-medium">
                        {po.poNo}
                      </TableCell>
                      <TableCell>{po.vendor.name}</TableCell>
                      <TableCell>
                        {format(new Date(po.deliveryDate), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={daysUntil <= 3 ? "destructive" : "default"}
                        >
                          {daysUntil} days
                        </Badge>
                      </TableCell>
                      <TableCell>₹{Number(po.totalAmount).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge className="bg-green-500">
                          {po.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/purchase/orders/${po.id}`)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Vendor Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Vendor Performance Scorecard
          </CardTitle>
        </CardHeader>
        <CardContent>
          {vendorPerformance.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No vendor performance data available
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-center">Total POs</TableHead>
                  <TableHead className="text-center">On-Time</TableHead>
                  <TableHead className="text-center">Late</TableHead>
                  <TableHead className="text-center">Pending</TableHead>
                  <TableHead className="text-center">On-Time %</TableHead>
                  <TableHead className="text-center">Avg. Delay (Days)</TableHead>
                  <TableHead>Performance Score</TableHead>
                  <TableHead>Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendorPerformance.map((vendor) => (
                  <TableRow key={vendor.vendorId}>
                    <TableCell>
                      <div className="font-medium">{vendor.vendorName}</div>
                      <div className="text-sm text-muted-foreground font-mono">
                        {vendor.vendorCode}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{vendor.totalPOs}</TableCell>
                    <TableCell className="text-center text-green-600 font-medium">
                      {vendor.onTimeDeliveries}
                    </TableCell>
                    <TableCell className="text-center text-red-600 font-medium">
                      {vendor.lateDeliveries}
                    </TableCell>
                    <TableCell className="text-center text-yellow-600 font-medium">
                      {vendor.pendingPOs}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center gap-2">
                        <Progress
                          value={vendor.onTimePercentage}
                          className="w-16"
                        />
                        <span className="text-sm font-medium">
                          {vendor.onTimePercentage.toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {vendor.avgDelayDays > 0 ? (
                        <span className="text-red-600 font-medium">
                          {vendor.avgDelayDays.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-green-600">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={vendor.performanceScore} className="w-20" />
                        <span className="text-sm font-medium">
                          {vendor.performanceScore.toFixed(0)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getPerformanceBadge(vendor.performanceScore)}</TableCell>
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
