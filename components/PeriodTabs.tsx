"use client";

import styles from "./PeriodTabs.module.css";

/** Top-layer period selector (tabs) — distinct from the criteria comboboxes. */
export function PeriodTabs({
  count,
  active,
  onChange,
}: {
  count: number;
  active: number;
  onChange: (p: number) => void;
}) {
  return (
    <div className={styles.tabs} role="tablist">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          role="tab"
          aria-selected={i === active}
          className={styles.tab}
          data-active={i === active}
          onClick={() => onChange(i)}
        >
          Periodo {i + 1}
        </button>
      ))}
    </div>
  );
}
