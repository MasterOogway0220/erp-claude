"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface TestingMaster {
  id: string;
  testName: string;
  applicableFor: string | null;
  isMandatory: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function TestingMasterPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<TestingMaster | null>(null);
  const [form, setForm] = useState({ testName: "", applicableFor: "", isMandatory: false });

  const { data, isLoading } = useQuery({
    queryKey: ["testing-masters"],
    queryFn: async () => {
      const res = await fetch(`/api/masters/testing`);
      if (!res.ok) throw new Error("Failed to fetch testing masters");
      return res.json();
    },
  });

  const testingMasters: TestingMaster[] = data?.tests || [];

  const filteredTests = testingMasters.filter((test) =>
    test.testName.toLowerCase().includes(search.toLowerCase()) ||
    (test.applicableFor || "").toLowerCase().includes(search.toLowerCase())
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.testName.trim()) throw new Error("Test name is required");
      const url = editingTest
        ? `/api/masters/testing/${editingTest.id}`
        : "/api/masters/testing";
      const method = editingTest ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testing-masters"] });
      toast.success(editingTest ? "Testing type updated" : "Testing type added");
      closeDialog();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/masters/testing/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testing-masters"] });
      toast.success("Testing type deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openCreate = () => {
    setEditingTest(null);
    setForm({ testName: "", applicableFor: "", isMandatory: false });
    setDialogOpen(true);
  };

  const openEdit = (test: TestingMaster) => {
    setEditingTest(test);
    setForm({
      testName: test.testName,
      applicableFor: test.applicableFor || "",
      isMandatory: test.isMandatory,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingTest(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Testing Types"
        description="Testing types available for lab letters and quality control"
      >
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Test Type
        </Button>
      </PageHeader>

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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead>Test Name</TableHead>
              <TableHead>Applicable For</TableHead>
              <TableHead className="w-[120px]">Mandatory</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
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
                    : "No testing types found. Click 'Add Test Type' to create one."}
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
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(test)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm(`Delete "${test.testName}"?`)) {
                            deleteMutation.mutate(test.id);
                          }
                        }}
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTest ? "Edit Testing Type" : "Add Testing Type"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Test Name *</Label>
              <Input
                value={form.testName}
                onChange={(e) => setForm({ ...form, testName: e.target.value })}
                placeholder="e.g., Visual Inspection, Hydrostatic Test"
              />
            </div>
            <div className="grid gap-2">
              <Label>Applicable For</Label>
              <Input
                value={form.applicableFor}
                onChange={(e) => setForm({ ...form, applicableFor: e.target.value })}
                placeholder="e.g., PIPES, FITTINGS, ALL"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isMandatory}
                onCheckedChange={(v) => setForm({ ...form, isMandatory: v })}
              />
              <Label>Mandatory Test</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : editingTest ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
