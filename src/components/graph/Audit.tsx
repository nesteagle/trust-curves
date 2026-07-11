import React, { useState } from "react";
import { colorScale } from "../../hooks/useColor";
import { normalizeScore } from "../../utils/scores";
import { formatDimensionKey } from "../../utils/dimensions";
import { WindRose } from "../charts/WindRose";
import type { DAGNode } from "../../hooks/useGraphNetwork";

interface ScoreBadgeProps {
  label: string;
  value: number | null | undefined;
  clickable: boolean;
  onClick?: () => void;
}

export const ScoreBadge: React.FC<ScoreBadgeProps> = ({
  label,
  value,
  clickable,
  onClick,
}) => {
  if (value === null || value === undefined) return null;

  return (
    <button
      type="button"
      onClick={clickable ? onClick : undefined}
      className={`flex items-center border border-slate-200 rounded-md bg-white overflow-hidden text-[10px] font-mono transition-all ${
        clickable
          ? "hover:border-indigo-300 hover:bg-indigo-50/30 hover:shadow-sm cursor-pointer"
          : "cursor-default"
      }`}
    >
      <span className="px-2 py-0.5 bg-slate-50 text-slate-500 border-r border-slate-200">
        {label}
      </span>
      <span className="px-2 py-0.5 font-semibold text-slate-700">
        {value.toFixed(3)}
      </span>
    </button>
  );
};

interface AuditModalProps {
  node: DAGNode;
  onClose: () => void;
}

export const EvaluationAuditModal: React.FC<AuditModalProps> = ({
  node,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"external" | "internal">(
    "external"
  );
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const agentColor = colorScale(node.agent);

  const externalEntries = Object.entries(node.explanationsExternal || {});
  const internalEntries = Object.entries(node.explanationsInternal || {});

  const currentRawData =
    activeTab === "external"
      ? node.explanationsExternal
      : node.explanationsInternal;
  const currentEntries =
    activeTab === "external" ? externalEntries : internalEntries;
  const currentTabHasData = currentEntries.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="flex flex-col w-full max-w-4xl max-h-[85vh] overflow-hidden bg-white border shadow-2xl rounded-2xl border-slate-200 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-3">
            <div
              className="w-4 h-4 rounded-full shadow-sm"
              style={{ backgroundColor: agentColor }}
            />
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {node.agent} - Evaluation Audit
              </h3>
              <p className="text-xs font-medium text-slate-500">
                Message ID: <span className="font-mono">{node.id}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 transition-colors rounded-lg bg-slate-200/60 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
          >
            X
          </button>
        </header>

        <div className="flex px-6 border-b border-slate-200 bg-slate-50/50">
          <button
            onClick={() => setActiveTab("external")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "external"
                ? "border-indigo-600 text-indigo-600 bg-white rounded-t-lg shadow-sm"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>External</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-200/70 text-[10px] font-mono">
              {externalEntries.length}
            </span>
          </button>
          {internalEntries.length > 0 && (
            <button
              onClick={() => setActiveTab("internal")}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === "internal"
                  ? "border-indigo-600 text-indigo-600 bg-white rounded-t-lg shadow-sm"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>Internal</span>
              <span className="px-1.5 py-0.5 rounded-full bg-slate-200/70 text-[10px] font-mono">
                {internalEntries.length}
              </span>
            </button>
          )}
        </div>

        <div className="flex-1 grid items-start grid-cols-1 p-6 overflow-y-auto md:grid-cols-12 gap-8">
          <div className="flex flex-col items-center justify-center sticky top-0 p-6 border rounded-xl md:col-span-5 bg-slate-50/80 border-slate-100">
            <span className="mb-4 text-[11px] font-bold tracking-wider uppercase text-slate-400">
              Alignment
            </span>
            {currentTabHasData ? (
              <WindRose
                explanations={currentRawData}
                baseColor={agentColor}
                agentName={node.agent}
                size={220}
                hoveredKey={hoveredKey}
                onHoverDimension={setHoveredKey}
              />
            ) : (
              <div className="flex items-center justify-center h-[220px] text-xs italic text-slate-400">
                No evaluation data available
              </div>
            )}
          </div>

          <div className="space-y-3 md:col-span-7">
            {!currentTabHasData && (
              <p className="py-8 text-sm italic text-center text-slate-500">
                No audit dimensions recorded for this tab.
              </p>
            )}

            {currentEntries.map(([key, [explanation, score]]) => {
              const displayKey = formatDimensionKey(key);

              return (
                <div
                  key={key}
                  onMouseEnter={() => setHoveredKey(key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer bg-white ${
                    hoveredKey === key
                      ? "border-indigo-300 shadow-sm"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold tracking-tight uppercase text-slate-800">
                      {displayKey}
                    </span>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200/80">
                      <span className="text-[10px] font-medium text-slate-500">
                        Score:
                      </span>
                      <span className="text-xs font-bold font-mono text-slate-900">
                        {normalizeScore(score).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600">
                    {explanation}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <footer className="flex justify-end px-6 py-3 border-t bg-slate-50 border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white transition-colors rounded-lg shadow-sm bg-slate-900 hover:bg-slate-800"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
};
