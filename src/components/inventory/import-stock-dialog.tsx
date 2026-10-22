"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Plan {
  total: number;
  willCreate: number;
  duplicates: { line: number; key: string }[];
  issues: { line: number; error: string }[];
  warnings: { line: number; text: string }[];
  preview: { product: string; heatNo: string; sizeLabel: string | null; rackNo: string | null; quantityMtr: number }[];
}

// Upload an inventory sheet. Step 1 previews what would happen (dryRun);
// step 2 writes only when the user confirms.
export function ImportStockDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setFile(null);
    setPlan(null);
  };

  const send = async (dryRun: boolean) => {
    if (!file) return;
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("dryRun", String(dryRun));
      const response = await fetch("/api/inventory/stock/import", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Import failed");
        return;
      }
      if (dryRun) {
        setPlan(data);
        return;
      }
      toast.success(`${data.created} stock ${data.created === 1 ? "line" : "lines"} imported`);
      queryClient.invalidateQueries({ queryKey: ["inventory-stock"] });
      reset();
      onOpenChange(false);
    } catch {
      toast.error("Could not reach the server");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) {
          if (!next) reset();
          onOpenChange(next);
        }
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import stock from Excel</DialogTitle>
          <DialogDescription>
            Upload the inventory sheet (.xlsx, .xls or .csv). The file is checked first; nothing is saved until you confirm.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="stock-import-file">Sheet</Label>
            <input
              id="stock-import-file"
              type="file"
              accept=".xlsx,.xls,.csv"
              className="block w-full text-sm"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setPlan(null);
              }}
            />
          </div>

          {plan && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="rounded border p-2"><div className="text-muted-foreground">Rows in file</div><div className="font-semibold">{plan.total}</div></div>
                <div className="rounded border p-2"><div className="text-muted-foreground">Will be added</div><div className="font-semibold text-green-700">{plan.willCreate}</div></div>
                <div className="rounded border p-2"><div className="text-muted-foreground">Already in stock</div><div className="font-semibold">{plan.duplicates.length}</div></div>
                <div className="rounded border p-2"><div className="text-muted-foreground">Rejected</div><div className="font-semibold text-red-600">{plan.issues.length}</div></div>
              </div>

              {plan.issues.length > 0 && (
                <div>
                  <div className="font-medium text-red-600">Rejected rows (not imported)</div>
                  <ul className="list-disc pl-5">
                    {plan.issues.slice(0, 20).map((x) => (
                      <li key={`i${x.line}`}>Line {x.line}: {x.error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {plan.duplicates.length > 0 && (
                <div>
                  <div className="font-medium">Skipped as already in stock</div>
                  <ul className="list-disc pl-5">
                    {plan.duplicates.slice(0, 20).map((x) => (
                      <li key={`d${x.line}`}>Line {x.line}: heat {x.key.split("|")[0]}, rack {x.key.split("|")[3] || "-"}</li>
                    ))}
                  </ul>
                </div>
              )}

              {plan.warnings.length > 0 && (
                <div>
                  <div className="font-medium text-amber-700">Check these (imported, value adjusted)</div>
                  <ul className="list-disc pl-5">
                    {plan.warnings.slice(0, 20).map((x, i) => (
                      <li key={`w${i}`}>Line {x.line}: {x.text}</li>
                    ))}
                  </ul>
                </div>
              )}

              {plan.preview.length > 0 && (
                <div>
                  <div className="font-medium">First rows to be added</div>
                  <table className="w-full text-left">
                    <thead className="text-muted-foreground">
                      <tr><th>Product</th><th>Heat</th><th>Size</th><th>Rack</th><th>Qty (Mtr.)</th></tr>
                    </thead>
                    <tbody>
                      {plan.preview.map((r, i) => (
                        <tr key={i}>
                          <td>{r.product}</td><td>{r.heatNo}</td><td>{r.sizeLabel ?? "-"}</td><td>{r.rackNo ?? "-"}</td><td>{r.quantityMtr}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          {!plan ? (
            <Button type="button" onClick={() => send(true)} disabled={!file || busy}>
              {busy ? "Checking..." : "Check file"}
            </Button>
          ) : (
            <Button type="button" onClick={() => send(false)} disabled={busy || plan.willCreate === 0}>
              {busy ? "Importing..." : `Import ${plan.willCreate} ${plan.willCreate === 1 ? "line" : "lines"}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
