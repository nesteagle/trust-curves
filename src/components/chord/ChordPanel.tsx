import React, { useMemo, useState } from "react";
import agentConnectionsRaw from "../../data/agent_connections.json";
import type { AgentConnectionsPayload, ChordMode } from "../../types";
import { useChordMatrix } from "../../utils/useChordMatrix";
import { useVisibleTimeRange } from "../../utils/useVisibleTimeRange";
import { dateFormatter } from "../../utils/time";
import { ChordDiagram } from "./ChordDiagram";
import type { TimeCompression } from "../../hooks/useTimeCompression";

const agentConnections = agentConnectionsRaw as AgentConnectionsPayload;

interface ChordPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  timeBounds: [number, number];
  mainWidth: number;
  timeCompression: TimeCompression;
}

const MODE_OPTIONS: { value: ChordMode; label: string }[] = [
  { value: "replies", label: "Direct replies" },
  { value: "mentions", label: "@ Mentions" },
  { value: "both", label: "Both" },
];

const UNIT_BY_MODE: Record<ChordMode, string> = {
  replies: "reply",
  mentions: "mention",
  both: "link",
};

export const ChordPanel: React.FC<ChordPanelProps> = ({
  isOpen,
  onToggle,
  onClose,
  timeBounds,
  mainWidth,
  timeCompression,
}) => {
  const [mode, setMode] = useState<ChordMode>("replies");

  const visibleRange = useVisibleTimeRange(
    timeBounds,
    mainWidth,
    timeCompression,
    isOpen
  );

  const matrix = useChordMatrix(
    agentConnections.reply_edges,
    agentConnections.mention_edges,
    agentConnections.agents,
    mode,
    visibleRange
  );

  const rangeLabel = useMemo(() => {
    if (!visibleRange) return null;
    return `${dateFormatter.format(
      new Date(visibleRange[0])
    )} — ${dateFormatter.format(new Date(visibleRange[1]))}`;
  }, [visibleRange]);

  return (
    <>
      <button
        onClick={onToggle}
        title="Agent interaction chord diagram"
        className={`absolute top-4 right-4 z-40 flex items-center gap-2 rounded-lg border shadow-md px-3 py-2 text-sm font-semibold transition-colors ${
          isOpen
            ? "bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-500"
            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
        }`}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <circle cx="12" cy="12" r="9" strokeWidth={1.6} />
          <path
            d="M7 8l10 8M17 8L7 16"
            strokeWidth={1.6}
            strokeLinecap="round"
          />
        </svg>
        Agent Chord
      </button>

      {isOpen && (
        <div className="absolute top-16 right-4 z-40 w-[380px] bg-white border border-slate-200 shadow-2xl rounded-xl overflow-hidden font-sans">
          <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50/80">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Agent Interactions
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {rangeLabel ?? "Full dataset"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 transition-colors"
            >
              ✕
            </button>
          </header>

          <div className="px-4 pt-3">
            <div className="flex gap-1 bg-slate-100 rounded-md p-1">
              {MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setMode(opt.value)}
                  className={`flex-1 text-[11px] font-medium rounded px-2 py-1 transition-colors ${
                    mode === opt.value
                      ? "bg-white shadow-sm text-indigo-600"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 pb-4 pt-3">
            <ChordDiagram
              matrix={matrix}
              labels={agentConnections.labels}
              size={340}
              unit={UNIT_BY_MODE[mode]}
              emptyMessage="No agent interactions in the visible timeline window. Try zooming out."
            />
          </div>
        </div>
      )}
    </>
  );
};
