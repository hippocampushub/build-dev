import type { ComponentType } from "react";
import type { Connection, Model, Morphology, Trace } from "./types";
import { toList, type Facet } from "./facets";
import { searchText } from "./format";
import { MorphologyCard, MorphologyDetail, MorphologyFooter } from "../components/records/Morphology";
import { TraceCard, TraceDetail, TraceFooter } from "../components/records/Trace";
import { ModelCard, ModelDetail, ModelFooter } from "../components/records/Model";
import { ConnectionCard, ConnectionDetail, ConnectionFooter } from "../components/records/Connection";

export interface SortOption<T> {
  key: string;
  label: string;
  compare: (a: T, b: T) => number;
}

export interface Collection<T extends { source_id: string; name: string }> {
  key: string;
  path: string;
  navLabel: string;
  title: string;
  eyebrow: string;
  /** "data" collections are listed under the Data section (/data), as on the previous site */
  group: "data" | "models";
  lead: string;
  noun: [string, string];
  accent: string;
  files: string[];
  layout: "grid" | "list";
  pageSize: number;
  facets: Facet<T>[];
  text: (item: T) => string;
  sorts: SortOption<T>[];
  Card: ComponentType<{ item: T; onOpen: () => void }>;
  Detail: ComponentType<{ item: T }>;
  Footer: ComponentType<{ item: T }>;
  detailEyebrow: (item: T) => string;
}

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, "en", { numeric: true });
const nameSorts = <T extends { name: string }>(): SortOption<T>[] => [
  { key: "name", label: "Name A–Z", compare: byName },
  { key: "name-desc", label: "Name Z–A", compare: (a, b) => byName(b, a) },
];

const morphologies: Collection<Morphology> = {
  key: "morphology",
  path: "/data/morphology",
  navLabel: "Morphologies",
  title: "Morphologies",
  eyebrow: "Data",
  group: "data",
  lead: "Digitally reconstructed hippocampal neurons from the Hippocampus Hub and NeuroMorpho.org. Choose one as the starting morphology for a single-cell model.",
  noun: ["morphology", "morphologies"],
  accent: "var(--c-morphology)",
  files: ["internal/morphologies.json", "neuromorpho/morphologies.json"],
  layout: "grid",
  pageSize: 24,
  facets: [
    { key: "species", label: "Species", values: (m) => toList(m.species) },
    { key: "region", label: "Region", values: (m) => toList(m.secondary_region) },
    { key: "cell", label: "Cell type", values: (m) => toList(m.cell_type) },
    { key: "source", label: "Source", values: (m) => toList(m.source) },
    { key: "archive", label: "Archive", values: (m) => toList(m.archive) },
  ],
  text: (m) => searchText(m.name, m.cell_type, m.secondary_region, m.species, m.archive, m.source, m.etype),
  sorts: nameSorts(),
  Card: MorphologyCard,
  Detail: MorphologyDetail,
  Footer: MorphologyFooter,
  detailEyebrow: (m) => `Morphology · ${m.source}`,
};

const traces: Collection<Trace> = {
  key: "electrophysiology",
  path: "/data/electrophysiology",
  navLabel: "Electrophysiology",
  title: "Electrophysiology",
  eyebrow: "Data",
  group: "data",
  lead: "Patch-clamp recordings of rat CA1 neurons (Migliore et al. 2018), as Axon Binary Files ready to be used as optimization targets in the HH Neuron Builder.",
  noun: ["trace", "traces"],
  accent: "var(--c-electrophysiology)",
  files: ["internal/electrophysiologies.json"],
  layout: "grid",
  pageSize: 24,
  facets: [
    { key: "cell", label: "Cell type", values: (t) => toList(t.cell_type) },
    { key: "etype", label: "E-type", values: (t) => toList(t.etype) },
    { key: "region", label: "Region", values: (t) => toList(t.secondary_region) },
  ],
  text: (t) => searchText(t.name, t.cell_type, t.etype, t.secondary_region),
  sorts: nameSorts(),
  Card: TraceCard,
  Detail: TraceDetail,
  Footer: TraceFooter,
  detailEyebrow: (t) => `Electrophysiology · ${t.source}`,
};

