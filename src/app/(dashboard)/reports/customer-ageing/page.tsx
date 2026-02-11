"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, IndianRupee, AlertTriangle, Clock } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

interface CustomerAgeingRow {
  customerId: string;
  customerName: string;
  customerCode: string;
  totalOutstanding: number;
  bucket0to30: number;
  bucket31to60: number;
  bucket61to90: number;
  bucket91Plus: number;
}

interface CustomerAgeingData {
  customers: CustomerAgeingRow[];
  totalOutstanding: number;
  total0to30: number;
  total31to60: number;
  total61to90: number;
  total91Plus: number;
  overdueCustomers: number;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

export default function CustomerAgeingPage() {
  const [data, setData] = useState<CustomerAgeingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/reports/customer-ageing");
      if (!response.ok) throw new Error("Failed to fetch");
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to fetch customer ageing:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Customer Ageing"
          description="Outstanding amounts by customer with ageing buckets"
        />
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          Loading customer ageing...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Customer Ageing"
          description="Outstanding amounts by customer with ageing buckets"
        />
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No customer ageing data available. Ensure the API endpoint is configured.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Ageing"
        description="Outstanding amounts by customer with ageing buckets"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.totalOutstanding || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current (0-30)</CardTitle>
            <Clock className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(data.total0to30 || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue (91+)</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(data.total91Plus || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Customers</CardTitle>
            <Users className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {data.overdueCustomers || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer-wise Ageing</CardTitle>
        </CardHeader>
        <CardContent>
          {data.customers && data.customers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Total Outstanding</TableHead>
                  <TableHead className="text-right">0-30 Days</TableHead>
                  <TableHead className="text-right">31-60 Days</TableHead>
                  <TableHead className="text-right">61-90 Days</TableHead>
                  <TableHead className="text-right">91+ Days</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.customers.map((customer) => (
                  <TableRow
                    key={customer.customerId}
                    className={customer.bucket91Plus > 0 ? "bg-red-50/50" : ""}
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium">{customer.customerName}</div>
                        <div className="text-sm text-muted-foreground">
                          {customer.customerCode}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCurrency(customer.totalOutstanding)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {customer.bucket0to30 > 0
                        ? formatCurrency(customer.bucket0to30)
                        : "---"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {customer.bucket31to60 > 0 ? (
                        <span className="text-yellow-600">
                          {formatCurrency(customer.bucket31to60)}
                        </span>
                      ) : (
                        "---"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {customer.bucket61to90 > 0 ? (
                        <span className="text-orange-600">
                          {formatCurrency(customer.bucket61to90)}
                        </span>
                      ) : (
                        "---"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {customer.bucket91Plus > 0 ? (
                        <span className="font-semibold text-red-600">
                          {formatCurrency(customer.bucket91Plus)}
                        </span>
                      ) : (
                        "---"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-bold">Total</TableCell>
                  <TableCell className="text-right font-mono font-bold">
                    {formatCurrency(data.totalOutstanding || 0)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold">
                    {formatCurrency(data.total0to30 || 0)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-yellow-600">
                    {formatCurrency(data.total31to60 || 0)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-orange-600">
                    {formatCurrency(data.total61to90 || 0)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-red-600">
                    {formatCurrency(data.total91Plus || 0)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          ) : (
            <div className="py-4 text-center text-muted-foreground">
              No customer ageing data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
