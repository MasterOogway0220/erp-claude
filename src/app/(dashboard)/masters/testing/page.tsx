"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";

interface TestingMaster {
  id: string;
  testName: string;
  applicableFor: string | null;
  isMandatory: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function TestingMasterPage() {
  const [search, setSearch] = useState("");

  // Fetch testing masters
  const { data, isLoading } = useQuery({
    queryKey: ["testing-masters", search],
    queryFn: async () => {
      const res = await fetch(`/api/masters/testing`);
      if (!res.ok) throw new Error("Failed to fetch testing masters");
      return res.json();
    },
  });

  const testingMasters: TestingMaster[] = data?.tests || [];

  // Filter locally
  const filteredTests = testingMasters.filter((test) =>
    test.testName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Testing Types"
        description="Testing types available for lab letters and quality control"
      />

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search testing types..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredTests.length} test{filteredTests.length !== 1 ? "s" : ""} found
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead>Test Name</TableHead>
              <TableHead>Applicable For</TableHead>
              <TableHead className="w-[120px]">Mandatory</TableHead>
              <TableHead className="w-[150px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Loading testing masters...
                </TableCell>
              </TableRow>
            ) : filteredTests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  {search
                    ? `No testing types found matching "${search}"`
                    : "No testing masters found"}
                </TableCell>
              </TableRow>
            ) : (
              filteredTests.map((test, index) => (
                <TableRow key={test.id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell className="font-medium">{test.testName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {test.applicableFor || "ALL"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {test.isMandatory ? (
                      <Badge variant="destructive">Required</Badge>
                    ) : (
                      <Badge variant="secondary">Optional</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="default" className="bg-green-500">
                      Active
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Info Card */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <h3 className="font-semibold mb-2">About Testing Master</h3>
        <p className="text-sm text-muted-foreground">
          Testing types are used in Lab Letters to specify which tests need to be performed
          on materials. These test types are automatically loaded from the master data during
          system setup and are available for selection when creating lab letters.
        </p>
        <div className="mt-3 text-sm">
          <strong>Total Tests:</strong> {testingMasters.length} types
        </div>
      </div>
    </div>
  );
}
