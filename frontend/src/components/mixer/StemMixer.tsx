import React from "react";
import { StemTrack } from "./StemTrack.tsx";
import { useAppStore } from "../../store/appStore.ts";

export const StemMixer: React.FC = () => {
  const stems = useAppStore((s) => s.stems);

  if (stems.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-bg-primary/40 p-3">
      <div>
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Stem Mixer
        </h3>
        <p className="mt-1 text-xs text-text-muted">
          Balance the separated stems before exporting individual files.
        </p>
      </div>
      {stems.map((stem) => (
        <StemTrack key={stem.name} stem={stem} />
      ))}
    </section>
  );
};
