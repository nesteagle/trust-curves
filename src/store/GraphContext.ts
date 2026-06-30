import { createContext, useContext } from "react";
import type React from "react";
import type { GraphPayload, NodeData } from "../types";
import { useGraphNetwork } from "../utils/useGraphNetwork";

export interface HoverState {
  node: NodeData | null;
  x: number;
  y: number;
}

export interface FilterState {
  hiddenAgents: string[];
}

export interface DataContextType {
  data: GraphPayload | null;
  isLoading: boolean;
  error: string | null;
  setData: (data: GraphPayload) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  network: ReturnType<typeof useGraphNetwork>;
}

export interface FilterContextType {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  toggleAgentFilter: (agent: string) => void;
}

export interface HoverContextType {
  hoverState: HoverState;
  setHoverState: React.Dispatch<React.SetStateAction<HoverState>>;
}

export const GraphDataContext = createContext<DataContextType | undefined>(
  undefined
);
export const GraphFilterContext = createContext<FilterContextType | undefined>(
  undefined
);
export const GraphHoverContext = createContext<HoverContextType | undefined>(
  undefined
);

export const useGraphData = () => {
  const context = useContext(GraphDataContext);
  if (!context)
    throw new Error("useGraphData must be used within a GraphProvider");
  return context;
};

export const useGraphFilters = () => {
  const context = useContext(GraphFilterContext);
  if (!context)
    throw new Error("useGraphFilters must be used within a GraphProvider");
  return context;
};

export const useGraphHover = () => {
  const context = useContext(GraphHoverContext);
  if (!context)
    throw new Error("useGraphHover must be used within a GraphProvider");
  return context;
};
