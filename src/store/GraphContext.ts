import { createContext, useContext } from "react";
import type React from "react";
import type { GraphPayload, NodeData, Visibility } from "../types";
import { useGraphNetwork } from "../hooks/useGraphNetwork";
import type { GraphAnnotation } from "../types";

export interface HoverState {
  node: NodeData | null;
  x: number;
  y: number;
  scoreExternal: number | null;
  scoreInternal: number | null;
  deceptionDelta: number | null;
}

export interface FilterState {
  visibility: Set<Visibility> | null; // null = no filter
  channel: Set<string> | null;
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

export interface AnnotationContextType {
  annotations: GraphAnnotation[];
  addAnnotation: (a: GraphAnnotation) => void;
  updateAnnotation: (id: string, patch: Partial<GraphAnnotation>) => void;
  removeAnnotation: (id: string) => void;
}

export interface FilterContextType {
  filterState: FilterState;
  setFilterState: React.Dispatch<React.SetStateAction<FilterState>>;
  isNodeFiltered: (node: NodeData) => boolean; // true means filtered
}

export const GraphDataContext = createContext<DataContextType | undefined>(
  undefined
);

export const GraphHoverContext = createContext<HoverContextType | undefined>(
  undefined
);
export const GraphAnnotationContext = createContext<
  AnnotationContextType | undefined
>(undefined);

export const GraphFilterContext = createContext<FilterContextType | undefined>(
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

export const useGraphAnnotation = () => {
  const context = useContext(GraphAnnotationContext);
  if (!context)
    throw new Error("useGraphAnnotation must be used within a GraphProvider");
  return context;
};

export const useGraphFilter = () => {
  const context = useContext(GraphFilterContext);
  if (!context)
    throw new Error("useGraphFilter must be used within a GraphProvider");
  return context;
};
