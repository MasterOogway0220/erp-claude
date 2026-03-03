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

const FLANGE_TYPES = ["Weld Neck", "Slip On", "Blind", "Socket Weld", "Lap Joint", "Threaded"];
const FLANGE_RATINGS = ["150", "300", "600", "900", "1500", "2500"];
const FLANGE_FACINGS = ["RF", "FF", "RTJ"];
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

interface FlangeFormData {
  type: string;
  size: string;
  rating: string;
  materialGrade: string;
  standard: string;
  facing: string;
  schedule: string;
  description: string;
}

const emptyForm: FlangeFormData = {
  type: "Weld Neck",
  size: "",
  rating: "150",
  materialGrade: "",
  standard: "",
  facing: "",
  schedule: "",
  description: "",
};

export default function FlangesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFlange, setEditingFlange] = useState<Flange | null>(null);
  const [formData, setFormData] = useState<FlangeFormData>(emptyForm);

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

  const createMutation = useMutation({
    mutationFn: async (data: FlangeFormData) => {
      const res = await fetch("/api/masters/flanges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create flange");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flanges"] });
      toast.success("Flange created successfully");
      handleCloseDialog();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FlangeFormData }) => {
      const res = await fetch(`/api/masters/flanges/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update flange");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flanges"] });
      toast.success("Flange updated successfully");
      handleCloseDialog();
    },
    onError: (err: Error) => toast.error(err.message),
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

  const handleOpenDialog = (flange?: Flange) => {
    if (flange) {
      setEditingFlange(flange);
      setFormData({
        type: flange.type,
        size: flange.size,
        rating: flange.rating,
        materialGrade: flange.materialGrade,
        standard: flange.standard || "",
        facing: flange.facing || "",
        schedule: flange.schedule || "",
        description: flange.description || "",
      });
    } else {
      setEditingFlange(null);
      setFormData({ ...emptyForm });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingFlange(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingFlange) {
      updateMutation.mutate({ id: editingFlange.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

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
          <Button onClick={() => handleOpenDialog()}>
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
              <DialogTitle>{editingFlange ? "Edit" : "Add"} Flange</DialogTitle>
              <DialogDescription>
                {editingFlange ? "Update" : "Create"} a flange specification
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
                      {FLANGE_TYPES.map((t) => (
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
                  <Label>Rating *</Label>
                  <Select
                    value={formData.rating}
                    onValueChange={(v) => setFormData({ ...formData, rating: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FLANGE_RATINGS.map((r) => (
                        <SelectItem key={r} value={r}>{r}#</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Facing</Label>
                  <Select
                    value={formData.facing || "none"}
                    onValueChange={(v) => setFormData({ ...formData, facing: v === "none" ? "" : v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">--</SelectItem>
                      {FLANGE_FACINGS.map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Material Grade *</Label>
                <Input
                  value={formData.materialGrade}
                  onChange={(e) => setFormData({ ...formData, materialGrade: e.target.value })}
                  placeholder="e.g. ASTM A105, ASTM A182 F304"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Standard</Label>
                  <Input
                    value={formData.standard}
                    onChange={(e) => setFormData({ ...formData, standard: e.target.value })}
                    placeholder="e.g. ASME B16.5"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Schedule</Label>
                  <Input
                    value={formData.schedule}
                    onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                    placeholder="e.g. 40, 80"
                  />
                </div>
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
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingFlange ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
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
  onEdit: (flange: Flange) => void;
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
                    <Button variant="ghost" size="icon" onClick={() => onEdit(flange)}>
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
