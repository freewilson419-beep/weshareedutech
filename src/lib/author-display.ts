export interface ProfileLite {
  user_id?: string;
  username?: string | null;
  title?: string | null;
  surname?: string | null;
  affiliation?: string | null;
  department?: string | null;
  avatar_url?: string | null;
}

export function authorName(p: ProfileLite | null | undefined, isAnonymous?: boolean): string {
  if (isAnonymous) return "Anonymous contributor";
  if (!p) return "Anonymous";
  return `${p.title ? p.title + " " : ""}${p.username || p.surname || "Anonymous"}`;
}

export function authorAvatar(p: ProfileLite | null | undefined, isAnonymous?: boolean): string {
  if (isAnonymous || !p?.avatar_url) return "";
  return p.avatar_url;
}

export function initialsFor(name: string): string {
  return name
    .replace(/^Dr\.?\s+|^Prof\.?\s+|^Mr\.?\s+|^Mrs\.?\s+|^Ms\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "?";
}
