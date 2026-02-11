"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SmartComboboxProps<T> {
  options: T[];
  value: string;
  onSelect: (item: T) => void;
  onChange: (text: string) => void;
  displayFn: (item: T) => string;
  filterFn: (item: T, query: string) => boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function SmartCombobox<T>({
  options,
  value,
  onSelect,
  onChange,
  displayFn,
  filterFn,
  placeholder,
  className,
  disabled,
}: SmartComboboxProps<T>) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = value
    ? options.filter((item) => filterFn(item, value))
    : options;

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const items = listRef.current.children;
      if (items[highlightIndex]) {
        (items[highlightIndex] as HTMLElement).scrollIntoView({
          block: "nearest",
        });
      }
    }
  }, [highlightIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          setOpen(true);
          setHighlightIndex(0);
          e.preventDefault();
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightIndex((prev) =>
            prev < filtered.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightIndex((prev) =>
            prev > 0 ? prev - 1 : filtered.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (highlightIndex >= 0 && highlightIndex < filtered.length) {
            onSelect(filtered[highlightIndex]);
            setOpen(false);
            setHighlightIndex(-1);
          }
          break;
        case "Escape":
          setOpen(false);
          setHighlightIndex(-1);
          break;
      }
    },
    [open, filtered, highlightIndex, onSelect]
  );

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlightIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="h-9"
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md"
        >
          {filtered.slice(0, 50).map((item, i) => (
            <div
              key={i}
              className={cn(
                "cursor-pointer rounded-sm px-2 py-1.5 text-sm",
                i === highlightIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(item);
                setOpen(false);
                setHighlightIndex(-1);
              }}
              onMouseEnter={() => setHighlightIndex(i)}
            >
              {displayFn(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
