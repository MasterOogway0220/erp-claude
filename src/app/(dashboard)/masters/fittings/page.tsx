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

const TAB_TYPES = ["All", "Elbow", "Tee", "Reducer", "Cap", "Others"] as const;

interface Fitting {
  id: string;
  type: string;
  size: string;
  schedule: string | null;
  materialGrade: string;
  standard: string | null;
  endType: string | null;
  rating: string | null;
  description: string | null;
  isActive: boolean;
}

export default function FittingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");

  const typeFilter = activeTab === "All" ? undefined
    : activeTab === "Others" ? undefined
    : activeTab;

  const { data, isLoading } = useQuery({
    queryKey: ["fittings", activeTab, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (typeFilter) params.set("type", typeFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/masters/fittings?${params}`);
      if (!res.ok) throw new Error("Failed to fetch fittings");
      return res.json();
    },
  });

  const fittings: Fitting[] = (data?.fittings || []).filter((f: Fitting) => {
    if (activeTab === "Others") {
      return !["Elbow", "Tee", "Reducer", "Cap"].includes(f.type);
    }
    return true;
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/masters/fittings/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete fitting");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fittings"] });
      toast.success("Fitting deleted successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this fitting?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fitting Master"
        description="Manage fittings: elbows, tees, reducers, caps, couplings, etc."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            {TAB_TYPES.map((tab) => (
              <TabsTrigger key={tab} value={tab}>{tab}</TabsTrigger>
            ))}
          </TabsList>
          <Button onClick={() => router.push("/masters/fittings/create")}>
            <Plus className="h-4 w-4 mr-2" />
            Add Fitting
          </Button>
        </div>

        <div className="my-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by type, size, material, standard..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {TAB_TYPES.map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            <FittingTable
              fittings={fittings}
              isLoading={isLoading}
              onEdit={(id) => router.push(`/masters/fittings/${id}/edit`)}
              onDelete={handleDelete}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function FittingTable({
  fittings,
  isLoading,
  onEdit,
  onDelete,
}: {
  fittings: Fitting[];
  isLoading: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Sch</TableHead>
            <TableHead>End Type</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>Material Grade</TableHead>
            <TableHead>Standard</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                Loading fittings...
              </TableCell>
            </TableRow>
          ) : fittings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                No fittings found
              </TableCell>
            </TableRow>
          ) : (
            fittings.map((fitting) => (
              <TableRow key={fitting.id}>
                <TableCell className="font-medium">{fitting.type}</TableCell>
                <TableCell>{fitting.size}</TableCell>
                <TableCell>{fitting.schedule || "-"}</TableCell>
                <TableCell>{fitting.endType || "-"}</TableCell>
                <TableCell>{fitting.rating || "-"}</TableCell>
                <TableCell>{fitting.materialGrade}</TableCell>
                <TableCell>{fitting.standard || "-"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(fitting.id)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(fitting.id)}>
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
