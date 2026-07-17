import type { EdgeData, NodeData } from "../types";

export interface ChordMatrixPayload {
  matrix: number[][];
  entities: string[];
}

export function extractEntities(nodes: NodeData[]) {
  return Array.from(
    new Set(
      nodes
        .map((node) => node.agent)
        .filter((agent): agent is string => !!agent)
    )
  ).sort();
}

// message-to-message edges into adjacency matrix
export function generateChordMatrix(
  edges: EdgeData[],
  nodes: NodeData[]
): ChordMatrixPayload {
  const messageToAgent = new Map<string, string>();
  nodes.forEach((node) => {
    if (node.agent) {
      messageToAgent.set(node.id, node.agent);
    }
  });

  const agentEdges = edges
    .map((edge) => {
      const sourceAgent = messageToAgent.get(edge.source);
      const targetAgent = messageToAgent.get(edge.target);
      return { sourceAgent, targetAgent };
    })
    .filter(
      (edge): edge is { sourceAgent: string; targetAgent: string } =>
        !!edge.sourceAgent && !!edge.targetAgent
    );

  const entities = extractEntities(nodes);

  const size = entities.length;
  const entityToIndex = new Map(entities.map((name, i) => [name, i]));

  const matrix: number[][] = Array.from({ length: size }, () =>
    new Array(size).fill(0)
  );

  agentEdges.forEach(({ sourceAgent, targetAgent }) => {
    const sourceIdx = entityToIndex.get(sourceAgent);
    const targetIdx = entityToIndex.get(targetAgent);
    if (sourceIdx !== undefined && targetIdx !== undefined) {
      matrix[sourceIdx][targetIdx] += 1;
    }
  });

  return { matrix, entities };
}
