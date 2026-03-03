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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SmartCombobox } from "@/components/shared/smart-combobox";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

const PRODUCT_CATEGORIES = [
  { value: "PIPES", label: "Pipes" },
  { value: "FITTINGS", label: "Fittings" },
  { value: "FLANGES", label: "Flanges" },
  { value: "VALVES", label: "Valves" },
  { value: "NUT_BOLT", label: "Nut Bolt" },
  { value: "GASKETS", label: "Gaskets" },
];

interface DimensionalStandard {
  id: string;
  name: string;
  code: string;
}

interface LengthOption {
  id: string;
  label: string;
}

interface ProductSpec {
  id: string;
  product: string;
  category: string | null;
  specification: string | null;
  grade: string | null;
  material: string | null;
  additionalSpec: string | null;
  ends: string | null;
  length: string | null;
  dimensionalStandardId: string | null;
  dimensionalStandard: DimensionalStandard | null;
}

interface ProductFormData {
  product: string;
  category: string;
  specification: string;
  grade: string;
  material: string;
  additionalSpec: string;
  ends: string;
  length: string;
  dimensionalStandardId: string;
}

const emptyForm: ProductFormData = {
  product: "",
  category: "",
  specification: "",
  grade: "",
  material: "",
  additionalSpec: "",
  ends: "",
  length: "",
  dimensionalStandardId: "",
};

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductSpec | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(emptyForm);
  const [dimStdSearch, setDimStdSearch] = useState("");
  const [lengthSearch, setLengthSearch] = useState("");

  // Fetch products
  const { data, isLoading } = useQuery({
    queryKey: ["products", search, categoryFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        search,
        page: page.toString(),
        limit: "50",
      });
      if (categoryFilter) params.set("category", categoryFilter);
      const res = await fetch(`/api/masters/products?${params}`);
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  // Fetch dimensional standards
  const { data: dimStdData } = useQuery({
    queryKey: ["dimensional-standards"],
    queryFn: async () => {
      const res = await fetch("/api/masters/dimensional-standards");
      if (!res.ok) throw new Error("Failed to fetch dimensional standards");
      return res.json();
    },
  });

  // Fetch lengths
  const { data: lengthsData } = useQuery({
    queryKey: ["lengths"],
    queryFn: async () => {
      const res = await fetch("/api/masters/lengths");
      if (!res.ok) throw new Error("Failed to fetch lengths");
      return res.json();
    },
  });

  const dimensionalStandards: DimensionalStandard[] = dimStdData?.dimensionalStandards || [];
  const lengths: LengthOption[] = lengthsData?.lengths || [];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const res = await fetch("/api/masters/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create product");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product specification created successfully");
      handleCloseDialog();
    },
    onError: (err: Error) => {
      toast.error(err.message);
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
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update product");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product specification updated successfully");
      handleCloseDialog();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/masters/products/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete product");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product specification deleted successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Add length inline
  const addLengthMutation = useMutation({
    mutationFn: async (label: string) => {
      const res = await fetch("/api/masters/lengths", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add length");
      }
      return res.json();
    },
    onSuccess: (newLength) => {
      queryClient.invalidateQueries({ queryKey: ["lengths"] });
      setFormData({ ...formData, length: newLength.label });
      setLengthSearch("");
      toast.success("Length added");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleOpenDialog = (product?: ProductSpec) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        product: product.product,
        category: product.category || "",
        specification: product.specification || "",
        grade: product.grade || "",
        material: product.material || "",
        additionalSpec: product.additionalSpec || "",
        ends: product.ends || "",
        length: product.length || "",
        dimensionalStandardId: product.dimensionalStandardId || "",
      });
      setDimStdSearch(product.dimensionalStandard?.name || "");
    } else {
      setEditingProduct(null);
      setFormData(emptyForm);
      setDimStdSearch("");
    }
    setLengthSearch("");
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
    setFormData(emptyForm);
    setDimStdSearch("");
    setLengthSearch("");
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

  const getCategoryLabel = (val: string | null) =>
    PRODUCT_CATEGORIES.find((c) => c.value === val)?.label || val || "—";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Specifications"
        description="Manage product specification master data"
      />

      {/* Search, Filter, and Actions */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by product, material, spec, grade..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v === "ALL" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {PRODUCT_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => handleOpenDialog()} className="ml-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Product Spec
        </Button>
      </div>

      {/* Data Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Specification</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Material</TableHead>
              <TableHead>Dim. Standard</TableHead>
              <TableHead>Additional Spec</TableHead>
              <TableHead>Ends</TableHead>
              <TableHead>Length</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Loading products...
                </TableCell>
              </TableRow>
            ) : data?.products?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              data?.products?.map((product: ProductSpec) => (
                <TableRow key={product.id}>
                  <TableCell>
                    {product.category ? (
                      <Badge variant="secondary" className="text-xs">
                        {getCategoryLabel(product.category)}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{product.product}</TableCell>
                  <TableCell>{product.specification || "—"}</TableCell>
                  <TableCell>{product.grade || "—"}</TableCell>
                  <TableCell className="max-w-[150px] truncate">{product.material || "—"}</TableCell>
                  <TableCell>{product.dimensionalStandard?.name || "—"}</TableCell>
                  <TableCell className="max-w-[120px] truncate">
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
              {/* Category */}
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category || "NONE"}
                  onValueChange={(v) =>
                    setFormData({ ...formData, category: v === "NONE" ? "" : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">— None —</SelectItem>
                    {PRODUCT_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Product */}
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

              {/* Specification & Grade */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="specification">Specification</Label>
                  <Input
                    id="specification"
                    value={formData.specification}
                    onChange={(e) =>
                      setFormData({ ...formData, specification: e.target.value })
                    }
                    placeholder="e.g., ASTM A106"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="grade">Grade</Label>
                  <Input
                    id="grade"
                    value={formData.grade}
                    onChange={(e) =>
                      setFormData({ ...formData, grade: e.target.value })
                    }
                    placeholder="e.g., Gr. B"
                  />
                </div>
              </div>

              {/* Material */}
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

              {/* Dimensional Standard */}
              <div className="grid gap-2">
                <Label>Dimensional Standard</Label>
                <SmartCombobox
                  options={dimensionalStandards}
                  value={dimStdSearch}
                  onSelect={(std) => {
                    setFormData({ ...formData, dimensionalStandardId: std.id });
                    setDimStdSearch(std.name);
                  }}
                  onChange={(text) => {
                    setDimStdSearch(text);
                    if (!text) setFormData({ ...formData, dimensionalStandardId: "" });
                  }}
                  displayFn={(std) => `${std.name} (${std.code})`}
                  filterFn={(std, query) => {
                    const q = query.toLowerCase();
                    return (
                      std.name.toLowerCase().includes(q) ||
                      std.code.toLowerCase().includes(q)
                    );
                  }}
                  placeholder="Search dimensional standard..."
                />
              </div>

              {/* Additional Spec */}
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

              {/* Ends & Length */}
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
                  <Label>Length</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <SmartCombobox
                        options={lengths}
                        value={formData.length || lengthSearch}
                        onSelect={(len) => {
                          setFormData({ ...formData, length: len.label });
                          setLengthSearch("");
                        }}
                        onChange={(text) => {
                          setFormData({ ...formData, length: text });
                          setLengthSearch(text);
                        }}
                        displayFn={(len) => len.label}
                        filterFn={(len, query) =>
                          len.label.toLowerCase().includes(query.toLowerCase())
                        }
                        placeholder="Search or type length..."
                      />
                    </div>
                    {lengthSearch &&
                      !lengths.some(
                        (l) => l.label.toLowerCase() === lengthSearch.toLowerCase()
                      ) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => addLengthMutation.mutate(lengthSearch)}
                          disabled={addLengthMutation.isPending}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      )}
                  </div>
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
