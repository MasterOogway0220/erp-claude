// Row limit for list endpoints. The client asks for `pageSize`; without it, or
// with a nonsense value, the default applies. The cap keeps one request from
// pulling the whole table.
export function takeFrom(searchParams: URLSearchParams, fallback = 500, max = 500): number {
  const n = parseInt(searchParams.get("pageSize") ?? "", 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : fallback;
}
