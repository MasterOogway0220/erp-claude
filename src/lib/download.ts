// Client-side file download that fetches the file as a blob before handing it
// to the browser. Unlike a raw <a href> click, an HTTP failure surfaces here
// as a catchable error instead of the browser's opaque "download error", and
// a failed attempt is retried once — serverless PDF renders routinely fail or
// stall only on the cold first hit and succeed immediately after.
export async function downloadFile(url: string): Promise<void> {
  const attempt = async () => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed (HTTP ${res.status})`);
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") || "";
    const match = /filename="?([^";]+)"?/.exec(disposition);
    const filename = match?.[1] || url.split("/").pop()?.split("?")[0] || "download";
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  };
  try {
    await attempt();
  } catch {
    await new Promise((r) => setTimeout(r, 1500));
    await attempt();
  }
}
