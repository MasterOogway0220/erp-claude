"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

type PipeType = "CS_AS" | "SS_DS";

interface SizeEntry {
  id: string;
  sizeLabel: string;
  od: number;
  wt: number;
  weight: number;
  pipeType: PipeType;
}

export default function SizesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<PipeType>("CS_AS");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["sizes", activeTab, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        pipeType: activeTab,
        search,
      });
      const res = await fetch(`/api/masters/sizes?${params}`);
      if (!res.ok) throw new Error("Failed to fetch sizes");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/masters/sizes/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete size");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sizes"] });
      toast.success("Size deleted successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this size?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Size Master"
        description="Manage size specifications (271 total: 191 CS/AS + 80 SS/DS)"
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PipeType)}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="CS_AS">CS &amp; AS Pipes (191)</TabsTrigger>
            <TabsTrigger value="SS_DS">SS &amp; DS Pipes (80)</TabsTrigger>
          </TabsList>
          <Button onClick={() => router.push("/masters/sizes/create")}>
            <Plus className="h-4 w-4 mr-2" />
            Add Size
          </Button>
        </div>

        <div className="my-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by size, OD, WT, weight..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <TabsContent value="CS_AS" className="space-y-4">
          <SizeTable
            sizes={data?.sizes || []}
            isLoading={isLoading}
            onEdit={(id) => router.push(`/masters/sizes/${id}/edit`)}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="SS_DS" className="space-y-4">
          <SizeTable
            sizes={data?.sizes || []}
            isLoading={isLoading}
            onEdit={(id) => router.push(`/masters/sizes/${id}/edit`)}
            onDelete={handleDelete}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SizeTable({
  sizes,
  isLoading,
  onEdit,
  onDelete,
}: {
  sizes: SizeEntry[];
  isLoading: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Size</TableHead>
            <TableHead className="text-right">OD (mm)</TableHead>
            <TableHead className="text-right">WT (mm)</TableHead>
            <TableHead className="text-right">Weight (kg/m)</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                Loading sizes...
              </TableCell>
            </TableRow>
          ) : sizes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                No sizes found
              </TableCell>
            </TableRow>
          ) : (
            sizes.map((size) => (
              <TableRow key={size.id}>
                <TableCell className="font-medium">{size.sizeLabel}</TableCell>
                <TableCell className="text-right">{size.od}</TableCell>
                <TableCell className="text-right">{size.wt}</TableCell>
                <TableCell className="text-right">{size.weight}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(size.id)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(size.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
