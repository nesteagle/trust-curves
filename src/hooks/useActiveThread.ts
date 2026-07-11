import { useMemo } from "react";
import type { DAGNode } from "./useGraphNetwork";

export const useActiveThread = (
  selectedNodeId: string | null,
  nodeMap: Map<string, DAGNode>,
  threads: Map<number, DAGNode[]>
) => {
  const activeNode = selectedNodeId
    ? nodeMap.get(selectedNodeId) ?? null
    : null;
  const activeThreadId = activeNode?.threadId ?? null;

  const activeMessages = useMemo(() => {
    if (!activeNode) return [];
    if (activeThreadId != null && threads.has(activeThreadId)) {
      return threads.get(activeThreadId)!;
    }
    return [activeNode];
  }, [activeNode, activeThreadId, threads]);

  return { activeNode, activeThreadId, activeMessages };
};
