import React, { useMemo, useState } from "react";
import { useGraphData, useGraphHover } from "../../store/GraphContext";
import { CanvasEngine } from "../graph/Engine";
import { TooltipOverlay } from "../graph/Tooltip";
import { ThreadPanel } from "../graph/ThreadPanel";
import { WeightPanel } from "../graph/Weights";
import type { NodeData } from "../../types";
import * as d3 from "d3";

import threadSummary from "../../data/thread_summary.json";
import { useSharedScoring } from "../../utils/scores";
import { useEWMATrends } from "../../utils/trends";
import { useContainerSize } from "../../hooks/useContainerSize";
import { useActiveThread } from "../../hooks/useActiveThread";
import { ChordDiagramPanel } from "../charts/ChordDiagram";

export const DashboardLayout: React.FC = () => {
  const { data, network } = useGraphData();
  const { setHoverState } = useGraphHover();
  const { nodes: sortedNodes, nodeMap, threads } = network;

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [sidebarHoveredId, setSidebarHoveredId] = useState<string | null>(null);
  const [containerRef, dimensions] = useContainerSize<HTMLDivElement>();

  const {
    keys,
    weights,
    setWeights,
    externalScores,
    internalScores,
    deceptionDeltas,
  } = useSharedScoring(sortedNodes);

  const trendScores = useMemo(() => {
    return new Map(
      Array.from(externalScores, ([id, score]) => [id, score ?? 0])
    );
  }, [externalScores]);

  const externalTrends = useEWMATrends(sortedNodes, trendScores);

  const scoreDomain = useMemo<[number, number]>(() => {
    const all = [...externalScores.values(), ...internalScores.values()].map(
      (v) => v ?? 0
    );

    if (all.length === 0) return [0, 5];
    const [min, max] = d3.extent(all) as [number, number];
    const pad = (max - min) * 0.1 || 0.5;
    return [min - pad, max + pad];
  }, [externalScores, internalScores]);

  const handleNodeClick = (node: NodeData | null) => {
    setSelectedNodeId(node ? node.id : null);
  };

  const { activeNode, activeThreadId, activeMessages } = useActiveThread(
    selectedNodeId,
    nodeMap,
    threads
  );

  return (
    <div className="flex w-full h-screen overflow-hidden font-sans text-gray-900 bg-slate-100/60">
      <main className="relative flex-1 overflow-hidden" ref={containerRef}>
        {data && dimensions.width !== 0 && (
          <>
            <CanvasEngine
              width={dimensions.width}
              height={dimensions.height}
              nodes={sortedNodes}
              edges={data.edges}
              trends={externalTrends}
              timeBounds={network.timeBounds}
              nodeMap={nodeMap}
              selectedNodeId={selectedNodeId}
              sidebarHoveredId={sidebarHoveredId}
              onHoverNode={(node, x, y) =>
                setHoverState({
                  node,
                  x,
                  y,
                  scoreExternal: node
                    ? externalScores.get(node.id) ?? null
                    : null,
                  scoreInternal: node
                    ? internalScores.get(node.id) ?? null
                    : null,
                  deceptionDelta: node
                    ? deceptionDeltas.get(node.id) ?? null
                    : null,
                })
              }
              onClickNode={handleNodeClick}
              scoresExternal={externalScores}
              scoresInternal={internalScores}
              scoreDomain={scoreDomain}
            />
            <TooltipOverlay />

            <WeightPanel
              keys={keys}
              weights={weights}
              setWeights={setWeights}
            />
            <ChordDiagramPanel size={400} canvasWidth={dimensions.width} />
            {activeNode && (
              <div className="absolute top-0 right-0 z-40 h-full bg-white shadow-2xl">
                <ThreadPanel
                  threadId={activeThreadId}
                  messages={activeMessages}
                  nodeMap={nodeMap}
                  onClose={() => setSelectedNodeId(null)}
                  onHoverMessage={setSidebarHoveredId}
                  threadSummary={threadSummary}
                  scoresExternal={externalScores}
                  scoresInternal={internalScores}
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};
