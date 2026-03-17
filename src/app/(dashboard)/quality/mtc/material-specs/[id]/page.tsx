"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { PageLoading } from "@/components/shared/page-loading";

export default function MaterialSpecDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [spec, setSpec] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchSpec = useCallback(async () => {
    try {
      const res = await fetch(`/api/mtc/material-specs/${id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setSpec(data.materialSpec);
    } catch {
      toast.error("Failed to load material specification");
      router.push("/quality/mtc/material-specs");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (id) fetchSpec();
  }, [id, fetchSpec]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/mtc/material-specs/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
      }
      toast.success("Material specification deleted");
      router.push("/quality/mtc/material-specs");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  if (loading) return <PageLoading />;
  if (!spec) return null;

  const chemElements = spec.chemicalElements || [];
  const mechProps = spec.mechanicalProperties || [];
  const impactProps = spec.impactProperties || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={spec.materialSpec || "Material Specification"}
        description={spec.description || "Material specification details"}
        badge={spec.isActive ? "Active" : "Inactive"}
        badgeVariant={spec.isActive ? "default" : "destructive"}
      >
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/quality/mtc/material-specs")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              router.push(`/quality/mtc/material-specs/create?edit=${id}`)
            }
          >
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </PageHeader>

      {/* Basic Details */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-muted-foreground text-xs">
                Material Specification
              </Label>
              <div className="font-mono font-medium">{spec.materialSpec}</div>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">
                Description
              </Label>
              <div>{spec.description || "—"}</div>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">
                Starting Material
              </Label>
              <div>{spec.startingMaterial || "—"}</div>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">
                Heat Treatment
              </Label>
              <div>{spec.heatTreatment || "—"}</div>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">
                Heat Treatment Type
              </Label>
              <div>
                {spec.heatTreatmentType?.replace(/_/g, " ") || "—"}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">
                Construction Type
              </Label>
              <Badge variant="outline">
                {spec.constructionType || "—"}
              </Badge>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">
                Dimension Standard
              </Label>
              <div>{spec.dimensionStandard || "—"}</div>
            </div>
          </div>
          {spec.defaultNotes && (
            <div className="mt-4">
              <Label className="text-muted-foreground text-xs">
                Default Notes
              </Label>
              <div className="mt-1 whitespace-pre-wrap text-sm bg-muted/30 p-3 rounded-md">
                {spec.defaultNotes}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chemical Composition */}
      {chemElements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Chemical Composition{" "}
              <Badge variant="secondary" className="ml-2">
                {chemElements.length} elements
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Element</TableHead>
                    <TableHead className="text-center">Min Value</TableHead>
                    <TableHead className="text-center">Max Value</TableHead>
                    <TableHead className="text-center">Result Min</TableHead>
                    <TableHead className="text-center">Result Max</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chemElements.map((el: any) => (
                    <TableRow key={el.id}>
                      <TableCell className="font-mono font-medium">
                        {el.element}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {el.minValue != null ? Number(el.minValue).toFixed(4) : "—"}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {el.maxValue != null ? Number(el.maxValue).toFixed(4) : "—"}
                      </TableCell>
                      <TableCell className="text-center font-mono text-blue-600">
                        {el.resultMinValue != null
                          ? Number(el.resultMinValue).toFixed(4)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-center font-mono text-blue-600">
                        {el.resultMaxValue != null
                          ? Number(el.resultMaxValue).toFixed(4)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mechanical Properties */}
      {mechProps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Mechanical Properties{" "}
              <Badge variant="secondary" className="ml-2">
                {mechProps.length} properties
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-center">Min Value</TableHead>
                    <TableHead className="text-center">Max Value</TableHead>
                    <TableHead className="text-center">Result Min</TableHead>
                    <TableHead className="text-center">Result Max</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mechProps.map((mp: any) => (
                    <TableRow key={mp.id}>
                      <TableCell className="font-medium">
                        {mp.propertyName}
                      </TableCell>
                      <TableCell>{mp.unit || "—"}</TableCell>
                      <TableCell className="text-center font-mono">
                        {mp.minValue != null ? Number(mp.minValue).toFixed(2) : "—"}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {mp.maxValue != null ? Number(mp.maxValue).toFixed(2) : "—"}
                      </TableCell>
                      <TableCell className="text-center font-mono text-blue-600">
                        {mp.resultMinValue != null
                          ? Number(mp.resultMinValue).toFixed(2)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-center font-mono text-blue-600">
                        {mp.resultMaxValue != null
                          ? Number(mp.resultMaxValue).toFixed(2)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Impact Properties */}
      {impactProps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Impact Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test Temperature</TableHead>
                    <TableHead>Specimen Size</TableHead>
                    <TableHead className="text-center">Min Energy (J)</TableHead>
                    <TableHead className="text-center">Result Min</TableHead>
                    <TableHead className="text-center">Result Max</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {impactProps.map((ip: any) => (
                    <TableRow key={ip.id}>
                      <TableCell>{ip.testTemperature || "—"}</TableCell>
                      <TableCell>{ip.specimenSize || "—"}</TableCell>
                      <TableCell className="text-center font-mono">
                        {ip.minEnergy != null
                          ? Number(ip.minEnergy).toFixed(2)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-center font-mono text-blue-600">
                        {ip.resultMinValue != null
                          ? Number(ip.resultMinValue).toFixed(2)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-center font-mono text-blue-600">
                        {ip.resultMaxValue != null
                          ? Number(ip.resultMaxValue).toFixed(2)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Material Specification</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{spec.materialSpec}&quot;?
              This will also delete all associated chemical elements, mechanical
              properties, and impact properties. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
