import React, { useMemo, useState } from "react";
import type { DAGNode } from "../../hooks/useGraphNetwork";
import { CollapsibleText } from "../ui/CollapsibleText";
import { EvaluationAuditModal } from "./Audit";
import { ThreadMessage } from "./ThreadMessage";

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
      </aside>
    </>
  );
};
