"use client";

import { useEffect, useState } from "react";
import { SmartCombobox } from "./smart-combobox";

interface Size {
  id: string;
  sizeLabel: string;
  od: number;
  wt: number;
  weight: number;
  pipeType: string;
}

interface SizeSelectProps {
  value: string;
  onChange: (text: string) => void;
  onSelect: (size: {
    id: string;
    sizeLabel: string;
    od: number;
    wt: number;
    weight: number;
  }) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// Module-level cache
let cachedSizes: Size[] | null = null;
let fetchPromise: Promise<Size[]> | null = null;

function fetchSizes(): Promise<Size[]> {
  if (cachedSizes) return Promise.resolve(cachedSizes);
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch("/api/masters/sizes")
    .then((res) => {
      if (!res.ok) throw new Error("Failed to fetch sizes");
      return res.json();
    })
    .then((data) => {
      cachedSizes = data.sizes || [];
      return cachedSizes!;
    })
    .catch(() => {
      fetchPromise = null;
      return [] as Size[];
    });

  return fetchPromise;
}

export function SizeSelect({
  value,
  onChange,
  onSelect,
  label = "Size",
  placeholder = "Search size...",
  className,
  disabled,
}: SizeSelectProps) {
  const [sizes, setSizes] = useState<Size[]>(cachedSizes || []);

  useEffect(() => {
    fetchSizes().then(setSizes);
  }, []);

  return (
    <div className={className}>
      {label && (
        <div className="grid gap-2">
          <SmartCombobox
            options={sizes}
            value={value}
            onSelect={(size) => {
              onSelect({
                id: size.id,
                sizeLabel: size.sizeLabel,
                od: size.od,
                wt: size.wt,
                weight: size.weight,
              });
            }}
            onChange={onChange}
            displayFn={(size) =>
              `${size.sizeLabel} (OD: ${size.od}mm, WT: ${size.wt}mm, Wt: ${size.weight}kg/m)`
            }
            filterFn={(size, query) => {
              const q = query.toLowerCase();
              return (
                size.sizeLabel.toLowerCase().includes(q) ||
                `${size.od}`.includes(q) ||
                `${size.wt}`.includes(q)
              );
            }}
            placeholder={placeholder}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}
