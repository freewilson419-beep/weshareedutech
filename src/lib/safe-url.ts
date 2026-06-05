// Returns the URL if it is a safe http(s) or same-origin path. Otherwise returns "#".
// Prevents `javascript:` and `data:` href XSS in user-supplied links.
export function safeHref(url: string | null | undefined): string {
  if (!url) return "#";
  const trimmed = String(url).trim();
  if (!trimmed) return "#";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return trimmed;
  return "#";
}
