import { useMemo } from "react";
import type { NodeData, EdgeData } from "../types";
import { getMs } from "../utils/time";

export interface DAGNode extends NodeData {
  parentIds: string[];
  childIds: string[];
}

export const processGraphNetwork = (
  rawNodes: NodeData[],
  edges: EdgeData[]
) => {
  if (!rawNodes || rawNodes.length === 0) {
    return {
      nodes: [],
      nodeMap: new Map<string, DAGNode>(),
      threads: new Map<number, DAGNode[]>(),
      timeBounds: [0, 0] as [number, number],
    };
  }

  const nodes: DAGNode[] = [];
  const nodeMap = new Map<string, DAGNode>();
  const threads = new Map<number, DAGNode[]>();

  rawNodes.forEach((n) => {
    const threadId = n.threadId;
    const hydratedNode: DAGNode = {
      ...n,
      parentIds: [],
      childIds: [],
    };

    nodes.push(hydratedNode);
    nodeMap.set(n.id, hydratedNode);

    if (threadId === null) return;
    let threadGroup = threads.get(threadId);
    if (!threadGroup) {
      threadGroup = [];
      threads.set(threadId, threadGroup);
    }
    threadGroup.push(hydratedNode);
  });

  edges.forEach((e) => {
    const parent = nodeMap.get(e.source);
    const child = nodeMap.get(e.target);

    if (parent && child) {
      parent.childIds.push(child.id);
      child.parentIds.push(parent.id);
    }
  });

  const timeBounds: [number, number] = [
    getMs(rawNodes[0].timestamp),
    getMs(rawNodes[rawNodes.length - 1].timestamp),
  ];

  return {
    nodes,
    nodeMap,
    threads,
    timeBounds,
  };
};

export const useGraphNetwork = (rawNodes: NodeData[], edges: EdgeData[]) => {
  return useMemo(() => processGraphNetwork(rawNodes, edges), [rawNodes, edges]);
};
