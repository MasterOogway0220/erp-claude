"use client";

import { useEffect, useState } from "react";
import { SmartCombobox } from "./smart-combobox";

interface Flange {
  id: string;
  type: string;
  size: string;
  rating: string;
  materialGrade: string;
  standard: string | null;
  facing: string | null;
  schedule: string | null;
  description: string | null;
}

interface FlangeSelectProps {
  value: string;
  onChange: (text: string) => void;
  onSelect: (flange: Flange) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// Module-level cache
let cachedFlanges: Flange[] | null = null;
let fetchPromise: Promise<Flange[]> | null = null;

function fetchFlanges(): Promise<Flange[]> {
  if (cachedFlanges) return Promise.resolve(cachedFlanges);
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch("/api/masters/flanges")
    .then((res) => {
      if (!res.ok) throw new Error("Failed to fetch flanges");
      return res.json();
    })
    .then((data) => {
      cachedFlanges = data.flanges || [];
      return cachedFlanges!;
    })
    .catch(() => {
      fetchPromise = null;
      return [] as Flange[];
    });

  return fetchPromise;
}

export function FlangeSelect({
  value,
  onChange,
  onSelect,
  placeholder = "Search flange...",
  className,
  disabled,
}: FlangeSelectProps) {
  const [flanges, setFlanges] = useState<Flange[]>(cachedFlanges || []);

  useEffect(() => {
    fetchFlanges().then(setFlanges);
  }, []);

  return (
    <div className={className}>
      <SmartCombobox
        options={flanges}
        value={value}
        onSelect={(flange) => onSelect(flange)}
        onChange={onChange}
        displayFn={(f) =>
          `${f.type} ${f.size} ${f.rating}# ${f.facing || ""} ${f.materialGrade}`.replace(/\s+/g, " ").trim()
        }
        filterFn={(f, query) => {
          const q = query.toLowerCase();
          return (
            f.type.toLowerCase().includes(q) ||
            f.size.toLowerCase().includes(q) ||
            f.rating.toLowerCase().includes(q) ||
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
