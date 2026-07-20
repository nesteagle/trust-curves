import { useMemo, useState } from "react";
import type { ExplanationEntry, Explanations, Weights } from "../types";
import type { DAGNode } from "../hooks/useGraphNetwork";

export type ScoreScope = "explanationsExternal" | "explanationsInternal";

export interface ScorableRecord {
  id: string;
  explanationsExternal: Explanations | null;
  explanationsInternal: Explanations | null;
}

function isExplanationEntry(v: unknown): v is ExplanationEntry {
  return (
    Array.isArray(v) &&
    v.length === 2 &&
    typeof v[0] === "string" &&
    typeof v[1] === "number"
  );
}

export function parseValidExplanations(raw: unknown): Explanations | null {
  if (!raw || typeof raw !== "object") return null;
  const out: Explanations = {};
  let hasKeys = false;

  for (const key in raw) {
    if (Object.prototype.hasOwnProperty.call(raw, key)) {
      const value = (raw as Record<string, unknown>)[key];
      if (isExplanationEntry(value)) {
        out[key] = value;
        hasKeys = true;
      }
    }
  }
  return hasKeys ? out : null;
}

function extractKeysToSet(
  explanations: Explanations | null,
  keysSet: Set<string>
) {
  if (!explanations) return;
  for (const key in explanations) {
    if (Object.prototype.hasOwnProperty.call(explanations, key)) {
      keysSet.add(key);
    }
  }
}

export function discoverAllKeys(records: ScorableRecord[]): string[] {
  const keys = new Set<string>();
  for (const r of records) {
    extractKeysToSet(r.explanationsExternal, keys);
    extractKeysToSet(r.explanationsInternal, keys);
  }
  return Array.from(keys).sort();
}

export function useWeights(keys: string[]) {
  const [weights, setWeights] = useState<Weights>(() => {
    const init: Weights = {};
    const average = keys.length ? 100 / keys.length : 0;
    for (const k of keys) {
      init[k] = average;
    }
    return init;
  });

  return [weights, setWeights] as const;
}

export function normalizeScore(rawScore: number): number {
  return (rawScore - 3) / 2;
}

export function computeScore(
  explanations: Explanations | null,
  weights: Weights
): number | null {
  if (!explanations) return null;

  let sumW = 0;
  let sumWV = 0;

  for (const key in explanations) {
    const w = weights[key] ?? 0;
    if (w <= 0) continue;

    const value = explanations[key][1];
    sumW += w;
    sumWV += w * value;
  }

  return sumW === 0 ? 0 : normalizeScore(sumWV / sumW);
}

export function useScore(
  explanations: Explanations | null,
  weights: Weights
): number | null {
  return useMemo(
    () => computeScore(explanations, weights),
    [explanations, weights]
  );
}

export function useScores(
  records: ScorableRecord[],
  scope: ScoreScope,
  weights: Weights
): (number | null)[] {
  return useMemo(
    () => records.map((r) => computeScore(r[scope], weights)),
    [records, scope, weights]
  );
}

export function useScoresMap(
  records: ScorableRecord[],
  scope: ScoreScope,
  weights: Weights
): Map<string, number | null> {
  return useMemo(() => {
    const map = new Map<string, number | null>();
    for (const r of records) map.set(r.id, computeScore(r[scope], weights));
    return map;
  }, [records, scope, weights]);
}

function useStableNodes(nodes: DAGNode[]): DAGNode[] {
  const key = nodes.map((n) => n.id).join(",");
  const ref = useMemo(() => ({ key, nodes }), [key, nodes]);
  return ref.nodes;
}

export function useSharedScoring(nodes: DAGNode[]) {
  const stableNodes = useStableNodes(nodes);

  const keys = useMemo(() => discoverAllKeys(stableNodes), [stableNodes]);
  const [weights, setWeights] = useWeights(keys);

  const externalScores = useScoresMap(
    stableNodes,
    "explanationsExternal",
    weights
  );
  const internalScores = useScoresMap(
    stableNodes,
    "explanationsInternal",
    weights
  );

  const deceptionDeltas = useMemo(() => {
    const map = new Map<string, number | null>();
    stableNodes.forEach((node) => {
      const ext = externalScores.get(node.id);
      const int = internalScores.get(node.id);
      map.set(node.id, ext == null || int == null ? null : ext - int);
    });
    return map;
  }, [stableNodes, externalScores, internalScores]);

  return {
    keys,
    weights,
    setWeights,
    externalScores,
    internalScores,
    deceptionDeltas,
  };
}
