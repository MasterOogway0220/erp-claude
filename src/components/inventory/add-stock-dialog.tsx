"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type Line = {
  product: string;
  specification: string;
  sizeLabel: string;
  heatNo: string;
  make: string;
  quantityMtr: string;
  pieces: string;
  mtcNo: string;
  mtcDate: string;
  mtcType: string;
  tpiAgency: string;
  rackNo: string;
  notes: string;
};

const emptyLine = (): Line => ({
  product: "",
  specification: "",
  sizeLabel: "",
  heatNo: "",
  make: "",
  quantityMtr: "",
  pieces: "",
  mtcNo: "",
  mtcDate: "",
  mtcType: "",
  tpiAgency: "",
  rackNo: "",
  notes: "",
});

// Matches the server's error shape so each bad line can be named.
type Issue = { line: number; error: string };

export function AddStockDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);

  const update = (i: number, field: keyof Line, value: string) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));

  const reset = () => {
    setLines([emptyLine()]);
    setIssues([]);
  };

  const save = async () => {
    setSaving(true);
    setIssues([]);
    try {
      const response = await fetch("/api/inventory/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((l) => ({
            ...l,
            mtcDate: l.mtcDate || null,
            mtcType: l.mtcType || null,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setIssues(data.issues ?? data.duplicates?.map((d: { line: number }) => ({
          line: d.line,
          error: "Already in stock (same heat, MTC, size and rack)",
        })) ?? []);
        toast.error(data.error || "Could not add stock");
        return;
      }
      toast.success(`${data.created} stock ${data.created === 1 ? "line" : "lines"} added`);
      queryClient.invalidateQueries({ queryKey: ["inventory-stock"] });
      reset();
      onOpenChange(false);
    } catch {
      toast.error("Could not reach the server");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!saving) {
          if (!next) reset();
          onOpenChange(next);
        }
      }}
    >
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add stock</DialogTitle>
          <DialogDescription>
            One row per stock line. The same heat can be added again on another rack.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {lines.map((line, i) => {
            const issue = issues.find((x) => x.line === i + 1);
            return (
              <div key={i} className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Item {i + 1}</span>
                  {lines.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label>Product *</Label>
                    <Input value={line.product} onChange={(e) => update(i, "product", e.target.value)} placeholder="C.S. SEAMLESS PIPE" />
                  </div>
                  <div className="space-y-1">
                    <Label>Specification</Label>
                    <Input value={line.specification} onChange={(e) => update(i, "specification", e.target.value)} placeholder="ASTM A106 GR. B" />
                  </div>
                  <div className="space-y-1">
                    <Label>Size</Label>
                    <Input value={line.sizeLabel} onChange={(e) => update(i, "sizeLabel", e.target.value)} placeholder={'2" NB X SCH 80'} />
                  </div>
                  <div className="space-y-1">
                    <Label>Heat No. *</Label>
                    <Input value={line.heatNo} onChange={(e) => update(i, "heatNo", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Make</Label>
                    <Input value={line.make} onChange={(e) => update(i, "make", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Quantity (Mtr.) *</Label>
                    <Input type="number" step="0.001" min="0" value={line.quantityMtr} onChange={(e) => update(i, "quantityMtr", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Pieces</Label>
                    <Input type="number" min="0" value={line.pieces} onChange={(e) => update(i, "pieces", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Rack</Label>
                    <Input value={line.rackNo} onChange={(e) => update(i, "rackNo", e.target.value)} placeholder="e.g. 7" />
                  </div>
                  <div className="space-y-1">
                    <Label>MTC No.</Label>
                    <Input value={line.mtcNo} onChange={(e) => update(i, "mtcNo", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>MTC Date</Label>
                    <Input type="date" value={line.mtcDate} onChange={(e) => update(i, "mtcDate", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>MTC Type</Label>
                    <Select value={line.mtcType || "none"} onValueChange={(v) => update(i, "mtcType", v === "none" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not set</SelectItem>
                        <SelectItem value="MTC_3_1">3.1 MTC</SelectItem>
                        <SelectItem value="MTC_3_2">3.2 MTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>TPI Agency</Label>
                    <Input value={line.tpiAgency} onChange={(e) => update(i, "tpiAgency", e.target.value)} placeholder="BVIS, DNV-GL ..." />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label>Notes</Label>
                    <Input value={line.notes} onChange={(e) => update(i, "notes", e.target.value)} />
                  </div>
                </div>
                {issue && <p className="text-sm text-red-600">{issue.error}</p>}
              </div>
            );
          })}
        </div>

        <Button type="button" variant="outline" onClick={() => setLines((prev) => [...prev, emptyLine()])}>
          <Plus className="h-4 w-4 mr-2" />
          Add another item
        </Button>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? "Saving..." : `Save ${lines.length} ${lines.length === 1 ? "item" : "items"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
