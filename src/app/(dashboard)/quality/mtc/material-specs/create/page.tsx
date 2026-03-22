"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Beaker, Gauge } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageLoading } from "@/components/shared/page-loading";

interface ChemicalElement {
  id: string;
  element: string;
  sortOrder: number;
  minValue: string;
  maxValue: string;
  resultMin: string;
  resultMax: string;
}

interface MechanicalProperty {
  id: string;
  propertyName: string;
  unit: string;
  sortOrder: number;
  minValue: string;
  maxValue: string;
  resultMin: string;
  resultMax: string;
}

const STARTING_MATERIALS = [
  "SEAMLESS PIPE",
  "PLATE",
  "ROUND BAR",
  "FORGING",
  "BILLET",
];

const HEAT_TREATMENT_TYPES = [
  "NORMALIZED",
  "SOLUTION_ANNEALED",
  "QUENCHED",
  "QUENCHED_AND_TEMPERED",
  "STRESS_RELIEVED",
  "ANNEALED",
  "HOT_FINISHED",
  "COLD_DRAWN",
  "NONE",
];

const CONSTRUCTION_TYPES = ["SEAMLESS", "WELDED", "FORGED"];

const DEFAULT_ELEMENTS: Omit<ChemicalElement, "id">[] = [
  { element: "C", sortOrder: 1, minValue: "", maxValue: "", resultMin: "", resultMax: "" },
  { element: "Mn", sortOrder: 2, minValue: "", maxValue: "", resultMin: "", resultMax: "" },
  { element: "P", sortOrder: 3, minValue: "", maxValue: "", resultMin: "", resultMax: "" },
  { element: "S", sortOrder: 4, minValue: "", maxValue: "", resultMin: "", resultMax: "" },
  { element: "Si", sortOrder: 5, minValue: "", maxValue: "", resultMin: "", resultMax: "" },
  { element: "Cr", sortOrder: 6, minValue: "", maxValue: "", resultMin: "", resultMax: "" },
  { element: "Mo", sortOrder: 7, minValue: "", maxValue: "", resultMin: "", resultMax: "" },
  { element: "Ni", sortOrder: 8, minValue: "", maxValue: "", resultMin: "", resultMax: "" },
  { element: "Cu", sortOrder: 9, minValue: "", maxValue: "", resultMin: "", resultMax: "" },
  { element: "V", sortOrder: 10, minValue: "", maxValue: "", resultMin: "", resultMax: "" },
  { element: "F1", sortOrder: 11, minValue: "", maxValue: "", resultMin: "", resultMax: "" },
  { element: "CEQ", sortOrder: 12, minValue: "", maxValue: "", resultMin: "", resultMax: "" },
];

const DEFAULT_PROPERTIES: Omit<MechanicalProperty, "id">[] = [
  { propertyName: "Yield Strength", unit: "MPa", sortOrder: 1, minValue: "", maxValue: "", resultMin: "", resultMax: "" },
  { propertyName: "Tensile Strength", unit: "MPa", sortOrder: 2, minValue: "", maxValue: "", resultMin: "", resultMax: "" },
  { propertyName: "Elongation", unit: "%", sortOrder: 3, minValue: "", maxValue: "", resultMin: "", resultMax: "" },
  { propertyName: "Reduction Area", unit: "%", sortOrder: 4, minValue: "", maxValue: "", resultMin: "", resultMax: "" },
  { propertyName: "Hardness", unit: "HB", sortOrder: 5, minValue: "", maxValue: "", resultMin: "", resultMax: "" },
];

function generateId() {
  return Math.random().toString(36).substring(2, 11);
}

function MaterialSpecCreateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const [loading, setLoading] = useState(!!editId);
  const [submitting, setSubmitting] = useState(false);
  const [allSpecs, setAllSpecs] = useState<any[]>([]);

  const [form, setForm] = useState({
    materialSpec: "",
    description: "",
    startingMaterial: "",
    heatTreatment: "",
    heatTreatmentType: "",
    constructionType: "",
    dimensionStandard: "",
    defaultNotes: "",
  });

  const [chemicalElements, setChemicalElements] = useState<ChemicalElement[]>([]);
  const [mechanicalProperties, setMechanicalProperties] = useState<MechanicalProperty[]>([]);

  const [impactProperties, setImpactProperties] = useState({
    testTemperature: "",
    specimenSize: "",
    minimumEnergy: "",
    resultMin: "",
    resultMax: "",
  });

  // Fetch all existing specs for "Copy from" feature
  useEffect(() => {
    fetch("/api/mtc/material-specs")
      .then((r) => r.ok ? r.json() : { materialSpecs: [] })
      .then((d) => setAllSpecs(d.materialSpecs || []))
      .catch(() => {});
  }, []);

  const handleCopyFrom = (specId: string) => {
    const spec = allSpecs.find((s: any) => s.id === specId);
    if (!spec) return;
    setForm({
      materialSpec: "", // Leave blank — user fills in new spec name
      description: "",
      startingMaterial: spec.startingMaterial || "",
      heatTreatment: spec.heatTreatment || "",
      heatTreatmentType: spec.heatTreatmentType || "",
      constructionType: spec.constructionType || "",
      dimensionStandard: spec.dimensionStandard || "",
      defaultNotes: spec.defaultNotes || "",
    });
    if (spec.chemicalElements?.length) {
      setChemicalElements(
        spec.chemicalElements.map((el: any) => ({
          id: generateId(),
          element: el.element || "",
          sortOrder: el.sortOrder || 0,
          minValue: el.minValue?.toString() || "",
          maxValue: el.maxValue?.toString() || "",
          resultMin: el.resultMinValue?.toString() || "",
          resultMax: el.resultMaxValue?.toString() || "",
        }))
      );
    }
    if (spec.mechanicalProperties?.length) {
      setMechanicalProperties(
        spec.mechanicalProperties.map((p: any) => ({
          id: generateId(),
          propertyName: p.propertyName || "",
          unit: p.unit || "",
          sortOrder: p.sortOrder || 0,
          minValue: p.minValue?.toString() || "",
          maxValue: p.maxValue?.toString() || "",
          resultMin: p.resultMinValue?.toString() || "",
          resultMax: p.resultMaxValue?.toString() || "",
        }))
      );
    }
    if (spec.impactProperties?.length > 0) {
      const ip = spec.impactProperties[0];
      setImpactProperties({
        testTemperature: ip.testTemperature?.toString() || "",
        specimenSize: ip.specimenSize || "",
        minimumEnergy: ip.minEnergy?.toString() || "",
        resultMin: ip.resultMinValue?.toString() || "",
        resultMax: ip.resultMaxValue?.toString() || "",
      });
    }
    toast.success(`Copied from ${spec.materialSpec}. Enter new spec name.`);
  };

  useEffect(() => {
    if (editId) {
      fetchSpec(editId);
    }
  }, [editId]);

  const fetchSpec = async (id: string) => {
    try {
      const response = await fetch(`/api/mtc/material-specs/${id}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      const spec = data.materialSpec;

      setForm({
        materialSpec: spec.materialSpec || "",
        description: spec.description || "",
        startingMaterial: spec.startingMaterial || "",
        heatTreatment: spec.heatTreatment || "",
        heatTreatmentType: spec.heatTreatmentType || "",
        constructionType: spec.constructionType || "",
        dimensionStandard: spec.dimensionStandard || "",
        defaultNotes: spec.defaultNotes || "",
      });

      if (spec.chemicalElements?.length) {
        setChemicalElements(
          spec.chemicalElements.map((el: any) => ({
            id: el.id || generateId(),
            element: el.element || "",
            sortOrder: el.sortOrder || 0,
            minValue: el.minValue?.toString() || "",
            maxValue: el.maxValue?.toString() || "",
            resultMin: el.resultMinValue?.toString() || "",
            resultMax: el.resultMaxValue?.toString() || "",
          }))
        );
      }

      if (spec.mechanicalProperties?.length) {
        setMechanicalProperties(
          spec.mechanicalProperties.map((prop: any) => ({
            id: prop.id || generateId(),
            propertyName: prop.propertyName || "",
            unit: prop.unit || "",
            sortOrder: prop.sortOrder || 0,
            minValue: prop.minValue?.toString() || "",
            maxValue: prop.maxValue?.toString() || "",
            resultMin: prop.resultMinValue?.toString() || "",
            resultMax: prop.resultMaxValue?.toString() || "",
          }))
        );
      }

      if (spec.impactProperties?.length > 0) {
        const ip = spec.impactProperties[0];
        setImpactProperties({
          testTemperature: ip.testTemperature?.toString() || "",
          specimenSize: ip.specimenSize || "",
          minimumEnergy: ip.minEnergy?.toString() || "",
          resultMin: ip.resultMinValue?.toString() || "",
          resultMax: ip.resultMaxValue?.toString() || "",
        });
      }
    } catch (error) {
      toast.error("Failed to load material spec");
      router.push("/quality/mtc/material-specs");
    } finally {
      setLoading(false);
    }
  };

  const addChemicalElement = () => {
    setChemicalElements((prev) => [
      ...prev,
      {
        id: generateId(),
        element: "",
        sortOrder: prev.length + 1,
        minValue: "",
        maxValue: "",
        resultMin: "",
        resultMax: "",
      },
    ]);
  };

  const removeChemicalElement = (id: string) => {
    setChemicalElements((prev) => prev.filter((el) => el.id !== id));
  };

  const updateChemicalElement = (id: string, field: keyof ChemicalElement, value: string | number) => {
    setChemicalElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, [field]: value } : el))
    );
  };

  const preFillElements = () => {
    const existing = new Set(chemicalElements.map((e) => e.element));
    const newElements = DEFAULT_ELEMENTS.filter((e) => !existing.has(e.element)).map((e) => ({
      ...e,
      id: generateId(),
    }));
    setChemicalElements((prev) => [...prev, ...newElements]);
    toast.success(`Added ${newElements.length} common elements`);
  };

  const addMechanicalProperty = () => {
    setMechanicalProperties((prev) => [
      ...prev,
      {
        id: generateId(),
        propertyName: "",
        unit: "",
        sortOrder: prev.length + 1,
        minValue: "",
        maxValue: "",
        resultMin: "",
        resultMax: "",
      },
    ]);
  };

  const removeMechanicalProperty = (id: string) => {
    setMechanicalProperties((prev) => prev.filter((p) => p.id !== id));
  };

  const updateMechanicalProperty = (id: string, field: keyof MechanicalProperty, value: string | number) => {
    setMechanicalProperties((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const preFillProperties = () => {
    const existing = new Set(mechanicalProperties.map((p) => p.propertyName));
    const newProps = DEFAULT_PROPERTIES.filter((p) => !existing.has(p.propertyName)).map((p) => ({
      ...p,
      id: generateId(),
    }));
    setMechanicalProperties((prev) => [...prev, ...newProps]);
    toast.success(`Added ${newProps.length} common properties`);
  };

  const handleSubmit = async () => {
    if (!form.materialSpec.trim()) {
      toast.error("Material specification is required");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        chemicalElements: chemicalElements.map((el) => ({
          element: el.element,
          sortOrder: Number(el.sortOrder),
          minValue: el.minValue ? parseFloat(el.minValue) : null,
          maxValue: el.maxValue ? parseFloat(el.maxValue) : null,
          resultMinValue: el.resultMin ? parseFloat(el.resultMin) : null,
          resultMaxValue: el.resultMax ? parseFloat(el.resultMax) : null,
        })),
        mechanicalProperties: mechanicalProperties.map((p) => ({
          propertyName: p.propertyName,
          unit: p.unit,
          sortOrder: Number(p.sortOrder),
          minValue: p.minValue ? parseFloat(p.minValue) : null,
          maxValue: p.maxValue ? parseFloat(p.maxValue) : null,
          resultMinValue: p.resultMin ? parseFloat(p.resultMin) : null,
          resultMaxValue: p.resultMax ? parseFloat(p.resultMax) : null,
        })),
        impactProperties: impactProperties.testTemperature
          ? [{
              testTemperature: impactProperties.testTemperature,
              specimenSize: impactProperties.specimenSize,
              minEnergy: impactProperties.minimumEnergy
                ? parseFloat(impactProperties.minimumEnergy)
                : null,
              resultMinValue: impactProperties.resultMin
                ? parseFloat(impactProperties.resultMin)
                : null,
              resultMaxValue: impactProperties.resultMax
                ? parseFloat(impactProperties.resultMax)
                : null,
            }]
          : [],
      };

      const url = editId
        ? `/api/mtc/material-specs/${editId}`
        : "/api/mtc/material-specs";
      const method = editId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save");
      }

      toast.success(editId ? "Material spec updated" : "Material spec created");
      router.push("/quality/mtc/material-specs");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={editId ? "Edit Material Specification" : "New Material Specification"}
        description="Define chemical composition, mechanical properties, and impact requirements"
      >
        <Button variant="outline" onClick={() => router.push("/quality/mtc/material-specs")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      {/* Section 1: Basic Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Basic Details</CardTitle>
            {!editId && allSpecs.length > 0 && (
              <Select onValueChange={handleCopyFrom}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="Copy from earlier spec..." />
                </SelectTrigger>
                <SelectContent>
                  {allSpecs.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.materialSpec}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Material Specification *</Label>
              <Input
                placeholder="e.g. ASTM A234 GR. WPB"
                value={form.materialSpec}
                onChange={(e) => setForm({ ...form, materialSpec: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Starting Material</Label>
              <Select
                value={form.startingMaterial}
                onValueChange={(v) => setForm({ ...form, startingMaterial: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select starting material" />
                </SelectTrigger>
                <SelectContent>
                  {STARTING_MATERIALS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Heat Treatment</Label>
              <Input
                placeholder="e.g. NORMALIZED - 920 deg C"
                value={form.heatTreatment}
                onChange={(e) => setForm({ ...form, heatTreatment: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Heat Treatment Type</Label>
              <Select
                value={form.heatTreatmentType}
                onValueChange={(v) => setForm({ ...form, heatTreatmentType: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {HEAT_TREATMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Construction Type</Label>
              <Select
                value={form.constructionType}
                onValueChange={(v) => setForm({ ...form, constructionType: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select construction" />
                </SelectTrigger>
                <SelectContent>
                  {CONSTRUCTION_TYPES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Dimension Standard</Label>
              <Input
                placeholder="e.g. ASME B16.9"
                value={form.dimensionStandard}
                onChange={(e) => setForm({ ...form, dimensionStandard: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Default Notes</Label>
              <Textarea
                placeholder="Default notes to include on MTC certificates..."
                value={form.defaultNotes}
                onChange={(e) => setForm({ ...form, defaultNotes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Chemical Composition */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Beaker className="h-5 w-5" />
              Chemical Composition
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={preFillElements}>
                Pre-fill Common Elements
              </Button>
              <Button size="sm" onClick={addChemicalElement}>
                <Plus className="w-4 h-4 mr-1" />
                Add Element
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {chemicalElements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Beaker className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No chemical elements defined. Add elements or use pre-fill.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Element</TableHead>
                    <TableHead className="w-[80px]">Sort Order</TableHead>
                    <TableHead className="w-[120px]">Min Value</TableHead>
                    <TableHead className="w-[120px]">Max Value</TableHead>
                    <TableHead className="w-[120px]">Result Min</TableHead>
                    <TableHead className="w-[120px]">Result Max</TableHead>
                    <TableHead className="w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chemicalElements.map((el) => (
                    <TableRow key={el.id}>
                      <TableCell>
                        <Input
                          value={el.element}
                          onChange={(e) => updateChemicalElement(el.id, "element", e.target.value)}
                          placeholder="e.g. C"
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={el.sortOrder}
                          onChange={(e) => updateChemicalElement(el.id, "sortOrder", e.target.value)}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={el.minValue}
                          onChange={(e) => updateChemicalElement(el.id, "minValue", e.target.value)}
                          placeholder="0.00"
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={el.maxValue}
                          onChange={(e) => updateChemicalElement(el.id, "maxValue", e.target.value)}
                          placeholder="0.00"
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={el.resultMin}
                          onChange={(e) => updateChemicalElement(el.id, "resultMin", e.target.value)}
                          placeholder="0.00"
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={el.resultMax}
                          onChange={(e) => updateChemicalElement(el.id, "resultMax", e.target.value)}
                          placeholder="0.00"
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeChemicalElement(el.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="mt-3 p-3 rounded-md bg-muted/50 text-xs text-muted-foreground space-y-1">
            <p><strong>F1</strong> = Cu + Ni + Cr + Mo</p>
            <p><strong>CEQ</strong> = C + Mn/6 + (Cr + Mo + V)/5 + (Ni + Cu)/15</p>
            <p className="text-xs italic">F1 and CEQ are derived/calculated values. Set their max values in the spec above — actual results will be auto-calculated from base elements during certificate generation.</p>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Mechanical Properties */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              Mechanical Properties
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={preFillProperties}>
                Pre-fill Common Properties
              </Button>
              <Button size="sm" onClick={addMechanicalProperty}>
                <Plus className="w-4 h-4 mr-1" />
                Add Property
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {mechanicalProperties.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Gauge className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No mechanical properties defined. Add properties or use pre-fill.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">Property Name</TableHead>
                    <TableHead className="w-[80px]">Unit</TableHead>
                    <TableHead className="w-[80px]">Sort Order</TableHead>
                    <TableHead className="w-[120px]">Min Value</TableHead>
                    <TableHead className="w-[120px]">Max Value</TableHead>
                    <TableHead className="w-[120px]">Result Min</TableHead>
                    <TableHead className="w-[120px]">Result Max</TableHead>
                    <TableHead className="w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mechanicalProperties.map((prop) => (
                    <TableRow key={prop.id}>
                      <TableCell>
                        <Input
                          value={prop.propertyName}
                          onChange={(e) => updateMechanicalProperty(prop.id, "propertyName", e.target.value)}
                          placeholder="e.g. Yield Strength"
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={prop.unit}
                          onChange={(e) => updateMechanicalProperty(prop.id, "unit", e.target.value)}
                          placeholder="MPa"
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={prop.sortOrder}
                          onChange={(e) => updateMechanicalProperty(prop.id, "sortOrder", e.target.value)}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={prop.minValue}
                          onChange={(e) => updateMechanicalProperty(prop.id, "minValue", e.target.value)}
                          placeholder="0.00"
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={prop.maxValue}
                          onChange={(e) => updateMechanicalProperty(prop.id, "maxValue", e.target.value)}
                          placeholder="0.00"
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={prop.resultMin}
                          onChange={(e) => updateMechanicalProperty(prop.id, "resultMin", e.target.value)}
                          placeholder="0.00"
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={prop.resultMax}
                          onChange={(e) => updateMechanicalProperty(prop.id, "resultMax", e.target.value)}
                          placeholder="0.00"
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeMechanicalProperty(prop.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Impact Properties */}
      <Card>
        <CardHeader>
          <CardTitle>Impact Properties</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Test Temperature</Label>
              <Input
                placeholder="e.g. -29 deg C"
                value={impactProperties.testTemperature}
                onChange={(e) =>
                  setImpactProperties({ ...impactProperties, testTemperature: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Specimen Size</Label>
              <Input
                placeholder="e.g. 10x10mm"
                value={impactProperties.specimenSize}
                onChange={(e) =>
                  setImpactProperties({ ...impactProperties, specimenSize: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Minimum Energy (J)</Label>
              <Input
                placeholder="e.g. 27"
                value={impactProperties.minimumEnergy}
                onChange={(e) =>
                  setImpactProperties({ ...impactProperties, minimumEnergy: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Result Min</Label>
              <Input
                placeholder="0.00"
                value={impactProperties.resultMin}
                onChange={(e) =>
                  setImpactProperties({ ...impactProperties, resultMin: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Result Max</Label>
              <Input
                placeholder="0.00"
                value={impactProperties.resultMax}
                onChange={(e) =>
                  setImpactProperties({ ...impactProperties, resultMax: e.target.value })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push("/quality/mtc/material-specs")}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting
            ? "Saving..."
            : editId
              ? "Update Material Spec"
              : "Create Material Spec"}
        </Button>
      </div>
    </div>
  );
}

export default function MaterialSpecCreatePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <MaterialSpecCreateContent />
    </Suspense>
  );
}
