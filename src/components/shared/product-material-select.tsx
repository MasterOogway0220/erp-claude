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
    length?: string;
  }) => void;
  productLabel?: string;
  materialLabel?: string;
  additionalSpecLabel?: string;
  showAdditionalSpec?: boolean;
  className?: string;
  disabled?: boolean;
}

// Products that share the same material/spec pool.
// When any product in a group is selected, materials from ALL products in that group are shown.
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

// Module-level cache so all instances share one fetch
let cachedProducts: ProductSpec[] | null = null;
let fetchPromise: Promise<ProductSpec[]> | null = null;

function fetchProducts(): Promise<ProductSpec[]> {
  if (cachedProducts) return Promise.resolve(cachedProducts);
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch("/api/masters/products?limit=500")
    .then((res) => {
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    })
    .then((data) => {
      cachedProducts = data.products || [];
      return cachedProducts!;
    })
    .catch(() => {
      fetchPromise = null;
      return [] as ProductSpec[];
    });

  return fetchPromise;
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
  const [allProducts, setAllProducts] = useState<ProductSpec[]>(
    cachedProducts || []
  );

  useEffect(() => {
    fetchProducts().then(setAllProducts);
  }, []);

  // Unique product names for the product dropdown
  const uniqueProducts = Array.from(
    new Set(allProducts.map((p) => p.product))
  ).sort();

  // Records matching the selected product OR any product in its group (case-insensitive)
  const productGroup = product ? getProductGroup(product) : [];
  const productMatches = product
    ? allProducts.filter((p) =>
        productGroup.some(
          (g) => g.toLowerCase() === p.product.toLowerCase()
        )
      )
    : [];

  // Materials: only show when a valid product is selected
  const matchingMaterials = Array.from(
    new Set(
      productMatches.map((p) => p.material).filter(Boolean) as string[]
    )
  ).sort();

  // Additional specs: show when product is selected.
  // If material is also selected, filter by product+material.
  // If no material is selected (or product has no material records), show all specs for the product.
  const matchingAdditionalSpecs = (() => {
    if (!product) return [];
    const filtered = material
      ? productMatches.filter(
          (p) => p.material?.toLowerCase() === material.toLowerCase()
        )
      : productMatches;
    return Array.from(
      new Set(
        filtered.map((p) => p.additionalSpec).filter(Boolean) as string[]
      )
    ).sort();
  })();

  // When product+material match records, auto-fill specs.
  // Only auto-fill additionalSpec when there's exactly one unique value (no ambiguity).
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
    const firstMatch = matches[0];
    onAutoFill({
      additionalSpec: uniqueSpecs.length === 1 ? (uniqueSpecs[0] as string) : undefined,
      ends: firstMatch.ends || undefined,
      length: firstMatch.length || undefined,
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
              // Reset dependent fields when product changes
              onMaterialChange("");
              if (onAdditionalSpecChange) onAdditionalSpecChange("");
              // Try auto-fill for products that have no material requirement
              tryAutoFill(name, "");
            }}
            onChange={(text) => {
              onProductChange(text);
              // Reset dependent fields when product is being retyped
              if (text !== product) {
                onMaterialChange("");
                if (onAdditionalSpecChange) onAdditionalSpecChange("");
              }
            }}
            displayFn={(name) => name}
            filterFn={(name, query) =>
              name.toLowerCase().includes(query.toLowerCase())
            }
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
              // Reset additionalSpec when material changes
              if (onAdditionalSpecChange) onAdditionalSpecChange("");
              tryAutoFill(product, name);
            }}
            onChange={(text) => {
              onMaterialChange(text);
              // Reset additionalSpec when material is being retyped
              if (text !== material && onAdditionalSpecChange) {
                onAdditionalSpecChange("");
              }
            }}
            displayFn={(name) => name}
            filterFn={(name, query) =>
              name.toLowerCase().includes(query.toLowerCase())
            }
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
              onSelect={(name) => {
                onAdditionalSpecChange(name);
                // When additional spec is selected, try to auto-fill ends/length
                if (onAutoFill && product) {
                  const group = getProductGroup(product);
                  const match = allProducts.find(
                    (p) =>
                      group.some((g) => g.toLowerCase() === p.product.toLowerCase()) &&
                      (!material || p.material?.toLowerCase() === material.toLowerCase()) &&
                      p.additionalSpec?.toLowerCase() === name.toLowerCase()
                  );
                  if (match) {
                    onAutoFill({
                      ends: match.ends || undefined,
                      length: match.length || undefined,
                    });
                  }
                }
              }}
              onChange={(text) => {
                onAdditionalSpecChange(text);
              }}
              displayFn={(name) => name}
              filterFn={(name, query) =>
                name.toLowerCase().includes(query.toLowerCase())
              }
              placeholder="e.g., NACE MR0175"
              disabled={disabled}
            />
          </div>
        )}
      </div>
    </div>
  );
}
