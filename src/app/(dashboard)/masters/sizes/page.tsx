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
import { Plus, Pencil, Trash2, Search, Calculator } from "lucide-react";
import { toast } from "sonner";
import { calculateWeightPerMeter } from "@/lib/weight-calculation";

type PipeType = "CS_AS" | "SS_DS";

interface SizeEntry {
  id: string;
  sizeLabel: string;
  od: number;
  wt: number;
  weight: number;
  pipeType: PipeType;
}

interface SizeFormData {
  sizeLabel: string;
  od: string;
  wt: string;
  weight: string;
  pipeType: PipeType;
}

export default function SizesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<PipeType>("CS_AS");
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSize, setEditingSize] = useState<SizeEntry | null>(null);
  const [formData, setFormData] = useState<SizeFormData>({
    sizeLabel: "",
    od: "",
    wt: "",
    weight: "",
    pipeType: "CS_AS",
  });

  // Fetch sizes
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

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: SizeFormData) => {
      const res = await fetch("/api/masters/sizes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create size");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sizes"] });
      toast.success("Size created successfully");
      handleCloseDialog();
    },
    onError: () => {
      toast.error("Failed to create size");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SizeFormData }) => {
      const res = await fetch(`/api/masters/sizes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update size");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sizes"] });
      toast.success("Size updated successfully");
      handleCloseDialog();
    },
    onError: () => {
      toast.error("Failed to update size");
    },
  });

  // Delete mutation
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

  const autoCalcWeight = (od: string, wt: string, pipeType: PipeType) => {
    const odVal = parseFloat(od);
    const wtVal = parseFloat(wt);
    if (odVal && wtVal) {
      const w = calculateWeightPerMeter(odVal, wtVal, pipeType);
      if (w !== null) return w.toString();
    }
    return "";
  };

  const handleOpenDialog = (size?: SizeEntry) => {
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
            <TabsTrigger value="CS_AS">CS & AS Pipes (191)</TabsTrigger>
            <TabsTrigger value="SS_DS">SS & DS Pipes (80)</TabsTrigger>
          </TabsList>
          <Button onClick={() => handleOpenDialog()}>
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
            onEdit={handleOpenDialog}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="SS_DS" className="space-y-4">
          <SizeTable
            sizes={data?.sizes || []}
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
                {editingSize ? "Edit" : "Add"} Size
              </DialogTitle>
              <DialogDescription>
                {editingSize ? "Update" : "Create"} a size specification
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

              <div className="grid gap-2">
                <Label htmlFor="pipeType">Pipe Type *</Label>
                <Select
                  value={formData.pipeType}
                  onValueChange={(value: PipeType) => {
                    const weight = autoCalcWeight(formData.od, formData.wt, value);
                    setFormData({ ...formData, pipeType: value, weight: weight || formData.weight });
                  }}
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

              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="od">OD (mm) *</Label>
                  <Input
                    id="od"
                    type="number"
                    step="0.001"
                    value={formData.od}
                    onChange={(e) => {
                      const od = e.target.value;
                      const weight = autoCalcWeight(od, formData.wt, formData.pipeType);
                      setFormData({ ...formData, od, weight: weight || formData.weight });
                    }}
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
                    onChange={(e) => {
                      const wt = e.target.value;
                      const weight = autoCalcWeight(formData.od, wt, formData.pipeType);
                      setFormData({ ...formData, wt, weight: weight || formData.weight });
                    }}
                    placeholder="2.77"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="weight" className="flex items-center gap-1.5">
                    Weight (Kg/Meter) *
                    <Calculator className="h-3 w-3 text-muted-foreground" />
                  </Label>
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
                  <p className="text-xs text-muted-foreground">
                    Auto-calculated from OD & WT. Editable for override.
                  </p>
                </div>
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
  sizes: SizeEntry[];
  isLoading: boolean;
  onEdit: (size: SizeEntry) => void;
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
