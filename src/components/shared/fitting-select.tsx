"use client";

import { useEffect, useState } from "react";
import { SmartCombobox } from "./smart-combobox";

interface Fitting {
  id: string;
  type: string;
  size: string;
  schedule: string | null;
  materialGrade: string;
  standard: string | null;
  endType: string | null;
  rating: string | null;
  description: string | null;
}

interface FittingSelectProps {
  value: string;
  onChange: (text: string) => void;
  onSelect: (fitting: Fitting) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// Module-level cache
let cachedFittings: Fitting[] | null = null;
let fetchPromise: Promise<Fitting[]> | null = null;

function fetchFittings(): Promise<Fitting[]> {
  if (cachedFittings) return Promise.resolve(cachedFittings);
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch("/api/masters/fittings")
    .then((res) => {
      if (!res.ok) throw new Error("Failed to fetch fittings");
      return res.json();
    })
    .then((data) => {
      cachedFittings = data.fittings || [];
      return cachedFittings!;
    })
    .catch(() => {
      fetchPromise = null;
      return [] as Fitting[];
    });

  return fetchPromise;
}

export function FittingSelect({
  value,
  onChange,
  onSelect,
  placeholder = "Search fitting...",
  className,
  disabled,
}: FittingSelectProps) {
  const [fittings, setFittings] = useState<Fitting[]>(cachedFittings || []);

  useEffect(() => {
    fetchFittings().then(setFittings);
  }, []);

  return (
    <div className={className}>
      <SmartCombobox
        options={fittings}
        value={value}
        onSelect={(fitting) => onSelect(fitting)}
        onChange={onChange}
        displayFn={(f) =>
          `${f.type} ${f.size} ${f.schedule || ""} ${f.endType || ""} ${f.materialGrade}`.replace(/\s+/g, " ").trim()
        }
        filterFn={(f, query) => {
          const q = query.toLowerCase();
          return (
            f.type.toLowerCase().includes(q) ||
            f.size.toLowerCase().includes(q) ||
            f.materialGrade.toLowerCase().includes(q) ||
            (f.standard || "").toLowerCase().includes(q) ||
            (f.description || "").toLowerCase().includes(q)
          );
        }}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}
