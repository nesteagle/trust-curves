export interface NodeData {
  id: string;
  timestamp: string;
  agent: string;
  scoreExternal: number;
  scoreInternal: number | null;
  deceptionDelta: number | null;
  content: string;
  reasoning: string | null;
}

export interface EdgeData {
  source: string;
  target: string;
}

export interface TrendPoint {
  timestamp: string;
  rollingAvg: number | null;
}

export interface GraphPayload {
  nodes: NodeData[];
  edges: EdgeData[];
  trends: Record<string, TrendPoint[]>;
}
