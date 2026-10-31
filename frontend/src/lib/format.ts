/** NeuroMorpho still publishes http:// image links; its site serves them over https. */
export function secureUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  return url.replace(/^http:\/\/(www\.)?neuromorpho\.org/, "https://neuromorpho.org");
}

export function formatDate(iso?: string): string | undefined {
  if (!iso) return undefined;
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? undefined
    : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function fileName(url?: string | null): string {
  if (!url) return "";
  return decodeURIComponent(url.split(/[?#]/)[0].split("/").pop() ?? "");
}

/** Lower-cased text of the given fields, for free-text search. */
export function searchText(...values: unknown[]): string {
  return values
    .flat(2)
    .filter((v) => v !== null && v !== undefined)
    .map((v) => (typeof v === "object" ? Object.values(v as object).join(" ") : String(v)))
    .join(" ")
    .toLowerCase();
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n.toLocaleString("en")} ${n === 1 ? one : many}`;
}
