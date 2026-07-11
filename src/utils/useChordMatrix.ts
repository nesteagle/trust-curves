import { useMemo } from "react";
import type { AgentEdgeRecord, ChordMode } from "../types";
import { getMs } from "./time";

const buildMatrix = (
  edges: AgentEdgeRecord[],
  agents: string[],
  timesMs: number[],
  range: [number, number] | null
): number[][] => {
  const index = new Map<string, number>(agents.map((a, i) => [a, i]));
  const matrix = agents.map(() => agents.map(() => 0));

  edges.forEach((edge, i) => {
    if (range) {
      const t = timesMs[i];
      if (t < range[0] || t > range[1]) return;
    }
    const s = index.get(edge.source);
    const t = index.get(edge.target);
    if (s === undefined || t === undefined) return;
    matrix[s][t] += 1;
  });

  return matrix;
};

/**
 * Builds a directed agent x agent weight matrix for the chord diagram,
 * filtered to a time window. Pass `range: null` for the full dataset.
 */
export const useChordMatrix = (
  replyEdges: AgentEdgeRecord[],
  mentionEdges: AgentEdgeRecord[],
  agents: string[],
  mode: ChordMode,
  range: [number, number] | null
) => {
  const replyTimesMs = useMemo(
    () => replyEdges.map((e) => getMs(e.timestamp)),
    [replyEdges]
  );
  const mentionTimesMs = useMemo(
    () => mentionEdges.map((e) => getMs(e.timestamp)),
    [mentionEdges]
  );

  return useMemo(() => {
    if (mode === "replies") {
      return buildMatrix(replyEdges, agents, replyTimesMs, range);
    }
    if (mode === "mentions") {
      return buildMatrix(mentionEdges, agents, mentionTimesMs, range);
    }
    const replyMatrix = buildMatrix(replyEdges, agents, replyTimesMs, range);
    const mentionMatrix = buildMatrix(
      mentionEdges,
      agents,
      mentionTimesMs,
      range
    );
    return replyMatrix.map((row, i) =>
      row.map((v, j) => v + mentionMatrix[i][j])
    );
  }, [
    replyEdges,
    mentionEdges,
    agents,
    mode,
    range,
    replyTimesMs,
    mentionTimesMs,
  ]);
};
