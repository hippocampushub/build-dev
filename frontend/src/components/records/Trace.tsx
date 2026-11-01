import type { Trace } from "../../lib/types";
import { useHhnb } from "../../lib/hhnb";
import { fileName } from "../../lib/format";
import { toList } from "../../lib/facets";
import { CheckIcon, PlusIcon, SendIcon } from "../Icons";
import { DownloadButton } from "../DownloadButton";
import { Facts, InfoButton, Section, SourceBadge, SourceLink, Thumb } from "./common";

function UseTraceButton({ item, wide = false }: { item: Trace; wide?: boolean }) {
  const { hasTrace, toggleTrace } = useHhnb();
  const url = item.download_link;
  if (!url) return null;
  const selected = hasTrace(url);
  return (
    <button
      className={`btn${wide ? "" : " btn-sm"}${selected ? " selected" : ""}`}
      onClick={() => toggleTrace({ name: item.name, url })}
      aria-pressed={selected}
      title={selected ? "Remove from the HH Neuron Builder selection" : "Add this trace to the HH Neuron Builder selection"}
    >
      {selected ? <CheckIcon size={16} /> : wide ? <PlusIcon size={16} /> : <SendIcon size={15} />}
      {wide ? (selected ? "Selected for HH Neuron Builder" : "Add to HH Neuron Builder") : selected ? "Selected" : "HHNB"}
    </button>
  );
}

export function TraceCard({ item, onOpen }: { item: Trace; onOpen: () => void }) {
  return (
    <article className="card">
      <Thumb src={item.icon} alt={`Trace ${item.name}`} onClick={onOpen} />
      <div className="card-body">
        <h2 className="card-title"><button onClick={onOpen}>{item.name}</button></h2>
        <p className="card-sub">{[...toList(item.secondary_region), item.cell_type].filter(Boolean).join(" · ")}</p>
        <Facts rows={[["E-type", item.etype], ["Species", toList(item.species)]]} />
        <div className="card-actions">
          <DownloadButton url={item.download_link} source={item.source} label="" />
          <UseTraceButton item={item} />
          <InfoButton onOpen={onOpen} name={item.name} />
          <SourceBadge source={item.source} stacked />
        </div>
      </div>
    </article>
  );
}

export function TraceDetail({ item }: { item: Trace }) {
  return (
    <>
      <Thumb src={item.icon} alt={`Trace ${item.name}`} large />
      <Section title="Overview">
        <Facts
          rows={[
            ["Region", [item.region, ...toList(item.secondary_region)].filter(Boolean).join(" · ")],
            ["Cell type", item.cell_type],
            ["E-type", item.etype],
            ["Species", toList(item.species)],
            ["Source", item.source],
          ]}
        />
      </Section>
      <Section title="File">
        <div className="file-row">
          <span className="name">
            {item.download_filename ?? fileName(item.download_link)}
            <div className="path">Axon Binary File (.abf)</div>
          </span>
          <DownloadButton url={item.download_link} source={item.source} label="" />
        </div>
      </Section>
    </>
  );
}

export function TraceFooter({ item }: { item: Trace }) {
  return (
    <>
      <UseTraceButton item={item} wide />
      <DownloadButton url={item.download_link} source={item.source} small={false} />
      <span style={{ flex: 1 }} />
      <SourceLink url={item.page_link} label="Live paper" />
    </>
  );
}
