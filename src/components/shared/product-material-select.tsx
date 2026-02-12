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

  // Materials that match the selected product
  const matchingMaterials = product
    ? Array.from(
        new Set(
          allProducts
            .filter(
              (p) => p.product.toLowerCase() === product.toLowerCase()
            )
            .map((p) => p.material)
            .filter(Boolean) as string[]
        )
      ).sort()
    : Array.from(
        new Set(
          allProducts.map((p) => p.material).filter(Boolean) as string[]
        )
      ).sort();

  // Additional specs filtered by selected product + material
  const matchingAdditionalSpecs = (() => {
    let filtered = allProducts;
    if (product) {
      filtered = filtered.filter(
        (p) => p.product.toLowerCase() === product.toLowerCase()
      );
    }
    if (material) {
      filtered = filtered.filter(
        (p) => p.material?.toLowerCase() === material.toLowerCase()
      );
    }
    return Array.from(
      new Set(
        filtered.map((p) => p.additionalSpec).filter(Boolean) as string[]
      )
    ).sort();
  })();

  // When both product+material match a record, auto-fill specs
  const tryAutoFill = (prod: string, mat: string) => {
    if (!onAutoFill || !prod || !mat) return;
    const match = allProducts.find(
      (p) =>
        p.product.toLowerCase() === prod.toLowerCase() &&
        p.material?.toLowerCase() === mat.toLowerCase()
    );
    if (match) {
      onAutoFill({
        additionalSpec: match.additionalSpec || undefined,
        ends: match.ends || undefined,
        length: match.length || undefined,
      });
    }
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
              tryAutoFill(name, material);
            }}
            onChange={(text) => {
              onProductChange(text);
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
              tryAutoFill(product, name);
            }}
            onChange={(text) => {
              onMaterialChange(text);
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
                if (onAutoFill && product && material) {
                  const match = allProducts.find(
                    (p) =>
                      p.product.toLowerCase() === product.toLowerCase() &&
                      p.material?.toLowerCase() === material.toLowerCase() &&
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
