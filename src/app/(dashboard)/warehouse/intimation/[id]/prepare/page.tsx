"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Check,
  Save,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { PageLoading } from "@/components/shared/page-loading";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DetailRow {
  id?: string;
  sNo: number;
  lengthMtr: string;
  pieces: string;
  make: string;
  heatNo: string;
  mtcNo: string;
  mtcDate: string;
  status: string;
}

interface MprItem {
  id: string;
  sNo: number;
  product: string;
  material: string;
  sizeLabel: string;
  requiredQty: number;
  preparedQty: number;
  itemStatus: string;
  details: DetailRow[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PrepareMaterialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mprNo, setMprNo] = useState("");
  const [mprStatus, setMprStatus] = useState("");
  const [items, setItems] = useState<MprItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editRows, setEditRows] = useState<DetailRow[]>([]);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/warehouse/intimation/${id}/details`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setMprNo(data.mprNo);
        setMprStatus(data.status);
        setItems(data.items);
        if (data.items.length > 0) {
          loadEditRows(data.items[0]);
        }
      } catch {
        toast.error("Failed to load intimation details");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  // Load edit rows from an item
  function loadEditRows(item: MprItem) {
    if (item.details && item.details.length > 0) {
      setEditRows(
        item.details.map((d) => ({
          id: d.id,
          sNo: d.sNo,
          lengthMtr: d.lengthMtr?.toString() || "",
          pieces: d.pieces?.toString() || "",
          make: d.make || "",
          heatNo: d.heatNo || "",
          mtcNo: d.mtcNo || "",
          mtcDate: d.mtcDate || "",
          status: d.status || "PENDING",
        }))
      );
    } else {
      setEditRows([createEmptyRow(1)]);
    }
  }

  function createEmptyRow(sNo: number): DetailRow {
    return {
      sNo,
      lengthMtr: "",
      pieces: "",
      make: "",
      heatNo: "",
      mtcNo: "",
      mtcDate: "",
      status: "PENDING",
    };
  }

  // Add row
  function addRow() {
    const nextSNo =
      editRows.length > 0 ? Math.max(...editRows.map((r) => r.sNo)) + 1 : 1;
    setEditRows([...editRows, createEmptyRow(nextSNo)]);
  }

  // Delete row
  function deleteRow(index: number) {
    if (editRows.length <= 1) {
      toast.error("At least one row is required");
      return;
    }
    setEditRows(editRows.filter((_, i) => i !== index));
  }

  // Update row field
  function updateRow(index: number, field: keyof DetailRow, value: string) {
    const updated = [...editRows];
    updated[index] = { ...updated[index], [field]: value };
    setEditRows(updated);
  }

  // Calculate progress
  function getProgress(): number {
    const currentItem = items[currentIndex];
    if (!currentItem || !currentItem.requiredQty) return 0;
    const totalLength = editRows.reduce(
      (sum, r) => sum + (parseFloat(r.lengthMtr) || 0),
      0
    );
    return Math.min((totalLength / currentItem.requiredQty) * 100, 100);
  }

  // Validate rows
  function validateRows(): boolean {
    const nonEmptyRows = editRows.filter(
      (r) => r.lengthMtr || r.pieces || r.make || r.heatNo
    );
    for (const row of nonEmptyRows) {
      if (!row.lengthMtr || isNaN(parseFloat(row.lengthMtr)) || parseFloat(row.lengthMtr) <= 0) {
        toast.error(`Row ${row.sNo}: Length must be a positive number`);
        return false;
      }
    }
    return true;
  }

  // Save details
  async function saveDetails(): Promise<boolean> {
    if (!validateRows()) return false;

    const currentItem = items[currentIndex];
    if (!currentItem) return false;

    setSaving(true);
    try {
      const res = await fetch(`/api/warehouse/intimation/${id}/details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseIntimationItemId: currentItem.id,
          details: editRows
            .filter((r) => r.lengthMtr || r.pieces || r.make || r.heatNo)
            .map((r) => ({
              id: r.id || undefined,
              sNo: r.sNo,
              lengthMtr: r.lengthMtr || null,
              pieces: r.pieces || null,
              make: r.make || null,
              heatNo: r.heatNo || null,
            })),
        }),
      });

      if (!res.ok) throw new Error("Failed to save");
      const result = await res.json();

      // Update local item state
      const updatedItems = [...items];
      updatedItems[currentIndex] = {
        ...updatedItems[currentIndex],
        preparedQty: result.preparedQty ?? updatedItems[currentIndex].preparedQty,
        itemStatus: result.itemStatus ?? updatedItems[currentIndex].itemStatus,
      };
      setItems(updatedItems);

      toast.success("Details saved successfully");
      return true;
    } catch {
      toast.error("Failed to save details");
      return false;
    } finally {
      setSaving(false);
    }
  }

  // Navigate between items
  async function navigateTo(index: number) {
    // Auto-save current before navigating
    const hasContent = editRows.some(
      (r) => r.lengthMtr || r.pieces || r.make || r.heatNo
    );
    if (hasContent) {
      const saved = await saveDetails();
      if (!saved) return;
    }
    setCurrentIndex(index);
    loadEditRows(items[index]);
  }

  if (loading) return <PageLoading />;

  const currentItem = items[currentIndex];
  const progress = getProgress();
  const totalLength = editRows.reduce(
    (sum, r) => sum + (parseFloat(r.lengthMtr) || 0),
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Prepare Material — ${mprNo}`}
        description="Enter per-pipe details for each item"
      />

      {/* Step Indicator */}
      <div className="flex items-center gap-2 flex-wrap">
        {items.map((item, idx) => (
          <button
            key={item.id}
            onClick={() => navigateTo(idx)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              idx === currentIndex
                ? "bg-primary text-primary-foreground"
                : item.itemStatus === "READY"
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : item.itemStatus === "PREPARING"
                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                    : "bg-muted text-muted-foreground"
            }`}
          >
            {item.itemStatus === "READY" ? (
              <Check className="h-3 w-3" />
            ) : (
              <Package className="h-3 w-3" />
            )}
            Item {item.sNo}
          </button>
        ))}
      </div>

      {currentItem && (
        <>
          {/* Item Info Bar */}
          <Card>
            <CardContent className="py-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Product
                  </Label>
                  <p className="font-medium">{currentItem.product}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Material
                  </Label>
                  <p className="font-medium">{currentItem.material}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Size</Label>
                  <p className="font-medium">{currentItem.sizeLabel}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Required Qty (MTR)
                  </Label>
                  <p className="font-medium">{currentItem.requiredQty}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Status
                  </Label>
                  <Badge
                    variant={
                      currentItem.itemStatus === "READY"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {currentItem.itemStatus}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progress Bar */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  Prepared: {totalLength.toFixed(2)} / {currentItem.requiredQty}{" "}
                  MTR
                </span>
                <span className="text-sm font-medium">
                  {progress.toFixed(0)}%
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </CardContent>
          </Card>

          {/* Detail Rows Table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Pipe Details</CardTitle>
                <Button size="sm" variant="outline" onClick={addRow}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Row
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">S.No</TableHead>
                      <TableHead className="w-[120px]">Length (MTR)</TableHead>
                      <TableHead className="w-[80px]">Pieces</TableHead>
                      <TableHead className="w-[120px]">Make</TableHead>
                      <TableHead className="w-[130px]">Heat No</TableHead>
                      <TableHead className="w-[130px]">
                        MTC No
                        <span className="block text-xs text-muted-foreground font-normal">
                          (QA fills later)
                        </span>
                      </TableHead>
                      <TableHead className="w-[130px]">
                        MTC Date
                        <span className="block text-xs text-muted-foreground font-normal">
                          (QA fills later)
                        </span>
                      </TableHead>
                      <TableHead className="w-[50px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editRows.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">
                          {row.sNo}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.001"
                            min="0"
                            value={row.lengthMtr}
                            onChange={(e) =>
                              updateRow(idx, "lengthMtr", e.target.value)
                            }
                            placeholder="0.000"
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            value={row.pieces}
                            onChange={(e) =>
                              updateRow(idx, "pieces", e.target.value)
                            }
                            placeholder="0"
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.make}
                            onChange={(e) =>
                              updateRow(idx, "make", e.target.value)
                            }
                            placeholder="Make"
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.heatNo}
                            onChange={(e) =>
                              updateRow(idx, "heatNo", e.target.value)
                            }
                            placeholder="Heat No"
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.mtcNo}
                            disabled
                            className="h-8 bg-muted"
                            placeholder="—"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.mtcDate}
                            disabled
                            className="h-8 bg-muted"
                            placeholder="—"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={() => deleteRow(idx)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Navigation & Save */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              disabled={currentIndex === 0 || saving}
              onClick={() => navigateTo(currentIndex - 1)}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            <Button onClick={saveDetails} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />
              {saving ? "Saving..." : "Save Details"}
            </Button>

            {currentIndex < items.length - 1 ? (
              <Button
                disabled={saving}
                onClick={() => navigateTo(currentIndex + 1)}
              >
                Next
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                variant="default"
                disabled={saving}
                onClick={async () => {
                  const hasContent = editRows.some(
                    (r) => r.lengthMtr || r.pieces || r.make || r.heatNo
                  );
                  if (hasContent) {
                    const saved = await saveDetails();
                    if (!saved) return;
                  }
                  toast.success("All items prepared");
                  router.push(`/warehouse/intimation/${id}`);
                }}
              >
                <Check className="h-4 w-4 mr-1" />
                Finish
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
