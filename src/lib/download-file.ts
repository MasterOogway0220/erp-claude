/**
 * Fetch a same-origin file URL and trigger a direct browser download
 * (no new tab, no inline viewer). The filename comes from the response's
 * Content-Disposition header, falling back to `fallbackName`.
 */
export async function downloadFile(url: string, fallbackName: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    let msg = "Failed to generate file";
    try {
      const e = await res.json();
      msg = e.error || e.detail || msg;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(msg);
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : fallbackName;
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
}
