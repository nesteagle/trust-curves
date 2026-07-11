export type ExplanationEntry = [reasoning: string, score: number];
export type Explanations = Record<string, ExplanationEntry>;
export type Weights = Record<string, number>;

export interface NodeData {
  id: string;
  timestamp: string;
  agent: string;
  content: string;
  reasoning: string | null;
  explanationsExternal: Explanations | null;
  explanationsInternal: Explanations | null;
  threadId: number | null;
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
