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
  totalOutstanding: number;
  ageingBuckets: {
    "0-30": number;
    "31-60": number;
    "61-90": number;
    "91+": number;
  };
}

interface CustomerAgeingData {
  customers: CustomerAgeingRow[];
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
        {(() => {
          const cs = data.customers || [];
          const totalOutstanding = cs.reduce((s, c) => s + c.totalOutstanding, 0);
          const total0to30 = cs.reduce((s, c) => s + c.ageingBuckets["0-30"], 0);
          const total91Plus = cs.reduce((s, c) => s + c.ageingBuckets["91+"], 0);
          const overdueCustomers = cs.filter((c) => c.ageingBuckets["91+"] > 0).length;
          return (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
                  <IndianRupee className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(totalOutstanding)}
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
                    {formatCurrency(total0to30)}
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
                    {formatCurrency(total91Plus)}
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
                    {overdueCustomers}
                  </div>
                </CardContent>
              </Card>
            </>
          );
        })()}
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
                    className={customer.ageingBuckets["91+"] > 0 ? "bg-red-50/50" : ""}
                  >
                    <TableCell>
                      <div className="font-medium">{customer.customerName}</div>
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCurrency(customer.totalOutstanding)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {customer.ageingBuckets["0-30"] > 0
                        ? formatCurrency(customer.ageingBuckets["0-30"])
                        : "---"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {customer.ageingBuckets["31-60"] > 0 ? (
                        <span className="text-yellow-600">
                          {formatCurrency(customer.ageingBuckets["31-60"])}
                        </span>
                      ) : (
                        "---"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {customer.ageingBuckets["61-90"] > 0 ? (
                        <span className="text-orange-600">
                          {formatCurrency(customer.ageingBuckets["61-90"])}
                        </span>
                      ) : (
                        "---"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {customer.ageingBuckets["91+"] > 0 ? (
                        <span className="font-semibold text-red-600">
                          {formatCurrency(customer.ageingBuckets["91+"])}
                        </span>
                      ) : (
                        "---"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                {(() => {
                  const cs = data.customers || [];
                  return (
                    <TableRow>
                      <TableCell className="font-bold">Total</TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        {formatCurrency(cs.reduce((s, c) => s + c.totalOutstanding, 0))}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        {formatCurrency(cs.reduce((s, c) => s + c.ageingBuckets["0-30"], 0))}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-yellow-600">
                        {formatCurrency(cs.reduce((s, c) => s + c.ageingBuckets["31-60"], 0))}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-orange-600">
                        {formatCurrency(cs.reduce((s, c) => s + c.ageingBuckets["61-90"], 0))}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-red-600">
                        {formatCurrency(cs.reduce((s, c) => s + c.ageingBuckets["91+"], 0))}
                      </TableCell>
                    </TableRow>
                  );
                })()}
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
