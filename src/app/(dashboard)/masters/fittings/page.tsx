"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

const FITTING_TYPES = ["Elbow", "Tee", "Reducer", "Cap", "Coupling", "Union", "Nipple", "Bush"];
const END_TYPES = ["BW", "SW", "Threaded"];
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

interface FittingFormData {
  type: string;
  size: string;
  schedule: string;
  materialGrade: string;
  standard: string;
  endType: string;
  rating: string;
  description: string;
}

const emptyForm: FittingFormData = {
  type: "Elbow",
  size: "",
  schedule: "",
  materialGrade: "",
  standard: "",
  endType: "",
  rating: "",
  description: "",
};

export default function FittingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFitting, setEditingFitting] = useState<Fitting | null>(null);
  const [formData, setFormData] = useState<FittingFormData>(emptyForm);

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

  const createMutation = useMutation({
    mutationFn: async (data: FittingFormData) => {
      const res = await fetch("/api/masters/fittings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create fitting");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fittings"] });
      toast.success("Fitting created successfully");
      handleCloseDialog();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FittingFormData }) => {
      const res = await fetch(`/api/masters/fittings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update fitting");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fittings"] });
      toast.success("Fitting updated successfully");
      handleCloseDialog();
    },
    onError: (err: Error) => toast.error(err.message),
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

  const handleOpenDialog = (fitting?: Fitting) => {
    if (fitting) {
      setEditingFitting(fitting);
      setFormData({
        type: fitting.type,
        size: fitting.size,
        schedule: fitting.schedule || "",
        materialGrade: fitting.materialGrade,
        standard: fitting.standard || "",
        endType: fitting.endType || "",
        rating: fitting.rating || "",
        description: fitting.description || "",
      });
    } else {
      setEditingFitting(null);
      setFormData({ ...emptyForm });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingFitting(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingFitting) {
      updateMutation.mutate({ id: editingFitting.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this fitting?")) {
      deleteMutation.mutate(id);
    }
  };

  const showRating = formData.endType === "SW" || formData.endType === "Threaded";

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
          <Button onClick={() => handleOpenDialog()}>
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
              onEdit={handleOpenDialog}
              onDelete={handleDelete}
            />
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingFitting ? "Edit" : "Add"} Fitting</DialogTitle>
              <DialogDescription>
                {editingFitting ? "Update" : "Create"} a fitting specification
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) => setFormData({ ...formData, type: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FITTING_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Size (NPS) *</Label>
                  <Input
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    placeholder='e.g. 1/2", 2", 4"'
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Schedule</Label>
                  <Input
                    value={formData.schedule}
                    onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                    placeholder="e.g. 40, 80, 160, XXS"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>End Type</Label>
                  <Select
                    value={formData.endType || "none"}
                    onValueChange={(v) => setFormData({ ...formData, endType: v === "none" ? "" : v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">--</SelectItem>
                      {END_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {showRating && (
                <div className="grid gap-2">
                  <Label>Rating</Label>
                  <Input
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                    placeholder="e.g. 2000#, 3000#, 6000#"
                  />
                </div>
              )}

              <div className="grid gap-2">
                <Label>Material Grade *</Label>
                <Input
                  value={formData.materialGrade}
                  onChange={(e) => setFormData({ ...formData, materialGrade: e.target.value })}
                  placeholder="e.g. ASTM A234 WPB, ASTM A403 WP304"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label>Standard</Label>
                <Input
                  value={formData.standard}
                  onChange={(e) => setFormData({ ...formData, standard: e.target.value })}
                  placeholder="e.g. ASME B16.9, ASME B16.11"
                />
              </div>

              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Auto-generated if left blank"
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingFitting ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
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
  onEdit: (fitting: Fitting) => void;
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
                    <Button variant="ghost" size="icon" onClick={() => onEdit(fitting)}>
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
