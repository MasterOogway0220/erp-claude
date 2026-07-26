"use client";

import { useEffect, useState } from "react";
import { SmartCombobox } from "./smart-combobox";
import { Label } from "@/components/ui/label";

interface ProductSpec {
  id: string;
  product: string;
  material: string | null;
  additionalSpec: string | null;
  ends: string | null;
  length: string | null;
  category: string | null;
  dimensionalStandard: { name: string } | null;
}

interface AdditionalSpecOption {
  id: string;
  product: string;
  specName: string;
}

interface ProductMaterialSelectProps {
  product: string;
  material: string;
  additionalSpec?: string;
  onProductChange: (value: string) => void;
  onMaterialChange: (value: string) => void;
  onAdditionalSpecChange?: (value: string) => void;
  onAutoFill?: (fields: {
    additionalSpec?: string;
    ends?: string;
    dimStandard?: string;
  }) => void;
  // Restrict the product list to one master category (PIPES/FITTINGS/FLANGES)
  category?: string;
  productLabel?: string;
  materialLabel?: string;
  additionalSpecLabel?: string;
  showAdditionalSpec?: boolean;
  className?: string;
  disabled?: boolean;
}

// Module-level caches
let cachedProducts: ProductSpec[] | null = null;
let fetchPromise: Promise<ProductSpec[]> | null = null;
let cachedAdditionalSpecs: AdditionalSpecOption[] | null = null;
let fetchAdditionalSpecsPromise: Promise<AdditionalSpecOption[]> | null = null;

function fetchProducts(): Promise<ProductSpec[]> {
  if (cachedProducts) return Promise.resolve(cachedProducts);
  if (fetchPromise) return fetchPromise;
  fetchPromise = fetch("/api/masters/products?limit=5000")
    .then((res) => { if (!res.ok) throw new Error("Failed"); return res.json(); })
    .then((data) => { cachedProducts = data.products || []; return cachedProducts!; })
    .catch(() => { fetchPromise = null; return [] as ProductSpec[]; });
  return fetchPromise;
}

function fetchAdditionalSpecs(): Promise<AdditionalSpecOption[]> {
  if (cachedAdditionalSpecs) return Promise.resolve(cachedAdditionalSpecs);
  if (fetchAdditionalSpecsPromise) return fetchAdditionalSpecsPromise;
  fetchAdditionalSpecsPromise = fetch("/api/masters/additional-specs")
    .then((res) => { if (!res.ok) throw new Error("Failed"); return res.json(); })
    .then((data) => { cachedAdditionalSpecs = data.specs || []; return cachedAdditionalSpecs!; })
    .catch(() => { fetchAdditionalSpecsPromise = null; return [] as AdditionalSpecOption[]; });
  return fetchAdditionalSpecsPromise;
}

