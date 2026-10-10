import React from "react";
import { Layers } from "lucide-react";
import { SectionCard } from "@/components/composed/SectionCard";
import { EmptyState } from "@/components/composed/EmptyState";
import { Button } from "@/components/arc/button/button";
import { Gauge } from "@/components/arc/gauge/gauge";
import NavTile from "./NavTile";
import { gaugeLabel } from "./gaugeTone";
import styles from "./Overview.module.css";

export default function WorkstreamsPanel({ progress, navigate }) {
  return (
    <SectionCard titleAs="h2" title="Workstreams" count={progress.length || undefined} bodyClassName={styles.body}>
      {progress.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No workstreams yet"
          description="Workstreams split the project into parts you can track separately. Add workstreams on the Roadmap tab."
          action={<Button variant="secondary" onClick={() => navigate("roadmap")}>Open Roadmap</Button>}
        />
      ) : (
        <div className={styles.gauges}>
          {progress.map((p) => (
            <NavTile
              key={p.id}
              className={styles.gaugeTile}
              label={`Open ${p.name} on the board. ${gaugeLabel(p)}. ${p.detail}`}
              onNavigate={() => navigate("board", { ws: p.id })}
            >
              <Gauge value={p.pct} label={p.name} detail={p.detail} tone={p.tone} />
            </NavTile>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
