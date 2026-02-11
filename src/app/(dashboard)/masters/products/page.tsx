"use client";

import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

interface ProductSpec {
  id: string;
  product: string;
  material: string | null;
  additionalSpec: string | null;
  ends: string | null;
  length: string | null;
}

interface ProductFormData {
  product: string;
  material: string;
  additionalSpec: string;
  ends: string;
  length: string;
}

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductSpec | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    product: "",
    material: "",
    additionalSpec: "",
    ends: "",
    length: "",
  });

  // Fetch products
  const { data, isLoading } = useQuery({
    queryKey: ["products", search, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        search,
        page: page.toString(),
        limit: "50",
      });
      const res = await fetch(`/api/masters/products?${params}`);
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const res = await fetch("/api/masters/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create product");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product specification created successfully");
      handleCloseDialog();
    },
    onError: () => {
      toast.error("Failed to create product specification");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProductFormData }) => {
      const res = await fetch(`/api/masters/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update product");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product specification updated successfully");
      handleCloseDialog();
    },
    onError: () => {
      toast.error("Failed to update product specification");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/masters/products/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete product");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product specification deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete product specification");
    },
  });

  const handleOpenDialog = (product?: ProductSpec) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        product: product.product,
        material: product.material || "",
        additionalSpec: product.additionalSpec || "",
        ends: product.ends || "",
        length: product.length || "",
      });
    } else {
      setEditingProduct(null);
      setFormData({
        product: "",
        material: "",
        additionalSpec: "",
        ends: "",
        length: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
    setFormData({
      product: "",
      material: "",
      additionalSpec: "",
      ends: "",
      length: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this product specification?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Specifications"
        description="Manage product specification master data (234 records seeded)"
      />

      {/* Search and Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by product, material, or spec..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Product Spec
        </Button>
      </div>

      {/* Data Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Material</TableHead>
              <TableHead>Additional Spec</TableHead>
              <TableHead>Ends</TableHead>
              <TableHead>Length</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Loading products...
                </TableCell>
              </TableRow>
            ) : data?.products?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              data?.products?.map((product: ProductSpec) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.product}</TableCell>
                  <TableCell>{product.material || "—"}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {product.additionalSpec || "—"}
                  </TableCell>
                  <TableCell>{product.ends || "—"}</TableCell>
                  <TableCell>{product.length || "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(product)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(product.id)}
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

        {/* Pagination */}
        {data?.pagination && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <div className="text-sm text-muted-foreground">
              Showing {Math.min((page - 1) * 50 + 1, data.pagination.total)} to{" "}
              {Math.min(page * 50, data.pagination.total)} of {data.pagination.total} products
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.pagination.pages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Edit" : "Add"} Product Specification
              </DialogTitle>
              <DialogDescription>
                {editingProduct ? "Update" : "Create"} a product specification entry
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="product">Product *</Label>
                <Input
                  id="product"
                  value={formData.product}
                  onChange={(e) =>
                    setFormData({ ...formData, product: e.target.value })
                  }
                  placeholder="e.g., C.S. SEAMLESS PIPE"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="material">Material</Label>
                <Textarea
                  id="material"
                  value={formData.material}
                  onChange={(e) =>
                    setFormData({ ...formData, material: e.target.value })
                  }
                  placeholder="e.g., ASTM A106/A53/API 5L GR. B"
                  rows={2}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="additionalSpec">Additional Specification</Label>
                <Input
                  id="additionalSpec"
                  value={formData.additionalSpec}
                  onChange={(e) =>
                    setFormData({ ...formData, additionalSpec: e.target.value })
                  }
                  placeholder="e.g., NACE MR0175, HIC, IBR"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="ends">Ends</Label>
                  <Input
                    id="ends"
                    value={formData.ends}
                    onChange={(e) =>
                      setFormData({ ...formData, ends: e.target.value })
                    }
                    placeholder="BE, PE, NPTM, BSPT"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="length">Length</Label>
                  <Input
                    id="length"
                    value={formData.length}
                    onChange={(e) =>
                      setFormData({ ...formData, length: e.target.value })
                    }
                    placeholder="e.g., 5.00-7.00 Mtr"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : editingProduct
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
