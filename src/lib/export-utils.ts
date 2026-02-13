export interface ExportColumn {
  key: string;
  header: string;
  format?: (value: any) => string;
}

export function generateCSV(data: any[], columns: ExportColumn[]): string {
  const header = columns.map((c) => `"${c.header}"`).join(",");
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value = col.format ? col.format(row[col.key]) : row[col.key];
        const str = value !== null && value !== undefined ? String(value) : "";
        return `"${str.replace(/"/g, '""')}"`;
      })
      .join(",")
  );
  return [header, ...rows].join("\n");
}

export function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
