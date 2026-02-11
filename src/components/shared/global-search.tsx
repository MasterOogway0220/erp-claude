"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  FileQuestion,
  FileText,
  ShoppingCart,
  Package,
  ClipboardCheck,
  Warehouse,
  Truck,
  CreditCard,
  Users,
  Building,
} from "lucide-react";

// ==================== Types ====================

interface SearchResult {
  id: string;
  type: string;
  label: string;
  description: string;
  href: string;
}

interface GroupedResults {
  [type: string]: SearchResult[];
}

// ==================== Entity icons ====================

const entityIcons: Record<string, React.ReactNode> = {
  Enquiry: <FileQuestion className="h-4 w-4 text-blue-500" />,
  Quotation: <FileText className="h-4 w-4 text-green-500" />,
  "Sales Order": <ShoppingCart className="h-4 w-4 text-purple-500" />,
  "Purchase Order": <Package className="h-4 w-4 text-orange-500" />,
  GRN: <Warehouse className="h-4 w-4 text-teal-500" />,
  Inspection: <ClipboardCheck className="h-4 w-4 text-yellow-600" />,
  "Packing List": <Package className="h-4 w-4 text-indigo-500" />,
  "Dispatch Note": <Truck className="h-4 w-4 text-emerald-500" />,
  Invoice: <FileText className="h-4 w-4 text-rose-500" />,
  Payment: <CreditCard className="h-4 w-4 text-cyan-500" />,
  Customer: <Building className="h-4 w-4 text-slate-500" />,
  Vendor: <Users className="h-4 w-4 text-amber-500" />,
};

// ==================== Component ====================

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Group results by entity type
  const grouped: GroupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as GroupedResults);

  const flatResults = results;

  // ==================== Keyboard shortcut ====================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // ==================== Debounced search ====================

  const fetchResults = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery.trim())}`
      );
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(() => {
      fetchResults(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, fetchResults]);

  // ==================== Navigate to result ====================

  const navigateToResult = (result: SearchResult) => {
    setOpen(false);
    router.push(result.href);
  };

  // ==================== Keyboard navigation ====================

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < flatResults.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : flatResults.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatResults[selectedIndex]) {
        navigateToResult(flatResults[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // ==================== Render ====================

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors w-full max-w-xs"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">&#8984;</span>K
        </kbd>
      </button>

      {/* Search dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-lg p-0 gap-0 overflow-hidden"
          showCloseButton={false}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Search</DialogTitle>
          </DialogHeader>

          {/* Search input */}
          <div className="flex items-center border-b px-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search enquiries, quotations, orders, stock..."
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none h-11"
            />
          </div>

          {/* Results area */}
          <div className="max-h-[360px] overflow-y-auto">
            {loading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            )}

            {!loading && query.trim() && results.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No results found for &quot;{query}&quot;
              </div>
            )}

            {!loading && !query.trim() && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Start typing to search across the system
              </div>
            )}

            {!loading && results.length > 0 && (
              <div className="py-2">
                {Object.entries(grouped).map(([type, items]) => (
                  <div key={type}>
                    <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {type}
                    </div>
                    {items.map((result) => {
                      const globalIndex = flatResults.indexOf(result);
                      return (
                        <button
                          key={result.id}
                          className={`flex items-center gap-3 w-full px-3 py-2 text-left text-sm transition-colors ${
                            globalIndex === selectedIndex
                              ? "bg-accent text-accent-foreground"
                              : "hover:bg-accent/50"
                          }`}
                          onClick={() => navigateToResult(result)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                        >
                          <div className="shrink-0">
                            {entityIcons[result.type] || (
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {result.label}
                            </p>
                            {result.description && (
                              <p className="text-xs text-muted-foreground truncate">
                                {result.description}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
                &#8593;&#8595;
              </kbd>
              <span>Navigate</span>
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
                Enter
              </kbd>
              <span>Select</span>
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
                Esc
              </kbd>
              <span>Close</span>
            </div>
            {results.length > 0 && (
              <span>
                {results.length} result{results.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
