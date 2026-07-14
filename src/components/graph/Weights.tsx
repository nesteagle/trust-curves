import React, { useState, useMemo } from "react";
import * as d3 from "d3";
import type { Weights } from "../../types";
import { DEFAULT_CATEGORY_WEIGHTS } from "../../utils/scores";
import { DIMENSION_DESCRIPTIONS } from "../../utils/dimensions";

interface WeightPanelProps {
  keys: string[];
  weights: Weights;
  setWeights: (w: Weights) => void;
}

export const WeightPanel: React.FC<WeightPanelProps> = ({
  keys,
  weights,
  setWeights,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute right-6 bottom-18 z-30 flex w-fit min-w-[240px] max-w-[400px] flex-col-reverse rounded-lg border border-slate-200 bg-white/95 shadow-lg backdrop-blur-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700"
      >
        Score weighting
        <i
          className={`ti cursor-pointer ${
            open ? "ti-minus" : "ti-plus"
          } text-slate-400 text-xs`}
        />
      </button>
      {open && (
        <div className="max-h-[60vh] overflow-y-auto border-b border-slate-100 px-3 py-3">
          <p className="mb-3 text-[12px] leading-relaxed text-slate-400 font-small">
            Adjust per-category weight on final score. Hover to view
            description.
          </p>
          <WeightSliderGroup
            keys={keys}
            weights={weights}
            onChange={setWeights}
          />
        </div>
      )}
    </div>
  );
};

function format(key: string): string {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

interface WeightSliderGroupProps {
  keys: string[];
  weights: Weights;
  onChange: (weights: Weights) => void;
}

export const WeightSliderGroup: React.FC<WeightSliderGroupProps> = ({
  keys,
  weights,
  onChange,
}) => {
  const setWeight = (key: string, v: number) =>
    onChange({ ...weights, [key]: v });

  const resetToDefaults = () => {
    const fallback = keys.length ? 100 / keys.length : 0;
    const defaults = Object.fromEntries(
      keys.map((k) => [k, DEFAULT_CATEGORY_WEIGHTS[k] ?? fallback])
    );
    onChange(defaults);
  };

  const color = useMemo(() => {
    return d3.scaleOrdinal<string>().domain(keys).range(d3.schemeTableau10);
  }, [keys]);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Categories
        </span>
        <button
          onClick={resetToDefaults}
          className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          reset
        </button>
      </div>
      {keys.map((k) => (
        <div key={k} className="flex items-center gap-2 py-1">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: color(k) }}
          />
          <span
            className="w-28 shrink-0 truncate text-xs text-slate-600 cursor-help"
            title={DIMENSION_DESCRIPTIONS[k] ?? format(k)}
          >
            {format(k)}
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={weights[k] ?? 0}
            onChange={(e) => setWeight(k, Number(e.target.value))}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-teal-700"
          />
          <span className="w-8 shrink-0 tabular-nums text-right font-mono text-xs text-slate-500">
            {Math.round(weights[k] ?? 0)}
          </span>
        </div>
      ))}
    </div>
  );
};