export function ProductMaterialSelect({
  product,
  material,
  additionalSpec = "",
  onProductChange,
  onMaterialChange,
  onAdditionalSpecChange,
  onAutoFill,
  productLabel = "Product",
  materialLabel = "Material",
  additionalSpecLabel = "Additional Spec",
  showAdditionalSpec = false,
  category,
  className,
  disabled,
}: ProductMaterialSelectProps) {
  const [fetched, setFetched] = useState<ProductSpec[]>(cachedProducts || []);
  const [allAdditionalSpecs, setAllAdditionalSpecs] = useState<AdditionalSpecOption[]>(cachedAdditionalSpecs || []);

  useEffect(() => {
    fetchProducts().then(setFetched);
    fetchAdditionalSpecs().then(setAllAdditionalSpecs);
  }, []);

  const allProducts = category ? fetched.filter((p) => p.category === category) : fetched;

  const uniqueProducts = Array.from(new Set(allProducts.map((p) => p.product))).sort();

  const productMatches = product
    ? allProducts.filter((p) => p.product.toLowerCase() === product.toLowerCase())
    : [];

  const matchingMaterials = Array.from(
    new Set(productMatches.map((p) => p.material).filter(Boolean) as string[])
  ).sort();

  // Additional specs from the sub-master — show all specs (not filtered by product)
  const matchingAdditionalSpecs = (() => {
    // Show all specs from sub-master regardless of product
    const fromSubMaster = allAdditionalSpecs.map((s) => s.specName);
    if (fromSubMaster.length > 0) {
      return Array.from(new Set(fromSubMaster)).sort();
    }
    // Fallback: derive from product spec records (legacy)
    const filtered = material
      ? productMatches.filter((p) => p.material?.toLowerCase() === material.toLowerCase())
      : productMatches;
    return Array.from(
      new Set(filtered.map((p) => p.additionalSpec).filter(Boolean) as string[])
    ).sort();
  })();

  const tryAutoFill = (prod: string, mat: string) => {
    if (!onAutoFill || !prod) return;
    const matches = allProducts.filter(
      (p) =>
        p.product.toLowerCase() === prod.toLowerCase() &&
        (!mat || p.material?.toLowerCase() === mat.toLowerCase())
    );
    if (!matches.length) return;
    const unique = (vals: (string | null | undefined)[]) => {
      const set = Array.from(new Set(vals.filter(Boolean))) as string[];
      return set.length === 1 ? set[0] : undefined;
    };
    onAutoFill({
      additionalSpec: unique(matches.map((p) => p.additionalSpec)),
      ends: unique(matches.map((p) => p.ends)),
      dimStandard: unique(matches.map((p) => p.dimensionalStandard?.name)),
    });
  };

  const gridCols = showAdditionalSpec ? "grid-cols-3" : "grid-cols-2";

  return (
    <div className={className}>
      <div className={`grid ${gridCols} gap-4`}>
        <div className="grid gap-2">
          <Label>{productLabel}</Label>
          <SmartCombobox
            options={uniqueProducts}
            value={product}
            onSelect={(name) => {
              onProductChange(name);
              onMaterialChange("");
              if (onAdditionalSpecChange) onAdditionalSpecChange("");
              tryAutoFill(name, "");
            }}
            onChange={(text) => {
              onProductChange(text);
              if (text !== product) {
                onMaterialChange("");
                if (onAdditionalSpecChange) onAdditionalSpecChange("");
              }
            }}
            displayFn={(name) => name}
            filterFn={(name, query) => name.toLowerCase().includes(query.toLowerCase())}
            placeholder="e.g., C.S. SEAMLESS PIPE"
            disabled={disabled}
          />
        </div>

        <div className="grid gap-2">
          <Label>{materialLabel}</Label>
          <SmartCombobox
            options={matchingMaterials}
            value={material}
            onSelect={(name) => {
              onMaterialChange(name);
              if (onAdditionalSpecChange) onAdditionalSpecChange("");
              tryAutoFill(product, name);
            }}
            onChange={(text) => {
              onMaterialChange(text);
              if (text !== material && onAdditionalSpecChange) {
                onAdditionalSpecChange("");
              }
            }}
            displayFn={(name) => name}
            filterFn={(name, query) => name.toLowerCase().includes(query.toLowerCase())}
            placeholder="e.g., ASTM A106 GR. B"
            disabled={disabled}
          />
        </div>

        {showAdditionalSpec && onAdditionalSpecChange && (
          <div className="grid gap-2">
            <Label>{additionalSpecLabel}</Label>
            <SmartCombobox
              options={matchingAdditionalSpecs}
              value={additionalSpec}
              onSelect={(name) => onAdditionalSpecChange(name)}
              onChange={(text) => onAdditionalSpecChange(text)}
              displayFn={(name) => name}
              filterFn={(name, query) => name.toLowerCase().includes(query.toLowerCase())}
              placeholder="e.g., NACE MR0175"
              disabled={disabled}
            />
          </div>
        )}
      </div>
    </div>
  );
}
