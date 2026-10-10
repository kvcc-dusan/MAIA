import React from "react";
import { MetricCard } from "@/components/arc/metric-card/metric-card";
import NavTile from "./NavTile";
import styles from "./Overview.module.css";

/** Overdue and blocked cards (and open tasks) jump to the Tasks tab; cycle time has nowhere to go. */
export default function MetricsRow({ cards, navigate }) {
  return (
    <div className={styles.metrics}>
      {cards.map((card) => {
        const metric = (
          <MetricCard label={card.label} value={card.value} suffix={card.suffix} context={card.context} />
        );
        if (!card.nav) return <div key={card.id}>{metric}</div>;
        return (
          <NavTile key={card.id} label={card.nav.label} onNavigate={() => navigate(card.nav.tab, card.nav.params)}>
            {metric}
          </NavTile>
        );
      })}
    </div>
  );
}
