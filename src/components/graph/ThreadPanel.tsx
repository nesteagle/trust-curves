import React, { useMemo, useRef, useState } from "react";
import type { DAGNode } from "../../hooks/useGraphNetwork";
import { CollapsibleText } from "../ui/CollapsibleText";
import { EvaluationAuditModal } from "./Audit";
import { ThreadMessage } from "./ThreadMessage";
import { AGENT_ORDER } from "../../hooks/useColor";
import { ChordDiagram, type ChordDiagramHandle } from "../chord/ChordDiagram";

interface ThreadPanelProps {
  threadId: number | null;
  messages: DAGNode[];
  nodeMap: Map<string, DAGNode>;
  onClose: () => void;
  onHoverMessage: (nodeId: string | null) => void;
  threadSummary?: Record<string, string>;
  scoresExternal: Map<string, number | null>;
  scoresInternal: Map<string, number | null>;
}

export const ThreadPanel: React.FC<ThreadPanelProps> = ({
  threadId,
  messages,
  onClose,
  onHoverMessage,
  threadSummary,
  scoresExternal,
  scoresInternal,
}) => {
  const [selectedAuditNode, setSelectedAuditNode] = useState<DAGNode | null>(
    null
  );
  const chordRef = useRef<ChordDiagramHandle>(null);
  const [isChordExpanded, setIsChordExpanded] = useState(false);

  const threadChord = useMemo(() => {
    const present = new Set(messages.map((m) => m.agent));
    const labels = AGENT_ORDER.filter((a) => present.has(a));
    const index = new Map<string, number>(labels.map((a, i) => [a, i]));
    const matrix = labels.map(() => labels.map(() => 0));
    const byId = new Map<string, DAGNode>(messages.map((m) => [m.id, m]));

    messages.forEach((m) => {
      const s = index.get(m.agent);
      if (s === undefined) return;
      m.childIds.forEach((childId) => {
        const child = byId.get(childId);
        if (!child) return;
        const t = index.get(child.agent);
        if (t === undefined) return;
        matrix[s][t] += 1;
      });
    });

    return { labels, matrix };
  }, [messages]);

  const summaryText = useMemo(() => {
    if (threadId == null || !threadSummary) return null;
    return (
      threadSummary[`thread-${threadId}`] || threadSummary[threadId] || null
    );
  }, [threadId, threadSummary]);

  if (messages.length === 0) return null;

  const isThread = threadId != null && messages.length > 1;

  return (
    <>
      {selectedAuditNode && (
        <EvaluationAuditModal
          node={selectedAuditNode}
          onClose={() => setSelectedAuditNode(null)}
        />
      )}

      <aside className="flex flex-col h-full z-40 w-[900px] border-l bg-white shadow-2xl border-slate-200 font-sans text-slate-800">
        <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b backdrop-blur-sm border-slate-200 bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-slate-900">
                {isThread ? "Thread" : "Message Detail"}
              </h2>
              <p className="mt-0.5 text-xs font-medium text-slate-500">
                {messages.length}{" "}
                {messages.length === 1 ? "Message" : "Messages"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 transition-colors rounded-md hover:bg-slate-200/60 text-slate-400 hover:text-slate-600"
          >
            X
          </button>
        </header>

        <div
          className="flex-1 px-6 py-6 space-y-1 overflow-y-auto"
          onMouseLeave={() => onHoverMessage(null)}
        >
          {summaryText && (
            <div className="relative p-4 mb-8 overflow-hidden border shadow-sm rounded-xl border-slate-200">
              <div className="flex items-center gap-1.5 mb-2 text-[11px] font-bold tracking-wider uppercase text-slate-700">
                <span>Thread Summary</span>
              </div>
              <div className="pl-0.5">
                <CollapsibleText text={summaryText} />
              </div>
            </div>
          )}

          {messages.map((node, index) => (
            <ThreadMessage
              key={node.id}
              node={node}
              hasSequentialChild={!!messages[index + 1]}
              scoreExternal={scoresExternal.get(node.id)}
              scoreInternal={scoresInternal.get(node.id)}
              onHover={onHoverMessage}
              onOpenAudit={setSelectedAuditNode}
            />
          ))}
        </div>

        {threadChord.labels.length > 1 && (
          <div className="border-t border-slate-200 bg-slate-50/60 flex-shrink-0">
            <button
              onClick={() => setIsChordExpanded((v) => !v)}
              className="w-full flex items-center justify-between px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-700 transition-colors"
            >
              <span>Reply Structure</span>
              <svg
                className={`w-3.5 h-3.5 transition-transform ${
                  isChordExpanded ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {isChordExpanded && (
              <div
                className="px-6 pb-4"
                onClick={() => chordRef.current?.clearPin()}
              >
                <ChordDiagram
                  ref={chordRef}
                  matrix={threadChord.matrix}
                  labels={threadChord.labels}
                  size={220}
                  unit="reply"
                  legendPosition="side"
                  emptyMessage="No replies within this thread."
                />
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
};
