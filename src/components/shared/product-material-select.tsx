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
  }) => void;
  productLabel?: string;
  materialLabel?: string;
  additionalSpecLabel?: string;
  showAdditionalSpec?: boolean;
  className?: string;
  disabled?: boolean;
}

// Products that share the same material/spec pool.
const PRODUCT_GROUPS: string[][] = [
  ["A.S. EFSW PIPE", "A.S. LSAW PIPE"],
  ["C.S. EFSW PIPE", "C.S. LSAW PIPE"],
  ["S.S. EFSW PIPE", "S.S. LSAW PIPE"],
  ["D.S. EFSW PIPE", "D.S. LSAW PIPE"],
];

function getProductGroup(product: string): string[] {
  const p = product.toUpperCase();
  for (const group of PRODUCT_GROUPS) {
    if (group.some((g) => g.toUpperCase() === p)) {
      return group;
    }
  }
  return [product];
}

// Module-level caches
let cachedProducts: ProductSpec[] | null = null;
let fetchPromise: Promise<ProductSpec[]> | null = null;
let cachedAdditionalSpecs: AdditionalSpecOption[] | null = null;
let fetchAdditionalSpecsPromise: Promise<AdditionalSpecOption[]> | null = null;

function fetchProducts(): Promise<ProductSpec[]> {
  if (cachedProducts) return Promise.resolve(cachedProducts);
  if (fetchPromise) return fetchPromise;
  fetchPromise = fetch("/api/masters/products?limit=500")
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
  className,
  disabled,
}: ProductMaterialSelectProps) {
  const [allProducts, setAllProducts] = useState<ProductSpec[]>(cachedProducts || []);
  const [allAdditionalSpecs, setAllAdditionalSpecs] = useState<AdditionalSpecOption[]>(cachedAdditionalSpecs || []);

  useEffect(() => {
    fetchProducts().then(setAllProducts);
    fetchAdditionalSpecs().then(setAllAdditionalSpecs);
  }, []);

  const uniqueProducts = Array.from(new Set(allProducts.map((p) => p.product))).sort();

  const productGroup = product ? getProductGroup(product) : [];
  const productMatches = product
    ? allProducts.filter((p) =>
        productGroup.some((g) => g.toLowerCase() === p.product.toLowerCase())
      )
    : [];

  const matchingMaterials = Array.from(
    new Set(productMatches.map((p) => p.material).filter(Boolean) as string[])
  ).sort();

  // Additional specs from the sub-master — matched by product name
  const matchingAdditionalSpecs = (() => {
    if (!product) return [];
    // Check sub-master first
    const fromSubMaster = allAdditionalSpecs
      .filter((s) => productGroup.some((g) => g.toLowerCase() === s.product.toLowerCase()))
      .map((s) => s.specName);
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
    const group = getProductGroup(prod);
    const matches = allProducts.filter(
      (p) =>
        group.some((g) => g.toLowerCase() === p.product.toLowerCase()) &&
        (!mat || p.material?.toLowerCase() === mat.toLowerCase())
    );
    if (!matches.length) return;
    const uniqueSpecs = Array.from(
      new Set(matches.map((p) => p.additionalSpec).filter(Boolean))
    );
    onAutoFill({
      additionalSpec: uniqueSpecs.length === 1 ? (uniqueSpecs[0] as string) : undefined,
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