const connections: Collection<Connection> = {
  key: "connection",
  path: "/data/connection",
  navLabel: "Connections",
  title: "Connections",
  eyebrow: "Data",
  group: "data",
  lead: "Documented synaptic connections between hippocampal neuron types from Hippocampome.org, with the layers where axons and dendrites meet.",
  noun: ["connection", "connections"],
  accent: "var(--c-connection)",
  files: ["hippocampome/connections.json"],
  layout: "list",
  pageSize: 30,
  facets: [
    { key: "pre-region", label: "Presynaptic region", values: (c) => c.presynaptic.secondary_region },
    { key: "post-region", label: "Postsynaptic region", values: (c) => c.postsynaptic.secondary_region },
    { key: "pre-type", label: "Presynaptic type", values: (c) => toList(c.presynaptic.cell_type) },
    { key: "post-type", label: "Postsynaptic type", values: (c) => toList(c.postsynaptic.cell_type) },
    { key: "layer", label: "Layer", values: (c) => c.layers },
  ],
  text: (c) => searchText(c.presynaptic.name, c.postsynaptic.name, c.layers, c.presynaptic.markers, c.postsynaptic.markers),
  sorts: [
    { key: "pre", label: "Presynaptic A–Z", compare: (a, b) => byName(a.presynaptic, b.presynaptic) || byName(a.postsynaptic, b.postsynaptic) },
    { key: "post", label: "Postsynaptic A–Z", compare: (a, b) => byName(a.postsynaptic, b.postsynaptic) || byName(a.presynaptic, b.presynaptic) },
  ],
  Card: ConnectionCard,
  Detail: ConnectionDetail,
  Footer: ConnectionFooter,
  detailEyebrow: () => "Connection · Hippocampome.org",
};

const models: Collection<Model> = {
  key: "model",
  path: "/models",
  navLabel: "Models",
  title: "Models",
  eyebrow: "Models",
  group: "models",
  lead: "Hippocampal NEURON models from ModelDB. Open a model to read its description and add its .mod mechanisms to the HH Neuron Builder.",
  noun: ["model", "models"],
  accent: "var(--c-model)",
  files: ["modeldb/models.json"],
  layout: "list",
  pageSize: 20,
  facets: [
    { key: "cell", label: "Cell type", values: (m) => toList(m.cell_types) },
    { key: "channel", label: "Channel", values: (m) => toList(m.channels) },
    { key: "receptor", label: "Receptor", values: (m) => toList(m.receptors) },
    { key: "concept", label: "Model concept", values: (m) => toList(m.model_concepts) },
    { key: "modeltype", label: "Model type", values: (m) => toList(m.model_types) },
    { key: "author", label: "Implemented by", values: (m) => toList(m.implementers).map((a) => a.replace(/\s*\[.*\]$/, "")) },
  ],
  text: (m) =>
    searchText(m.name, m.description, m.cell_types, m.channels, m.receptors, m.model_concepts, m.model_types, m.implementers, m.papers?.map((p) => p.label)),
  sorts: [
    ...nameSorts<Model>(),
    { key: "updated", label: "Recently updated", compare: (a, b) => (b.updated ?? "").localeCompare(a.updated ?? "") },
    { key: "created", label: "Newest", compare: (a, b) => (b.created ?? "").localeCompare(a.created ?? "") },
  ],
  Card: ModelCard,
  Detail: ModelDetail,
  Footer: ModelFooter,
  detailEyebrow: (m) => `Model · ${m.source} ${m.id}`,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const COLLECTIONS: Collection<any>[] = [morphologies, traces, connections, models];

/** Data collections, in the order of the Data section and its menu */
export const DATA_COLLECTIONS = [traces, morphologies, connections];

export const pathOf = (key: string) => COLLECTIONS.find((c) => c.key === key)!.path;
