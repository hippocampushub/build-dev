import type { Connection, NeuronSummary } from "../../lib/types";
import { ArrowRightIcon } from "../Icons";
import { Papers, Section, SourceBadge, SourceLink, Tags } from "./common";

function Side({ role, neuron, compact = false }: { role: string; neuron: NeuronSummary; compact?: boolean }) {
  return (
    <div className="conn-side">
      <p className="conn-role">{role}</p>
      <p className="conn-name">{neuron.name}</p>
      <div className="hint" style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
        <span>{neuron.secondary_region.join(", ")}</span>
        {neuron.cell_type && <span className={`ei ${neuron.cell_type}`}>{neuron.cell_type}</span>}
      </div>
      {!compact && neuron.markers.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <p className="meta-label">Positive markers</p>
          <Tags values={neuron.markers} limit={8} />
        </div>
      )}
    </div>
  );
}

export function ConnectionCard({ item, onOpen }: { item: Connection; onOpen: () => void }) {
  return (
    <article className="card">
      <div className="card-body">
        <div className="conn">
          <Side role="Presynaptic" neuron={item.presynaptic} compact />
          <div className="conn-arrow"><ArrowRightIcon size={22} /></div>
          <Side role="Postsynaptic" neuron={item.postsynaptic} compact />
        </div>
        <div className="card-actions">
          <span className="hint">Layers</span>
          <Tags values={item.layers} accent />
          <span className="spacer" />
          <button className="btn btn-sm" onClick={onOpen}>Details</button>
          <SourceBadge source={item.source} />
        </div>
      </div>
    </article>
  );
}

function NeuronSection({ role, neuron }: { role: string; neuron: NeuronSummary }) {
  return (
    <Section title={`${role}: ${neuron.name}`}>
      <div className="hint" style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", marginBottom: 10 }}>
        <span>{neuron.secondary_region.join(", ")}</span>
        {neuron.cell_type && <span className={`ei ${neuron.cell_type}`}>{neuron.cell_type}</span>}
        <a href={neuron.page_link} target="_blank" rel="noreferrer">Hippocampome neuron page</a>
      </div>
      {neuron.layers.length > 0 && (
        <>
          <p className="meta-label">Layers with soma, axons or dendrites</p>
          <Tags values={neuron.layers} />
        </>
      )}
      {neuron.markers.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <p className="meta-label">Positive markers</p>
          <Tags values={neuron.markers} />
        </div>
      )}
    </Section>
  );
}

export function ConnectionDetail({ item }: { item: Connection }) {
  return (
    <>
      <div className="conn">
        <Side role="Presynaptic" neuron={item.presynaptic} compact />
        <div className="conn-arrow"><ArrowRightIcon size={22} /></div>
        <Side role="Postsynaptic" neuron={item.postsynaptic} compact />
      </div>
      <Section title="Where they connect">
        <Tags values={item.layers} accent />
        <p className="hint">Documented connection in Hippocampome.org.</p>
      </Section>
      <NeuronSection role="Presynaptic" neuron={item.presynaptic} />
      <NeuronSection role="Postsynaptic" neuron={item.postsynaptic} />
      <Papers
        papers={[...item.presynaptic.papers, ...item.postsynaptic.papers].filter(
          (p, i, all) => all.findIndex((q) => q.url === p.url) === i,
        )}
      />
    </>
  );
}

export function ConnectionFooter({ item }: { item: Connection }) {
  return (
    <>
      <span style={{ flex: 1 }} />
      <SourceLink url={item.presynaptic.page_link} label="Presynaptic on Hippocampome" />
      <SourceLink url={item.postsynaptic.page_link} label="Postsynaptic on Hippocampome" />
    </>
  );
}
