import React, { useEffect, useRef, useState } from "react";
import { useGraphData, useGraphHover } from "../../store/GraphContext";
import { CanvasEngine } from "../graph/Engine";
import { TooltipOverlay } from "../graph/Tooltip";
import { Minimap } from "../graph/Minimap";
import { ThreadPanel } from "../graph/ThreadPanel";
import type { NodeData } from "../../types";

import rawPayload from "../../data/data.json";

export const DashboardLayout: React.FC = () => {
  const { data, network, setData, isLoading, setIsLoading } = useGraphData();
  const { setHoverState } = useGraphHover();
  const { nodes: sortedNodes, nodeMap, threadMap, threads } = network;

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [sidebarHoveredId, setSidebarHoveredId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    try {
      setData({
        nodes: rawPayload.nodes as NodeData[],
        edges: rawPayload.edges,
        trends: rawPayload.trends,
      });
      setIsLoading(false);
    } catch (err) {
      console.error("Failed to parse dataset", err);
    }
  }, [setData, setIsLoading]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleNodeClick = (node: NodeData | null) => {
    if (node) {
      setSelectedThreadId(threadMap.get(node.id) || null);
    } else {
      setSelectedThreadId(null);
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-100/60 overflow-hidden font-sans text-gray-900">
      <main className="flex-1 relative overflow-hidden" ref={containerRef}>
        {!isLoading && data && dimensions.width !== 0 && (
          <>
            <CanvasEngine
              width={dimensions.width}
              height={dimensions.height}
              nodes={sortedNodes}
              edges={data.edges}
              trends={data.trends}
              timeBounds={network.timeBounds}
              nodeMap={nodeMap}
              threadMap={threadMap}
              selectedThreadId={selectedThreadId}
              sidebarHoveredId={sidebarHoveredId}
              onHoverNode={(node, x, y) => setHoverState({ node, x, y })}
              onClickNode={handleNodeClick}
            />
            <TooltipOverlay />

            <Minimap
              mainWidth={dimensions.width}
              mainHeight={dimensions.height}
            />

            {selectedThreadId && (
              <div className="absolute top-0 right-0 h-full shadow-2xl z-40 bg-white">
                <ThreadPanel
                  threadId={selectedThreadId}
                  messages={threads.get(selectedThreadId) || []}
                  nodeMap={nodeMap}
                  onClose={() => setSelectedThreadId(null)}
                  onHoverMessage={setSidebarHoveredId}
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};
