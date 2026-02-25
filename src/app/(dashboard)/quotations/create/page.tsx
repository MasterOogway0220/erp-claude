"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, PenLine } from "lucide-react";

export default function CreateQuotationPage() {
  const router = useRouter();

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title="Create Quotation"
          description="Select the type of quotation you want to create"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Standard Quotation Card */}
        <Card
          className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/50 hover:-translate-y-1 group"
          onClick={() => router.push("/quotations/create/standard")}
        >
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Standard Quotation</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground leading-relaxed">
              For Pipes, Fittings, Flanges — items from masters with NPS,
              Schedule, OD, WT auto-fill
            </p>
            <Button variant="outline" className="mt-6 w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              Create Standard Quotation
            </Button>
          </CardContent>
        </Card>

        {/* Non-Standard Quotation Card */}
        <Card
          className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/50 hover:-translate-y-1 group"
          onClick={() => router.push("/quotations/create/nonstandard")}
        >
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors">
              <PenLine className="h-8 w-8 text-orange-500" />
            </div>
            <CardTitle className="text-xl">Non-Standard Quotation</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground leading-relaxed">
              For all other items — free-text item description with structured
              fields
            </p>
            <Button variant="outline" className="mt-6 w-full group-hover:bg-orange-500 group-hover:text-white transition-colors">
              Create Non-Standard Quotation
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
