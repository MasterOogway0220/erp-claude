"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, Column } from "@/components/shared/data-table";
import { SmartCombobox } from "@/components/shared/smart-combobox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search, Download } from "lucide-react";
import { toast } from "sonner";

// ─── Top-level tabs ──────────────────────────────────────────────────────────
type MainTab = "pipes" | "sizes" | "lengths" | "fittings" | "flanges" | "units" | "material-codes" | "additional-specs";

const VALID_TABS: readonly MainTab[] = [
  "pipes", "sizes", "lengths", "fittings", "flanges", "units", "material-codes", "additional-specs",
];

export default function ProductMasterPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading...</div>}>
      <ProductMasterContent />
    </Suspense>
  );
}

function ProductMasterContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: MainTab = VALID_TABS.includes(tabParam as MainTab) ? (tabParam as MainTab) : "pipes";
  const [activeTab, setActiveTab] = useState<MainTab>(initialTab);

  useEffect(() => {
    if (VALID_TABS.includes(tabParam as MainTab) && tabParam !== activeTab) {
      setActiveTab(tabParam as MainTab);
    }
    // Only react to URL changes, not local state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam]);

  const handleTabChange = (v: string) => {
    const next = v as MainTab;
    setActiveTab(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "pipes") params.delete("tab");
    else params.set("tab", next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const tabLabel: Record<MainTab, string> = {
    pipes: "Product Specifications",
    sizes: "Size Master",
    lengths: "Length Master",
    fittings: "Fitting Master",
    flanges: "Flange Master",
    units: "Unit Master (UOM)",
    "material-codes": "Material Code Master",
    "additional-specs": "Additional Specifications",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Master"
        description={tabLabel[activeTab]}
      />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="pipes">Pipes</TabsTrigger>
          <TabsTrigger value="sizes">Sizes</TabsTrigger>
          <TabsTrigger value="lengths">Lengths</TabsTrigger>
          <TabsTrigger value="fittings">Fittings</TabsTrigger>
          <TabsTrigger value="flanges">Flanges</TabsTrigger>
          <TabsTrigger value="units">Units (UOM)</TabsTrigger>
          <TabsTrigger value="additional-specs">Additional Specs</TabsTrigger>
          <TabsTrigger value="material-codes">Material Codes</TabsTrigger>
        </TabsList>

        <TabsContent value="pipes" className="mt-4">
          <PipesPanel />
        </TabsContent>
        <TabsContent value="sizes" className="mt-4">
          <SizesPanel />
        </TabsContent>
        <TabsContent value="lengths" className="mt-4">
          <LengthsPanel />
        </TabsContent>
        <TabsContent value="fittings" className="mt-4">
          <FittingsPanel />
        </TabsContent>
        <TabsContent value="flanges" className="mt-4">
          <FlangesPanel />
        </TabsContent>
        <TabsContent value="units" className="mt-4">
          <UnitsPanel />
        </TabsContent>
        <TabsContent value="additional-specs" className="mt-4">
          <AdditionalSpecsPanel />
        </TabsContent>
        <TabsContent value="material-codes" className="mt-4">
          <MaterialCodesPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── PIPES (Product Specifications) ─────────────────────────────────────────

const PRODUCT_CATEGORIES = [
  { value: "PIPES", label: "Pipes" },
  { value: "FITTINGS", label: "Fittings" },
  { value: "FLANGES", label: "Flanges" },
  { value: "VALVES", label: "Valves" },
  { value: "NUT_BOLT", label: "Nut Bolt" },
  { value: "GASKETS", label: "Gaskets" },
];

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
  dimensionalStandard: { id: string; name: string; code: string } | null;
}

interface ProductFormData {
  product: string;
  category: string;
  specification: string;
  grade: string;
  material: string;
  dimensionalStandardId: string;
}

const emptyProductForm: ProductFormData = {
  product: "", category: "", specification: "", grade: "",
  material: "", dimensionalStandardId: "",
};

function PipesPanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductSpec | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(emptyProductForm);
  const [dimStdSearch, setDimStdSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["products", search, categoryFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ search, page: page.toString(), limit: "50" });
      if (categoryFilter) params.set("category", categoryFilter);
      const res = await fetch(`/api/masters/products?${params}`);
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  const { data: dimStdData } = useQuery({
    queryKey: ["dimensional-standards"],
    queryFn: async () => {
      const res = await fetch("/api/masters/dimensional-standards");
      if (!res.ok) throw new Error("Failed to fetch dimensional standards");
      return res.json();
    },
  });

  const dimensionalStandards = dimStdData?.dimensionalStandards || [];

  const createMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const res = await fetch("/api/masters/products", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed to create"); }
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["products"] }); toast.success("Product specification created"); closeDialog(); },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProductFormData }) => {
      const res = await fetch(`/api/masters/products/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed to update"); }
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["products"] }); toast.success("Product specification updated"); closeDialog(); },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/masters/products/${id}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed to delete"); }
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["products"] }); toast.success("Product specification deleted"); },
    onError: (err: Error) => toast.error(err.message),
  });

  const openDialog = (product?: ProductSpec) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        product: product.product, category: product.category || "",
        specification: product.specification || "", grade: product.grade || "",
        material: product.material || "",
        dimensionalStandardId: product.dimensionalStandardId || "",
      });
      setDimStdSearch(product.dimensionalStandard?.name || "");
    } else {
      setEditingProduct(null);
      setFormData(emptyProductForm);
      setDimStdSearch("");
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
    setFormData(emptyProductForm);
    setDimStdSearch("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) updateMutation.mutate({ id: editingProduct.id, data: formData });
    else createMutation.mutate(formData);
  };

  const getCategoryLabel = (val: string | null) =>
    PRODUCT_CATEGORIES.find((c) => c.value === val)?.label || val || "—";

  return (
    <div className="space-y-4">
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
        <Select value={categoryFilter || "ALL"} onValueChange={(v) => { setCategoryFilter(v === "ALL" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {PRODUCT_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              const products: ProductSpec[] = data?.products || [];
              if (!products.length) { toast.error("No products to export"); return; }
              const headers = ["Category", "Product", "Specification", "Grade", "Material", "Dim. Standard"];
              const rows = products.map((p) => [
                p.category || "", p.product, p.specification || "", p.grade || "",
                p.material || "", p.dimensionalStandard?.name || "",
              ]);
              const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))].join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "pipe-product-spec-chart.csv";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Download CSV
          </Button>
          <Button onClick={() => openDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product Spec
          </Button>
        </div>
      </div>

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
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading products...</TableCell></TableRow>
            ) : data?.products?.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No products found</TableCell></TableRow>
            ) : (
              data?.products?.map((p: ProductSpec) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {p.category ? <Badge variant="secondary" className="text-xs">{getCategoryLabel(p.category)}</Badge> : "—"}
                  </TableCell>
                  <TableCell className="font-medium">{p.product}</TableCell>
                  <TableCell>{p.specification || "—"}</TableCell>
                  <TableCell>{p.grade || "—"}</TableCell>
                  <TableCell className="max-w-[150px] truncate">{p.material || "—"}</TableCell>
                  <TableCell>{p.dimensionalStandard?.name || "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openDialog(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this product specification?")) deleteMutation.mutate(p.id); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {data?.pagination && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <div className="text-sm text-muted-foreground">
              Showing {Math.min((page - 1) * 50 + 1, data.pagination.total)} to {Math.min(page * 50, data.pagination.total)} of {data.pagination.total} products
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= data.pagination.pages}>Next</Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit" : "Add"} Product Specification</DialogTitle>
              <DialogDescription>{editingProduct ? "Update" : "Create"} a product specification entry</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select value={formData.category || "NONE"} onValueChange={(v) => setFormData({ ...formData, category: v === "NONE" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">— None —</SelectItem>
                    {PRODUCT_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Product *</Label>
                <Input value={formData.product} onChange={(e) => setFormData({ ...formData, product: e.target.value })} placeholder="e.g., C.S. SEAMLESS PIPE" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Specification</Label>
                  <Input value={formData.specification} onChange={(e) => setFormData({ ...formData, specification: e.target.value })} placeholder="e.g., ASTM A106" />
                </div>
                <div className="grid gap-2">
                  <Label>Grade</Label>
                  <Input value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })} placeholder="e.g., Gr. B" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Material</Label>
                <Textarea value={formData.material} onChange={(e) => setFormData({ ...formData, material: e.target.value })} placeholder="e.g., ASTM A106/A53/API 5L GR. B" rows={2} />
              </div>
              <div className="grid gap-2">
                <Label>Dimensional Standard</Label>
                <SmartCombobox<{ id: string; name: string; code: string }>
                  options={dimensionalStandards}
                  value={dimStdSearch}
                  onSelect={(std) => { setFormData({ ...formData, dimensionalStandardId: std.id }); setDimStdSearch(std.name); }}
                  onChange={(text) => { setDimStdSearch(text); if (!text) setFormData({ ...formData, dimensionalStandardId: "" }); }}
                  displayFn={(std) => `${std.name} (${std.code})`}
                  filterFn={(std, query) => { const q = query.toLowerCase(); return std.name.toLowerCase().includes(q) || std.code.toLowerCase().includes(q); }}
                  placeholder="Search dimensional standard..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingProduct ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── SIZES ───────────────────────────────────────────────────────────────────

type PipeType = "CS_AS" | "SS_DS";

interface SizeEntry {
  id: string;
  sizeLabel: string;
  od: number;
  wt: number;
  weight: number;
  pipeType: PipeType;
}

function SizesPanel() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [sizeTab, setSizeTab] = useState<PipeType>("CS_AS");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["sizes", sizeTab, search],
    queryFn: async () => {
      const params = new URLSearchParams({ pipeType: sizeTab, search });
      const res = await fetch(`/api/masters/sizes?${params}`);
      if (!res.ok) throw new Error("Failed to fetch sizes");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/masters/sizes/${id}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed to delete size"); }
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["sizes"] }); toast.success("Size deleted"); },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <Tabs value={sizeTab} onValueChange={(v) => setSizeTab(v as PipeType)}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="CS_AS">CS &amp; AS Pipes</TabsTrigger>
            <TabsTrigger value="SS_DS">SS &amp; DS Pipes</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const sizes: SizeEntry[] = data?.sizes || [];
                if (!sizes.length) { toast.error("No sizes to export"); return; }
                const headers = ["Size Label", "OD (mm)", "WT (mm)", "Weight (kg/m)", "Pipe Type"];
                const rows = sizes.map((s) => [s.sizeLabel, s.od, s.wt, s.weight, sizeTab]);
                const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `size-master-${sizeTab}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="h-4 w-4 mr-2" />Download CSV
            </Button>
            <Button onClick={() => router.push("/masters/sizes/create")}>
              <Plus className="h-4 w-4 mr-2" />Add Size
            </Button>
          </div>
        </div>

        <div className="my-4 relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by size, OD, WT, weight..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>

        {(["CS_AS", "SS_DS"] as PipeType[]).map((tab) => (
          <TabsContent key={tab} value={tab}>
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
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading sizes...</TableCell></TableRow>
                  ) : (data?.sizes || []).length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No sizes found</TableCell></TableRow>
                  ) : (
                    (data?.sizes || []).map((s: SizeEntry) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.sizeLabel}</TableCell>
                        <TableCell className="text-right">{s.od}</TableCell>
                        <TableCell className="text-right">{s.wt}</TableCell>
                        <TableCell className="text-right">{s.weight}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => router.push(`/masters/sizes/${s.id}/edit`)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this size?")) deleteMutation.mutate(s.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

// ─── LENGTHS ─────────────────────────────────────────────────────────────────

interface LengthEntry {
  id: string;
  label: string;
}

function LengthsPanel() {
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
      const res = await fetch(`/api/masters/lengths/${id}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed to delete length"); }
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["lengths"] }); toast.success("Length deleted"); },
    onError: (err: Error) => toast.error(err.message),
  });

  const lengths: LengthEntry[] = data?.lengths || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search lengths..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Button onClick={() => router.push("/masters/lengths/create")}>
          <Plus className="h-4 w-4 mr-2" />Add Length
        </Button>
      </div>
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
              <TableRow><TableCell colSpan={2} className="text-center py-8 text-muted-foreground">Loading lengths...</TableCell></TableRow>
            ) : lengths.length === 0 ? (
              <TableRow><TableCell colSpan={2} className="text-center py-8 text-muted-foreground">No lengths found</TableCell></TableRow>
            ) : (
              lengths.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.label}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => router.push(`/masters/lengths/${l.id}/edit`)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this length?")) deleteMutation.mutate(l.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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

// ─── FITTINGS ────────────────────────────────────────────────────────────────

const FITTING_TABS = ["All", "Elbow", "Tee", "Reducer", "Cap", "Others"] as const;

interface Fitting {
  id: string;
  type: string;
  size: string;
  schedule: string | null;
  materialGrade: string;
  standard: string | null;
  endType: string | null;
  rating: string | null;
}

function FittingsPanel() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [fittingTab, setFittingTab] = useState("All");
  const [search, setSearch] = useState("");

  const typeFilter = fittingTab === "All" || fittingTab === "Others" ? undefined : fittingTab;

  const { data, isLoading } = useQuery({
    queryKey: ["fittings", fittingTab, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (typeFilter) params.set("type", typeFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/masters/fittings?${params}`);
      if (!res.ok) throw new Error("Failed to fetch fittings");
      return res.json();
    },
  });

  const fittings: Fitting[] = (data?.fittings || []).filter((f: Fitting) =>
    fittingTab === "Others" ? !["Elbow", "Tee", "Reducer", "Cap"].includes(f.type) : true
  );

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/masters/fittings/${id}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed to delete fitting"); }
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["fittings"] }); toast.success("Fitting deleted"); },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <Tabs value={fittingTab} onValueChange={setFittingTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            {FITTING_TABS.map((t) => <TabsTrigger key={t} value={t}>{t}</TabsTrigger>)}
          </TabsList>
          <Button onClick={() => router.push("/masters/fittings/create")}>
            <Plus className="h-4 w-4 mr-2" />Add Fitting
          </Button>
        </div>

        <div className="my-4 relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by type, size, material, standard..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>

        {FITTING_TABS.map((tab) => (
          <TabsContent key={tab} value={tab}>
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
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading fittings...</TableCell></TableRow>
                  ) : fittings.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No fittings found</TableCell></TableRow>
                  ) : (
                    fittings.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.type}</TableCell>
                        <TableCell>{f.size}</TableCell>
                        <TableCell>{f.schedule || "-"}</TableCell>
                        <TableCell>{f.endType || "-"}</TableCell>
                        <TableCell>{f.rating || "-"}</TableCell>
                        <TableCell>{f.materialGrade}</TableCell>
                        <TableCell>{f.standard || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => router.push(`/masters/fittings/${f.id}/edit`)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this fitting?")) deleteMutation.mutate(f.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

// ─── FLANGES ─────────────────────────────────────────────────────────────────

const FLANGE_TABS = ["All", "Weld Neck", "Slip On", "Socket Weld", "Blind", "Lap Joint", "Threaded"] as const;

interface Flange {
  id: string;
  type: string;
  size: string;
  rating: string;
  materialGrade: string;
  standard: string | null;
  facing: string | null;
}

function FlangesPanel() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [flangeTab, setFlangeTab] = useState("All");
  const [search, setSearch] = useState("");

  const typeFilter = flangeTab === "All" || flangeTab === "Others" ? undefined : flangeTab;

  const { data, isLoading } = useQuery({
    queryKey: ["flanges", flangeTab, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (typeFilter) params.set("type", typeFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/masters/flanges?${params}`);
      if (!res.ok) throw new Error("Failed to fetch flanges");
      return res.json();
    },
  });

  const flanges: Flange[] = data?.flanges || [];

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/masters/flanges/${id}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed to delete flange"); }
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["flanges"] }); toast.success("Flange deleted"); },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <Tabs value={flangeTab} onValueChange={setFlangeTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            {FLANGE_TABS.map((t) => <TabsTrigger key={t} value={t}>{t}</TabsTrigger>)}
          </TabsList>
          <div className="flex gap-2">
            {flanges.length === 0 && (
              <Button
                variant="outline"
                onClick={async () => {
                  if (!confirm("Seed all standard flange sizes (6 types x 20 sizes x 7 classes = 840 records)?")) return;
                  try {
                    const res = await fetch("/api/masters/flanges/seed", { method: "POST" });
                    if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed"); }
                    const data = await res.json();
                    toast.success(data.message);
                    queryClient.invalidateQueries({ queryKey: ["flanges"] });
                  } catch (err: any) {
                    toast.error(err.message || "Failed to seed flanges");
                  }
                }}
              >
                Seed Standard Flanges
              </Button>
            )}
            <Button onClick={() => router.push("/masters/flanges/create")}>
              <Plus className="h-4 w-4 mr-2" />Add Flange
            </Button>
          </div>
        </div>

        <div className="my-4 relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by type, size, rating, material..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>

        {FLANGE_TABS.map((tab) => (
          <TabsContent key={tab} value={tab}>
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
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading flanges...</TableCell></TableRow>
                  ) : flanges.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No flanges found</TableCell></TableRow>
                  ) : (
                    flanges.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.type}</TableCell>
                        <TableCell>{f.size}</TableCell>
                        <TableCell>{f.rating}#</TableCell>
                        <TableCell>{f.facing || "-"}</TableCell>
                        <TableCell>{f.materialGrade}</TableCell>
                        <TableCell>{f.standard || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => router.push(`/masters/flanges/${f.id}/edit`)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this flange?")) deleteMutation.mutate(f.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

// ─── UNITS ───────────────────────────────────────────────────────────────────

interface Unit {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

function UnitsPanel() {
  const router = useRouter();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUnits = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/masters/units");
      if (!res.ok) throw new Error("Failed to fetch units");
      const data = await res.json();
      setUnits(data.units || []);
    } catch {
      toast.error("Failed to load units");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUnits(); }, [fetchUnits]);

  const columns: Column<Unit>[] = [
    { key: "code", header: "Code", sortable: true, cell: (row) => <span className="font-medium">{row.code}</span> },
    { key: "name", header: "Name", sortable: true },
    { key: "isActive", header: "Status", cell: (row) => <Badge variant={row.isActive ? "default" : "secondary"}>{row.isActive ? "Active" : "Inactive"}</Badge> },
    { key: "actions", header: "Actions", cell: (row) => (
      <Button variant="ghost" size="icon" onClick={() => router.push(`/masters/units/${row.id}/edit`)}><Pencil className="h-4 w-4" /></Button>
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => router.push("/masters/units/create")}>
          <Plus className="h-4 w-4 mr-2" />Add Unit
        </Button>
      </div>
      {loading ? (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">Loading units...</div>
      ) : (
        <DataTable<Unit> columns={columns} data={units} searchKey="code" searchPlaceholder="Search by code..." pageSize={15} />
      )}
      <div className="rounded-lg border bg-muted/50 p-4">
        <h3 className="font-semibold mb-2">Pre-seeded Units</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { code: "Kg", name: "Kilogram" }, { code: "Pcs", name: "Pieces" }, { code: "Nos", name: "Numbers" },
            { code: "Mtr", name: "Meter" }, { code: "Ft", name: "Feet" }, { code: "MM", name: "Millimeter" },
            { code: "In", name: "Inch" }, { code: "MT", name: "Metric Ton" }, { code: "Set", name: "Set" },
            { code: "Lot", name: "Lot" }, { code: "Bundle", name: "Bundle" },
          ].map((u) => (
            <Badge key={u.code} variant="outline">{u.code} - {u.name}</Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MATERIAL CODES ──────────────────────────────────────────────────────────
// Lightweight panel — for the full Item/Material Entry module, see /masters/material-codes

interface MaterialCode {
  id: string;
  code: string;
  clientItemCode: string | null;
  description: string | null;
  productType: string | null;
  materialGrade: string | null;
  size: string | null;
  schedule: string | null;
  standard: string | null;
  unit: string | null;
  rate: string | null;
  timesQuoted: number;
  timesOrdered: number;
}

interface MaterialCodeForm {
  code: string;
  clientItemCode: string;
  description: string;
  productType: string;
  materialGrade: string;
  size: string;
  schedule: string;
  standard: string;
  unit: string;
  rate: string;
}

const emptyMCForm: MaterialCodeForm = {
  code: "", clientItemCode: "", description: "", productType: "",
  materialGrade: "", size: "", schedule: "", standard: "", unit: "", rate: "",
};

const MC_UNITS = ["MTR", "NOS", "KG", "SET", "LOT", "PCS", "TON"];

function MaterialCodesPanel() {
  const [materialCodes, setMaterialCodes] = useState<MaterialCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MaterialCode | null>(null);
  const [formData, setFormData] = useState<MaterialCodeForm>(emptyMCForm);
  const [saving, setSaving] = useState(false);

  const fetchMaterialCodes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/masters/material-codes");
      if (!res.ok) throw new Error("Failed to fetch material codes");
      const data = await res.json();
      setMaterialCodes(data.materialCodes || []);
    } catch {
      toast.error("Failed to load material codes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMaterialCodes(); }, [fetchMaterialCodes]);

  const openCreate = () => { setEditingItem(null); setFormData(emptyMCForm); setIsDialogOpen(true); };
  const openEdit = (item: MaterialCode) => {
    setEditingItem(item);
    setFormData({
      code: item.code, clientItemCode: item.clientItemCode || "",
      description: item.description || "", productType: item.productType || "",
      materialGrade: item.materialGrade || "", size: item.size || "",
      schedule: item.schedule || "", standard: item.standard || "",
      unit: item.unit || "", rate: item.rate || "",
    });
    setIsDialogOpen(true);
  };
  const closeDialog = () => { setIsDialogOpen(false); setEditingItem(null); setFormData(emptyMCForm); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim()) { toast.error("Item Code is required"); return; }
    setSaving(true);
    try {
      if (editingItem) {
        const res = await fetch(`/api/masters/material-codes/${editingItem.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData),
        });
        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || "Failed to update"); }
        toast.success("Item code updated");
      } else {
        const res = await fetch("/api/masters/material-codes", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData),
        });
        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || "Failed to create"); }
        toast.success("Item code created");
      }
      closeDialog();
      fetchMaterialCodes();
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<MaterialCode>[] = [
    { key: "code", header: "Item Code", sortable: true, cell: (row) => (
      <div>
        <span className="font-mono text-sm font-medium">{row.code}</span>
        {row.clientItemCode && <div className="text-xs text-muted-foreground">Client: {row.clientItemCode}</div>}
      </div>
    )},
    { key: "description", header: "Description", cell: (row) => row.description || "—" },
    { key: "materialGrade", header: "Grade", sortable: true, cell: (row) => row.materialGrade || "—" },
    { key: "size", header: "Size", cell: (row) => row.size || "—" },
    { key: "schedule", header: "Schedule", cell: (row) => row.schedule || "—" },
    { key: "standard", header: "Standard", cell: (row) => row.standard || "—" },
    { key: "unit", header: "Unit", cell: (row) => row.unit || "—" },
    { key: "timesQuoted", header: "Quoted", sortable: true, cell: (row) => <span className="text-muted-foreground">{row.timesQuoted ?? 0}</span> },
    { key: "timesOrdered", header: "Ordered", sortable: true, cell: (row) => <span className="text-muted-foreground">{row.timesOrdered ?? 0}</span> },
    { key: "actions", header: "", cell: (row) => <Button variant="ghost" size="icon" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          For the full Item/Material Entry module, go to{" "}
          <a href="/masters/material-codes" className="text-primary underline underline-offset-2">
            Masters &rarr; Item / Material Codes
          </a>
        </p>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />Add Item Code
        </Button>
      </div>
      {loading ? (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">Loading item codes...</div>
      ) : (
        <DataTable columns={columns} data={materialCodes} searchKey="code" searchPlaceholder="Search by code, grade..." pageSize={20} />
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit" : "Add"} Item / Material Code</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Item Code *</Label>
                  <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="e.g., MC-PIPE-CS-001" className="font-mono" required />
                </div>
                <div className="grid gap-2">
                  <Label>Client Item Code</Label>
                  <Input value={formData.clientItemCode} onChange={(e) => setFormData({ ...formData, clientItemCode: e.target.value })} placeholder="Client's code" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Product Description</Label>
                <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="As mentioned in Client PO" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Product Type</Label>
                  <Input value={formData.productType} onChange={(e) => setFormData({ ...formData, productType: e.target.value })} placeholder="e.g., Seamless Pipe" />
                </div>
                <div className="grid gap-2">
                  <Label>Material Grade</Label>
                  <Input value={formData.materialGrade} onChange={(e) => setFormData({ ...formData, materialGrade: e.target.value })} placeholder="e.g., ASTM A106 Gr. B" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Size</Label>
                  <Input value={formData.size} onChange={(e) => setFormData({ ...formData, size: e.target.value })} placeholder='OD, NB, Thickness' />
                </div>
                <div className="grid gap-2">
                  <Label>Schedule</Label>
                  <Input value={formData.schedule} onChange={(e) => setFormData({ ...formData, schedule: e.target.value })} placeholder="e.g., SCH 40" />
                </div>
                <div className="grid gap-2">
                  <Label>Standard</Label>
                  <Input value={formData.standard} onChange={(e) => setFormData({ ...formData, standard: e.target.value })} placeholder="ASTM / ASME" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Unit</Label>
                  <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
                    <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                    <SelectContent>
                      {MC_UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Rate (₹)</Label>
                  <Input type="number" step="0.01" min="0" value={formData.rate} onChange={(e) => setFormData({ ...formData, rate: e.target.value })} placeholder="Default rate" className="font-mono" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : editingItem ? "Update" : "Create"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── ADDITIONAL SPECS ─────────────────────────────────────────────────────────

interface AdditionalSpec {
  id: string;
  product: string;
  specName: string;
}

function AdditionalSpecsPanel() {
  const queryClient = useQueryClient();
  const [productFilter, setProductFilter] = useState("");
  const [newSpec, setNewSpec] = useState({ product: "", specName: "" });
  const [adding, setAdding] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["additional-specs", productFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (productFilter) params.set("product", productFilter);
      const res = await fetch(`/api/masters/additional-specs?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: productsData } = useQuery({
    queryKey: ["products-list-for-specs"],
    queryFn: async () => {
      const res = await fetch("/api/masters/products?limit=500");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const uniqueProducts = Array.from(
    new Set((productsData?.products || []).map((p: any) => p.product))
  ).sort() as string[];

  const specs: AdditionalSpec[] = data?.specs || [];

  // Group by product
  const grouped = specs.reduce((acc: Record<string, AdditionalSpec[]>, s) => {
    if (!acc[s.product]) acc[s.product] = [];
    acc[s.product].push(s);
    return acc;
  }, {});

  const handleAdd = async () => {
    if (!newSpec.product || !newSpec.specName.trim()) {
      toast.error("Product and spec name are required");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/masters/additional-specs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSpec),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      toast.success("Additional spec added");
      setNewSpec({ product: newSpec.product, specName: "" });
      queryClient.invalidateQueries({ queryKey: ["additional-specs"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <Select value={productFilter || "ALL"} onValueChange={(v) => setProductFilter(v === "ALL" ? "" : v)}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Filter by product" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Products</SelectItem>
            {uniqueProducts.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {specs.length === 0 && !productFilter && (
          <Button
            variant="outline"
            onClick={async () => {
              if (!confirm("Seed standard additional specs from Excel data?")) return;
              try {
                const res = await fetch("/api/masters/additional-specs/seed", { method: "POST" });
                if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed"); }
                const d = await res.json();
                toast.success(d.message);
                queryClient.invalidateQueries({ queryKey: ["additional-specs"] });
              } catch (err: any) {
                toast.error(err.message);
              }
            }}
          >
            Seed from Excel
          </Button>
        )}
      </div>

      {/* Add new spec */}
      <div className="flex gap-3 items-end border rounded-lg p-3 bg-muted/30">
        <div className="grid gap-1 flex-1">
          <Label className="text-xs">Additional Spec Name</Label>
          <Input value={newSpec.specName} onChange={(e) => setNewSpec({ ...newSpec, specName: e.target.value })} placeholder="e.g., NACE MR0175" />
        </div>
        <Button onClick={handleAdd} disabled={adding}>
          <Plus className="h-4 w-4 mr-1" />{adding ? "Adding..." : "Add"}
        </Button>
      </div>

      {/* Grouped display */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No additional specs found. Seed from Excel or add manually.</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([product, specsList]) => (
            <div key={product} className="rounded-lg border p-4">
              <h3 className="font-semibold text-sm mb-2">{product} <span className="text-muted-foreground font-normal">({specsList.length} specs)</span></h3>
              <div className="flex flex-wrap gap-2">
                {specsList.map((s) => (
                  <Badge key={s.id} variant="secondary" className="text-xs">
                    {s.specName}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
