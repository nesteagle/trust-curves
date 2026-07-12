import { createContext, useContext } from "react";
import type React from "react";
import type { GraphPayload, NodeData } from "../types";
import { useGraphNetwork } from "../hooks/useGraphNetwork";

export interface HoverState {
  node: NodeData | null;
  x: number;
  y: number;
  scoreExternal: number | null;
  scoreInternal: number | null;
  deceptionDelta: number | null;
}


export interface DataContextType {
  data: GraphPayload | null;
  setData: (data: GraphPayload) => void;
  network: ReturnType<typeof useGraphNetwork>;
}

export interface HoverContextType {
  hoverState: HoverState;
  setHoverState: React.Dispatch<React.SetStateAction<HoverState>>;
}

export const GraphDataContext = createContext<DataContextType | undefined>(
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

export const useGraphHover = () => {
  const context = useContext(GraphHoverContext);
  if (!context)
    throw new Error("useGraphHover must be used within a GraphProvider");
  return context;
};
