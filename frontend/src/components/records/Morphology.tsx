import type { Morphology } from "../../lib/types";
import { useHhnb } from "../../lib/hhnb";
import { fileName, secureUrl } from "../../lib/format";
import { toList } from "../../lib/facets";
import { CheckIcon, PlusIcon, SendIcon } from "../Icons";
import { DownloadButton } from "../DownloadButton";
import { Facts, InfoButton, Papers, Section, SourceBadge, SourceLink, Tags, Thumb } from "./common";

function UseMorphologyButton({ item, wide = false }: { item: Morphology; wide?: boolean }) {
  const { selection, setMorphology } = useHhnb();
  const url = item.download_link;
  if (!url) return null;
  const selected = selection.morphology?.url === url;
  return (
    <button
      className={`btn${wide ? "" : " btn-sm"}${selected ? " selected" : ""}`}
      onClick={() => setMorphology(selected ? null : { name: item.name, url })}
      aria-pressed={selected}
      title={selected ? "Remove from the HH Neuron Builder selection" : "Use this morphology in the HH Neuron Builder"}
    >
      {selected ? <CheckIcon size={16} /> : wide ? <PlusIcon size={16} /> : <SendIcon size={15} />}
      {wide ? (selected ? "Selected for HH Neuron Builder" : "Use in HH Neuron Builder") : selected ? "Selected" : "HHNB"}
    </button>
  );
}

export function MorphologyCard({ item, onOpen }: { item: Morphology; onOpen: () => void }) {
  return (
    <article className="card">
      <Thumb src={item.icon} alt={item.name} onClick={onOpen} />
      <div className="card-body">
        <h2 className="card-title"><button onClick={onOpen}>{item.name}</button></h2>
        <p className="card-sub">{[...toList(item.secondary_region), item.cell_type].filter(Boolean).join(" · ")}</p>
        <Facts rows={[["Species", toList(item.species)], ["Integrity", item.physical_integrity]]} />
        <div className="card-actions">
          <DownloadButton url={item.download_link} source={item.source} label="" />
          <UseMorphologyButton item={item} />
          <InfoButton onOpen={onOpen} name={item.name} />
          <SourceBadge source={item.source} stacked />
        </div>
      </div>
    </article>
  );
}

export function MorphologyDetail({ item }: { item: Morphology }) {
  return (
    <>
      <Thumb src={item.icon} alt={item.name} large />
      <Section title="Overview">
        <Facts
          rows={[
            ["Region", [item.region, ...toList(item.secondary_region)].filter(Boolean).join(" · ")],
            ["Cell type", item.cell_type],
            ["E-type", item.etype],
            ["Species", toList(item.species)],
            ["Strain", item.strain],
            ["Archive", item.archive],
            ["Protocol", item.protocol],
            ["Physical integrity", item.physical_integrity],
            ["Structural domains", item.structural_domains],
            ["Attributes", item.morphologies],
            ["Original format", item.original_format],
            ["Source", item.source],
          ]}
        />
      </Section>
      {item.description && (
        <Section title="Notes">
          <p className="prose">{item.description.replace(/<[^>]+>/g, "")}</p>
        </Section>
      )}
      <Section title="Files">
        <div className="files">
          {[
            ["Original reconstruction", item.download_link],
            ["Standardized (CNG) SWC", item.standardized_download_link],
          ]
            .filter(([, url]) => url)
            .map(([label, url]) => (
              <div className="file-row" key={url}>
                <span className="name">
                  {label}
                  <div className="path">{fileName(url)}</div>
                </span>
                <DownloadButton url={url} source={item.source} label="" />
              </div>
            ))}
        </div>
      </Section>
      <Papers papers={[
        ...(item.papers ?? []),
        ...toList(item.reference_doi).map((doi) => ({ label: `DOI ${doi}`, url: `https://doi.org/${doi}` })),
      ]} />
      {item.reference_pmid?.length ? (
        <Section title="PubMed">
          <Tags values={item.reference_pmid.map((p) => `PMID ${p}`)} />
        </Section>
      ) : null}
    </>
  );
}

export function MorphologyFooter({ item }: { item: Morphology }) {
  return (
    <>
      <UseMorphologyButton item={item} wide />
      <DownloadButton url={item.download_link} source={item.source} small={false} />
      <span style={{ flex: 1 }} />
      <SourceLink url={secureUrl(item.page_link)} label="Source page" />
    </>
  );
}
