"use client";

import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

type PipeType = "CS_AS" | "SS_DS";

interface PipeSize {
  id: string;
  sizeLabel: string;
  od: number;
  wt: number;
  weight: number;
  pipeType: PipeType;
}

interface PipeSizeFormData {
  sizeLabel: string;
  od: string;
  wt: string;
  weight: string;
  pipeType: PipeType;
}

export default function PipeSizesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<PipeType>("CS_AS");
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSize, setEditingSize] = useState<PipeSize | null>(null);
  const [formData, setFormData] = useState<PipeSizeFormData>({
    sizeLabel: "",
    od: "",
    wt: "",
    weight: "",
    pipeType: "CS_AS",
  });

  // Fetch pipe sizes
  const { data, isLoading } = useQuery({
    queryKey: ["pipeSizes", activeTab, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        pipeType: activeTab,
        search,
      });
      const res = await fetch(`/api/masters/pipe-sizes?${params}`);
      if (!res.ok) throw new Error("Failed to fetch pipe sizes");
      return res.json();
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: PipeSizeFormData) => {
      const res = await fetch("/api/masters/pipe-sizes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create pipe size");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeSizes"] });
      toast.success("Pipe size created successfully");
      handleCloseDialog();
    },
    onError: () => {
      toast.error("Failed to create pipe size");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PipeSizeFormData }) => {
      const res = await fetch(`/api/masters/pipe-sizes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update pipe size");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeSizes"] });
      toast.success("Pipe size updated successfully");
      handleCloseDialog();
    },
    onError: () => {
      toast.error("Failed to update pipe size");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/masters/pipe-sizes/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete pipe size");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeSizes"] });
      toast.success("Pipe size deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete pipe size");
    },
  });

  const handleOpenDialog = (size?: PipeSize) => {
    if (size) {
      setEditingSize(size);
      setFormData({
        sizeLabel: size.sizeLabel,
        od: size.od.toString(),
        wt: size.wt.toString(),
        weight: size.weight.toString(),
        pipeType: size.pipeType,
      });
    } else {
      setEditingSize(null);
      setFormData({
        sizeLabel: "",
        od: "",
        wt: "",
        weight: "",
        pipeType: activeTab,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSize(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSize) {
      updateMutation.mutate({ id: editingSize.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this pipe size?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipe Size Master"
        description="Manage pipe size specifications (271 total: 191 CS/AS + 80 SS/DS)"
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PipeType)}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="CS_AS">CS & AS Pipes (191)</TabsTrigger>
            <TabsTrigger value="SS_DS">SS & DS Pipes (80)</TabsTrigger>
          </TabsList>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Pipe Size
          </Button>
        </div>

        <div className="my-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by size..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <TabsContent value="CS_AS" className="space-y-4">
          <SizeTable
            sizes={data?.pipeSizes || []}
            isLoading={isLoading}
            onEdit={handleOpenDialog}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="SS_DS" className="space-y-4">
          <SizeTable
            sizes={data?.pipeSizes || []}
            isLoading={isLoading}
            onEdit={handleOpenDialog}
            onDelete={handleDelete}
          />
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingSize ? "Edit" : "Add"} Pipe Size
              </DialogTitle>
              <DialogDescription>
                {editingSize ? "Update" : "Create"} a pipe size specification
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="sizeLabel">Size Label *</Label>
                <Input
                  id="sizeLabel"
                  value={formData.sizeLabel}
                  onChange={(e) =>
                    setFormData({ ...formData, sizeLabel: e.target.value })
                  }
                  placeholder='e.g., 1/2" NB X Sch 40'
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="od">OD (mm) *</Label>
                  <Input
                    id="od"
                    type="number"
                    step="0.001"
                    value={formData.od}
                    onChange={(e) =>
                      setFormData({ ...formData, od: e.target.value })
                    }
                    placeholder="21.3"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="wt">WT (mm) *</Label>
                  <Input
                    id="wt"
                    type="number"
                    step="0.001"
                    value={formData.wt}
                    onChange={(e) =>
                      setFormData({ ...formData, wt: e.target.value })
                    }
                    placeholder="2.77"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="weight">Weight (kg/m) *</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.0001"
                    value={formData.weight}
                    onChange={(e) =>
                      setFormData({ ...formData, weight: e.target.value })
                    }
                    placeholder="1.266"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="pipeType">Pipe Type *</Label>
                <Select
                  value={formData.pipeType}
                  onValueChange={(value: PipeType) =>
                    setFormData({ ...formData, pipeType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CS_AS">CS & AS Pipes</SelectItem>
                    <SelectItem value="SS_DS">SS & DS Pipes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : editingSize
                  ? "Update"
                  : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SizeTable({
  sizes,
  isLoading,
  onEdit,
  onDelete,
}: {
  sizes: PipeSize[];
  isLoading: boolean;
  onEdit: (size: PipeSize) => void;
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
                Loading pipe sizes...
              </TableCell>
            </TableRow>
          ) : sizes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                No pipe sizes found
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
                      onClick={() => onEdit(size)}
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
