import { useEffect, useState } from "react";

const DATA_URL = `${import.meta.env.BASE_URL}data/`;
const cache = new Map<string, Promise<unknown>>();

/** Fetch a JSON file from the data folder once per page load. */
export function loadJson<T>(path: string): Promise<T> {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(DATA_URL + path).then((response) => {
        if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
        return response.json();
      }),
    );
  }
  return cache.get(path) as Promise<T>;
}

/** Load and concatenate several JSON array files. A missing file counts as empty. */
export async function loadAll<T>(paths: string[]): Promise<T[]> {
  const parts = await Promise.all(paths.map((p) => loadJson<T[]>(p).catch(() => [] as T[])));
  return parts.flat();
}

export type LoadState<T> = { status: "loading" } | { status: "error"; error: string } | { status: "ready"; data: T };

export function useLoad<T>(load: () => Promise<T>, deps: unknown[]): LoadState<T> {
  const [state, setState] = useState<LoadState<T>>({ status: "loading" });
  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    load()
      .then((data) => alive && setState({ status: "ready", data }))
      .catch((error) => alive && setState({ status: "error", error: String(error) }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}
