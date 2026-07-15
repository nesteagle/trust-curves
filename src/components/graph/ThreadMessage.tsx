import React from "react";
import { timeFormatter } from "../../utils/time";
import { colorScale } from "../../hooks/useColor";
import { CollapsibleText } from "../ui/CollapsibleText";
import { ScoreBadge } from "./Audit";
import { WindRose } from "../charts/WindRose";
import type { DAGNode } from "../../hooks/useGraphNetwork";

interface ThreadMessageProps {
  node: DAGNode;
  isSelected: boolean;
  hasSequentialChild: boolean;
  scoreExternal: number | null | undefined;
  scoreInternal: number | null | undefined;
  onHover: (nodeId: string | null) => void;
  onOpenAudit: (node: DAGNode) => void;
}

export const ThreadMessage: React.FC<ThreadMessageProps> = ({
  node,
  isSelected,
  hasSequentialChild,
  scoreExternal,
  scoreInternal,
  onHover,
  onOpenAudit,
}) => {
  const agentColor = colorScale(node.agent);

  const hasEvaluationData =
    Object.keys(node.explanationsExternal || {}).length > 0 ||
    Object.keys(node.explanationsInternal || {}).length > 0;

  return (
    <div
      id={`dag-msg-${node.id}`}
      onMouseEnter={() => onHover(node.id)}
      className={`relative flex px-2 py-3 -mx-2 rounded-xl transition-all duration-300 group ${
        isSelected
          ? "bg-indigo-50/60 ring-1 ring-indigo-200"
          : "hover:bg-slate-50"
      }`}
    >
      <div className="flex flex-col items-center flex-shrink-0 w-14 mr-4">
        <div
          onClick={() => hasEvaluationData && onOpenAudit(node)}
          title={
            hasEvaluationData
              ? "Click to inspect full evaluation audit"
              : undefined
          }
          className={`transition-transform duration-200 ${
            hasEvaluationData ? "hover:scale-105 cursor-pointer" : ""
          }`}
        >
          {hasEvaluationData ? (
            <WindRose
              explanations={node.explanationsExternal}
              baseColor={agentColor}
              agentName={node.agent}
              size={56}
            />
          ) : (
            <div
              className="flex items-center justify-center z-10 w-10 h-10 my-1 text-sm font-bold text-white rounded-full shadow-sm ring-2 ring-white"
              style={{ backgroundColor: agentColor }}
            >
              {node.agent.substring(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        {hasSequentialChild && (
          <div className="flex-1 w-0.5 mt-2 mb-[-1rem] transition-colors bg-slate-200 group-hover:bg-slate-300" />
        )}
      </div>

      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-sm font-bold text-slate-900">{node.agent}</span>
          <time className="text-[11px] font-medium text-slate-400">
            {timeFormatter.format(new Date(node.timestamp))}
          </time>
        </div>

        <CollapsibleText text={node.content} />

        {node.reasoning && (
          <div className="relative mt-3">
            <div className="absolute top-0 bottom-0 left-0 w-1 rounded-l-md bg-amber-400/50" />
            <div className="px-3 py-2 border border-l-0 rounded-r-md bg-amber-50/50 border-amber-100/50">
              <span className="block mb-1 text-[10px] font-bold tracking-wider uppercase text-amber-700/70">
                Internal Reasoning
              </span>
              <CollapsibleText text={node.reasoning} />
            </div>
          </div>
        )}

        <div className="flex items-center mt-3 space-x-2 transition-opacity opacity-80 group-hover:opacity-100">
          <ScoreBadge
            label="Ext"
            value={scoreExternal}
            clickable={hasEvaluationData}
            onClick={() => onOpenAudit(node)}
          />
          <ScoreBadge
            label="Int"
            value={scoreInternal}
            clickable={hasEvaluationData}
            onClick={() => onOpenAudit(node)}
          />

          {hasEvaluationData && (
            <span
              onClick={() => onOpenAudit(node)}
              className="flex items-center gap-1 pl-1 text-[10px] font-semibold transition-colors cursor-pointer text-indigo-600 hover:text-indigo-800"
            >
              <span>View Audit</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
