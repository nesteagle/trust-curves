import React, { useState, useRef, useEffect } from "react";
import * as d3 from "d3";
import type { DAGNode } from "../../utils/useGraphNetwork";
import { timeFormatter } from "../../utils/time";
const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

const CollapsibleText: React.FC<{ text: string }> = ({ text }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (textRef.current) {
      setIsTruncated(
        textRef.current.scrollHeight > textRef.current.clientHeight
      );
    }
  }, [text]);

  return (
    <div className="relative">
      <p
        ref={textRef}
        className={`text-[13px] text-slate-700 whitespace-pre-wrap leading-relaxed ${
          !isExpanded ? "line-clamp-4" : ""
        }`}
      >
        {text}
      </p>
      {isTruncated && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 mt-1 transition-colors"
        >
          {isExpanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
};

interface ThreadPanelProps {
  threadId: string | null;
  messages: DAGNode[];
  nodeMap: Map<string, DAGNode>;
  onClose: () => void;
  onHoverMessage: (nodeId: string | null) => void;
}

export const ThreadPanel: React.FC<ThreadPanelProps> = ({
  threadId,
  messages,
  onClose,
  onHoverMessage,
}) => {
  if (!threadId || messages.length === 0) return null;

  return (
    <aside className="w-[1200px] bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl z-40 font-sans text-slate-800">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
              />
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-slate-900 text-sm tracking-tight">
              Thread
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {messages.length} Messages
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 transition-colors"
        >
          ✕
        </button>
      </header>

      <div
        className="flex-1 overflow-y-auto px-6 py-6 space-y-1"
        onMouseLeave={() => onHoverMessage(null)}
      >
        {messages.map((node, index) => {
          const nextNode = messages[index + 1];
          const hasSequentialChild = !!nextNode;
          const agentColor = colorScale(node.agent);

          return (
            <div
              key={node.id}
              id={`dag-msg-${node.id}`}
              onMouseEnter={() => onHoverMessage(node.id)}
              className="relative flex transition-all duration-300 rounded-xl py-3 px-2 -mx-2 hover:bg-slate-50 group"
            >
              <div className="flex flex-col items-center mr-4 w-10 flex-shrink-0">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm ring-2 ring-white z-10"
                  style={{ backgroundColor: agentColor }}
                >
                  {node.agent.substring(0, 2).toUpperCase()}
                </div>
                {hasSequentialChild && (
                  <div className="w-0.5 bg-slate-200 flex-1 mt-2 mb-[-1rem] group-hover:bg-slate-300 transition-colors" />
                )}
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="font-bold text-sm text-slate-900">
                    {node.agent}
                  </span>
                  <time className="text-[11px] text-slate-400 font-medium">
                    {timeFormatter.format(new Date(node.timestamp))}
                  </time>
                </div>

                <CollapsibleText text={node.content} />

                {node.reasoning && (
                  <div className="mt-3 relative">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400/50 rounded-l-md" />
                    <div className="bg-amber-50/50 rounded-r-md py-2 px-3 border border-l-0 border-amber-100/50">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700/70 block mb-1">
                        Internal Reasoning
                      </span>
                      <CollapsibleText text={node.reasoning} />
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2 mt-3 opacity-80 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center border border-slate-200 rounded-md bg-white overflow-hidden text-[10px] font-mono">
                    <span className="px-2 py-0.5 bg-slate-50 text-slate-500 border-r border-slate-200">
                      Ext
                    </span>
                    <span className="px-2 py-0.5 font-semibold text-slate-700">
                      {node.scoreExternal.toFixed(3)}
                    </span>
                  </div>
                  {node.scoreInternal !== null && (
                    <div className="flex items-center border border-slate-200 rounded-md bg-white overflow-hidden text-[10px] font-mono">
                      <span className="px-2 py-0.5 bg-slate-50 text-slate-500 border-r border-slate-200">
                        Int
                      </span>
                      <span className="px-2 py-0.5 font-semibold text-slate-700">
                        {node.scoreInternal.toFixed(3)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
