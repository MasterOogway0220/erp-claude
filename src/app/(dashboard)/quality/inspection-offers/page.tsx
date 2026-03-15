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

interface InspectionOfferRow {
  id: string;
  offerNo: string;
  offerDate: string;
  poNumber: string | null;
  proposedInspectionDate: string | null;
  inspectionLocation: string | null;
  status: string;
  customer: { name: string; city: string | null };
  tpiAgency: { name: string } | null;
  items: any[];
}

export default function InspectionOffersListPage() {
  const router = useRouter();
  const [offers, setOffers] = useState<InspectionOfferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchOffers();
  }, [search]);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/quality/inspection-offers?${params}`);
      if (res.ok) {
        const data = await res.json();
        setOffers(data.offers || []);
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
        title="Inspection Offers"
        description="Generate inspection offer letters and related documents"
      >
        <Button onClick={() => router.push("/quality/inspection-offers/create")}>
          <Plus className="w-4 h-4 mr-2" />
          New Inspection Offer
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by offer no, PO number, client..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <PageLoading />
          ) : offers.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              No inspection offers found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Offer No.</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Proposed Date</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>TPI Agency</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offers.map((offer) => (
                    <TableRow key={offer.id}>
                      <TableCell className="font-medium">{offer.offerNo}</TableCell>
                      <TableCell>
                        {offer.customer.name}
                        {offer.customer.city && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({offer.customer.city})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{offer.poNumber || "-"}</TableCell>
                      <TableCell>
                        {offer.proposedInspectionDate
                          ? format(new Date(offer.proposedInspectionDate), "dd/MM/yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell>{offer.inspectionLocation || "-"}</TableCell>
                      <TableCell>{offer.tpiAgency?.name || "-"}</TableCell>
                      <TableCell>{offer.items.length}</TableCell>
                      <TableCell>
                        <Badge variant={offer.status === "DRAFT" ? "secondary" : "default"}>
                          {offer.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/quality/inspection-offers/${offer.id}`)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
