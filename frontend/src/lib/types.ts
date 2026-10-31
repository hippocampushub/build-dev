// Records as written by the backend (hippocampushub-backend/data/**.json)

export interface Paper {
  label: string;
  url?: string | null;
  title?: string | null;
  journal?: string | null;
  year?: string | null;
}

interface BaseRecord {
  source_id: string;
  id: string;
  name: string;
  source: string;
  page_link?: string | null;
  icon?: string | null;
  papers?: Paper[];
}

export interface Morphology extends BaseRecord {
  type: "morphology";
  region?: string;
  secondary_region?: string[];
  cell_type?: string | null;
  etype?: string | null;
  species?: string | string[];
  strain?: string | null;
  archive?: string;
  description?: string | null;
  download_link?: string | null;
  standardized_download_link?: string | null;
  original_format?: string | null;
  physical_integrity?: string | null;
  structural_domains?: string | null;
  morphologies?: string | null;
  protocol?: string | null;
  reference_doi?: string[];
  reference_pmid?: string[];
}

export interface Trace extends BaseRecord {
  type: "electrophysiology";
  region?: string;
  secondary_region?: string[];
  cell_type?: string | null;
  etype?: string | null;
  species?: string[];
  download_link?: string | null;
  download_filename?: string | null;
}

export interface ModFile {
  label: string;
  path: string;
  url: string;
}

export interface Model extends BaseRecord {
  description?: string;
  cell_types?: string[];
  channels?: string[];
  receptors?: string[];
  model_types?: string[];
  model_concepts?: string[];
  implementers?: string[];
  modeling_application?: string[];
  download_link?: string | null;
  github_link?: string | null;
  readme_link?: string | null;
  model_files?: ModFile[] | null;
  created?: string;
  updated?: string;
}

export interface NeuronSummary {
  source_id: string;
  id: string;
  name: string;
  secondary_region: string[];
  cell_type: string | null;
  layers: string[];
  markers: string[];
  papers: Paper[];
  page_link: string;
}

export interface Connection extends BaseRecord {
  type: "connection";
  status: string;
  layers: string[];
  presynaptic: NeuronSummary;
  postsynaptic: NeuronSummary;
}

export interface Manifest {
  updated_at?: string;
  sources: Record<string, { source: string; fetched_at: string; collections: Record<string, { count: number }> }>;
}
