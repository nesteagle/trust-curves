import { useMemo } from "react";
import type { NodeData, EdgeData } from "../types";
import { getMs } from "./time";

export interface DAGNode extends NodeData {
  parentIds: string[];
  childIds: string[];
}

export const useGraphNetwork = (rawNodes: NodeData[], edges: EdgeData[]) => {
  return useMemo(() => {
    if (!rawNodes || rawNodes.length === 0) {
      return {
        nodes: [],
        nodeMap: new Map<string, DAGNode>(),
        threadMap: new Map<string, string>(),
        threads: new Map<string, DAGNode[]>(),
        timeBounds: [0, 0],
      };
    }

    const nodeMap = new Map<string, DAGNode>();
    const undirectedAdj = new Map<string, string[]>();

    rawNodes.forEach((n) => {
      nodeMap.set(n.id, { ...n, parentIds: [], childIds: [] });
      undirectedAdj.set(n.id, []);
    });

    edges.forEach((e) => {
      const parent = nodeMap.get(e.source);
      const child = nodeMap.get(e.target);

      if (parent && child) {
        parent.childIds.push(child.id);
        child.parentIds.push(parent.id);

        undirectedAdj.get(parent.id)!.push(child.id);
        undirectedAdj.get(child.id)!.push(parent.id);
      }
    });

    const threadMap = new Map<string, string>();
    const threads = new Map<string, DAGNode[]>();
    const visited = new Set<string>();
    let threadCounter = 0;

    rawNodes.forEach((rootNode) => {
      if (visited.has(rootNode.id)) return;

      const threadId = `thread_${threadCounter++}`;
      const bfsQueue = [rootNode.id];
      visited.add(rootNode.id);

      while (bfsQueue.length > 0) {
        const currId = bfsQueue.shift()!;
        threadMap.set(currId, threadId);

        undirectedAdj.get(currId)!.forEach((neighborId) => {
          if (!visited.has(neighborId)) {
            visited.add(neighborId);
            bfsQueue.push(neighborId);
          }
        });
      }
    });

    rawNodes.forEach((n) => {
      const threadId = threadMap.get(n.id)!;
      const hydratedNode = nodeMap.get(n.id)!;

      if (!threads.has(threadId)) {
        threads.set(threadId, []);
      }
      threads.get(threadId)!.push(hydratedNode);
    });

    // assumes rawNodes is non-empty
    const timeBounds = [
      getMs(rawNodes[0].timestamp),
      getMs(rawNodes[rawNodes.length - 1].timestamp),
    ];

    return {
      nodes: rawNodes,
      nodeMap,
      threadMap,
      threads,
      timeBounds,
    };
  }, [rawNodes, edges]);
};
