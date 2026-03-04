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

const TAB_TYPES = ["All", "Weld Neck", "Slip On", "Blind", "Socket Weld", "Others"] as const;

interface Flange {
  id: string;
  type: string;
  size: string;
  rating: string;
  materialGrade: string;
  standard: string | null;
  facing: string | null;
  schedule: string | null;
  description: string | null;
  isActive: boolean;
}

export default function FlangesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");

  const typeFilter = activeTab === "All" ? undefined
    : activeTab === "Others" ? undefined
    : activeTab;

  const { data, isLoading } = useQuery({
    queryKey: ["flanges", activeTab, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (typeFilter) params.set("type", typeFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/masters/flanges?${params}`);
      if (!res.ok) throw new Error("Failed to fetch flanges");
      return res.json();
    },
  });

  const flanges: Flange[] = (data?.flanges || []).filter((f: Flange) => {
    if (activeTab === "Others") {
      return !["Weld Neck", "Slip On", "Blind", "Socket Weld"].includes(f.type);
    }
    return true;
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/masters/flanges/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete flange");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flanges"] });
      toast.success("Flange deleted successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this flange?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Flange Master"
        description="Manage flanges: weld neck, slip on, blind, socket weld, lap joint, threaded"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            {TAB_TYPES.map((tab) => (
              <TabsTrigger key={tab} value={tab}>{tab}</TabsTrigger>
            ))}
          </TabsList>
          <Button onClick={() => router.push("/masters/flanges/create")}>
            <Plus className="h-4 w-4 mr-2" />
            Add Flange
          </Button>
        </div>

        <div className="my-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by type, size, rating, material..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {TAB_TYPES.map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            <FlangeTable
              flanges={flanges}
              isLoading={isLoading}
              onEdit={(id) => router.push(`/masters/flanges/${id}/edit`)}
              onDelete={handleDelete}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function FlangeTable({
  flanges,
  isLoading,
  onEdit,
  onDelete,
}: {
  flanges: Flange[];
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
            <TableHead>Rating</TableHead>
            <TableHead>Facing</TableHead>
            <TableHead>Material Grade</TableHead>
            <TableHead>Standard</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                Loading flanges...
              </TableCell>
            </TableRow>
          ) : flanges.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No flanges found
              </TableCell>
            </TableRow>
          ) : (
            flanges.map((flange) => (
              <TableRow key={flange.id}>
                <TableCell className="font-medium">{flange.type}</TableCell>
                <TableCell>{flange.size}</TableCell>
                <TableCell>{flange.rating}#</TableCell>
                <TableCell>{flange.facing || "-"}</TableCell>
                <TableCell>{flange.materialGrade}</TableCell>
                <TableCell>{flange.standard || "-"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(flange.id)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(flange.id)}>
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
