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

export interface AgentEdgeRecord {
  source: string;
  target: string;
  message_id: string;
  timestamp: string;
}

export interface AgentConnectionsPayload {
  agents: string[];
  labels: string[];
  reply_matrix: number[][];
  mention_matrix: number[][];
  combined_matrix: number[][];
  reply_edges: AgentEdgeRecord[];
  mention_edges: AgentEdgeRecord[];
  meta: {
    total_messages: number;
    resolved_reply_edges: number;
    unresolved_messages: number;
    mentioning_messages: number;
    resolved_mention_edges: number;
  };
}

export type ChordMode = "replies" | "mentions" | "both";
