"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface LengthEntry {
  id: string;
  label: string;
}

export default function LengthsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["lengths", search],
    queryFn: async () => {
      const params = new URLSearchParams({ search });
      const res = await fetch(`/api/masters/lengths?${params}`);
      if (!res.ok) throw new Error("Failed to fetch lengths");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/masters/lengths/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete length");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lengths"] });
      toast.success("Length deleted successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this length?")) {
      deleteMutation.mutate(id);
    }
  };

  const lengths: LengthEntry[] = data?.lengths || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Length Master"
        description="Manage standard pipe length options"
      />

      {/* Search and Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search lengths..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => router.push("/masters/lengths/create")}>
          <Plus className="h-4 w-4 mr-2" />
          Add Length
        </Button>
      </div>

      {/* Data Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                  Loading lengths...
                </TableCell>
              </TableRow>
            ) : lengths.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                  No lengths found
                </TableCell>
              </TableRow>
            ) : (
              lengths.map((length) => (
                <TableRow key={length.id}>
                  <TableCell className="font-medium">{length.label}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/masters/lengths/${length.id}/edit`)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(length.id)}
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
    </div>
  );
}
