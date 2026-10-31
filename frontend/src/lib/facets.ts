// Client-side faceted search: OR within a facet, AND across facets, plus free text.

export interface Facet<T> {
  key: string;
  label: string;
  values: (item: T) => string[];
}

export type Selection = Record<string, string[]>;

export function toList(value: unknown): string[] {
  if (value === null || value === undefined || value === "") return [];
  return (Array.isArray(value) ? value : [value]).map(String).filter(Boolean);
}

function matchesFacet<T>(item: T, facet: Facet<T>, wanted: string[] | undefined) {
  if (!wanted || wanted.length === 0) return true;
  const values = facet.values(item);
  return wanted.some((w) => values.includes(w));
}

export function matchesText(text: string, query: string) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return terms.every((t) => text.includes(t));
}

export function filterItems<T>(
  items: T[],
  facets: Facet<T>[],
  selection: Selection,
  query: string,
  text: (item: T) => string,
  except?: string,
): T[] {
  return items.filter(
    (item) =>
      facets.every((f) => f.key === except || matchesFacet(item, f, selection[f.key])) &&
      (!query || matchesText(text(item), query)),
  );
}

/** Value counts for one facet, computed with every other active filter applied. */
export function facetCounts<T>(
  items: T[],
  facets: Facet<T>[],
  facet: Facet<T>,
  selection: Selection,
  query: string,
  text: (item: T) => string,
): [string, number][] {
  const counts = new Map<string, number>();
  for (const item of filterItems(items, facets, selection, query, text, facet.key)) {
    for (const value of new Set(facet.values(item))) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  for (const value of selection[facet.key] ?? []) if (!counts.has(value)) counts.set(value, 0);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
