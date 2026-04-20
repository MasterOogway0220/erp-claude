"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Inbox,
} from "lucide-react";
import { useState, useMemo } from "react";

export interface Column<T> {
  key: string;
  header: string;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchKey?: string;
  searchPlaceholder?: string;
  pageSize?: number;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search...",
  pageSize = 10,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    if (!search || !searchKey) return data;
    return data.filter((row) => {
      const value = row[searchKey];
      return String(value ?? "")
        .toLowerCase()
        .includes(search.toLowerCase());
    });
  }, [data, search, searchKey]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = String(a[sortKey] ?? "");
      const bVal = String(b[sortKey] ?? "");
      const cmp = aVal.localeCompare(bVal);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // Generate visible page numbers with ellipses
  const getPageNumbers = (): (number | "ellipsis")[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i);
    }

    const pages: (number | "ellipsis")[] = [];

    // Always show first page
    pages.push(0);

    if (page > 2) {
      pages.push("ellipsis");
    }

    // Show pages around current
    const start = Math.max(1, page - 1);
    const end = Math.min(totalPages - 2, page + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (page < totalPages - 3) {
      pages.push("ellipsis");
    }

    // Always show last page
    if (totalPages > 1) {
      pages.push(totalPages - 1);
    }

    return pages;
  };

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Top bar: search + result count */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {searchKey && (
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="pl-9 h-9 rounded-md bg-muted/30 border-border/60 text-sm placeholder:text-muted-foreground/50 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring/30 focus-visible:ring-offset-0 transition-colors"
            />
          </div>
        )}
        <p className="text-xs text-muted-foreground tabular-nums shrink-0">
          {sorted.length} {sorted.length === 1 ? "record" : "records"}
          {search && ` matching "${search}"`}
        </p>
      </div>

      {/* Table */}
      <div className="rounded-md border border-border/60 overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/60">
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={`font-semibold text-[11px] uppercase tracking-wide text-muted-foreground/70 h-9 px-4 ${
                      col.sortable
                        ? "cursor-pointer select-none hover:text-foreground transition-colors"
                        : ""
                    }`}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <span className="flex items-center gap-1">
                      {col.header}
                      {col.sortable && (
                        <span className="opacity-40 group-hover:opacity-70">
                          {sortKey === col.key ? (
                            sortDir === "asc" ? (
                              <ArrowUp className="h-3 w-3 text-foreground opacity-100" />
                            ) : (
                              <ArrowDown className="h-3 w-3 text-foreground opacity-100" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3" />
                          )}
                        </span>
                      )}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={columns.length}
                    className="h-48"
                  >
                    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground/60">
                      <div className="rounded-full bg-muted/50 p-3">
                        <Inbox className="h-8 w-8 stroke-[1.25]" />
                      </div>
                      <div className="text-center space-y-0.5">
                        <p className="text-sm font-medium text-muted-foreground">No results found</p>
                        <p className="text-xs text-muted-foreground/60">
                          {search
                            ? "Try adjusting your search to find what you are looking for."
                            : "There are no records to display yet."}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((row, i) => (
                  <TableRow
                    key={i}
                    className={`transition-colors duration-100 border-border/40 ${
                      i % 2 === 0 ? "bg-card" : "bg-muted/15"
                    } hover:bg-accent/30`}
                  >
                    {columns.map((col) => (
                      <TableCell key={col.key} className="py-3 px-4 text-sm align-middle">
                        {col.cell
                          ? col.cell(row)
                          : String(row[col.key] ?? "")}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-1">
          <p className="text-xs text-muted-foreground/70 tabular-nums">
            Showing{" "}
            <span className="font-medium text-muted-foreground">
              {page * pageSize + 1}
            </span>
            {"\u2013"}
            <span className="font-medium text-muted-foreground">
              {Math.min((page + 1) * pageSize, sorted.length)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-muted-foreground">
              {sorted.length}
            </span>
          </p>
          <div className="flex items-center gap-0.5">
            {/* First page */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setPage(0)}
              disabled={page === 0}
              title="First page"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>

            {/* Previous page */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setPage(page - 1)}
              disabled={page === 0}
              title="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>

            {/* Page numbers */}
            <div className="hidden sm:flex items-center gap-0.5 mx-0.5">
              {getPageNumbers().map((p, idx) =>
                p === "ellipsis" ? (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-1 text-xs text-muted-foreground/50"
                  >
                    ...
                  </span>
                ) : (
                  <Button
                    key={p}
                    variant={page === p ? "default" : "ghost"}
                    size="icon"
                    className={`h-7 w-7 text-xs ${
                      page === p
                        ? ""
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setPage(p)}
                  >
                    {p + 1}
                  </Button>
                )
              )}
            </div>

            {/* Mobile page indicator */}
            <span className="sm:hidden text-xs text-muted-foreground mx-2 tabular-nums">
              {page + 1} / {totalPages}
            </span>

            {/* Next page */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages - 1}
              title="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>

            {/* Last page */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
              title="Last page"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
