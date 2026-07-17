import { useMemo } from "react";
import type { NodeData, TrendPoint } from "../types";

const DEFAULT_ALPHA = 0.1;

export function computeEWMATrends(
  nodes: NodeData[],
  scores: Map<string, number | null>,
  alpha: number = DEFAULT_ALPHA
): Record<string, TrendPoint[]> {
  const byAgent = new Map<string, NodeData[]>();
  for (const n of nodes) {
    if (!byAgent.has(n.agent)) byAgent.set(n.agent, []);
    byAgent.get(n.agent)!.push(n);
  }

  const result: Record<string, TrendPoint[]> = {};

  for (const [agent, agentNodes] of byAgent) {
    let ewma: number | null = null;

    const points: TrendPoint[] = agentNodes.map((n) => {
      const score = scores.get(n.id);

      if (score == null) {
        return { timestamp: n.timestamp, rollingAvg: null };
      }

      ewma = ewma === null ? score : alpha * score + (1 - alpha) * ewma;
      return { timestamp: n.timestamp, rollingAvg: ewma };
    });

    result[agent] = points;
  }

  return result;
}

export function useEWMATrends(
  nodes: NodeData[],
  scores: Map<string, number | null>,
  alpha: number = DEFAULT_ALPHA
): Record<string, TrendPoint[]> {
  return useMemo(
    () => computeEWMATrends(nodes, scores, alpha),
    [nodes, scores, alpha]
  );
}
