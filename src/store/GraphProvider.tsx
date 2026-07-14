import React, { useState, useMemo, useCallback } from "react";
import type { ReactNode } from "react";
import type {
  EdgeData,
  GraphAnnotation,
  GraphPayload,
  NodeData,
} from "../types";
import { useGraphNetwork } from "../hooks/useGraphNetwork";
import {
  GraphDataContext,
  GraphHoverContext,
  GraphAnnotationContext,
  type HoverState,
} from "./GraphContext";

import rawPayload from "../data/data_eval.json";
import { DEFAULT_ANNOTATIONS } from "../utils/annotations";

export const GraphProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [data, setData] = useState<GraphPayload | null>(() => {
    return {
      nodes: rawPayload.nodes as NodeData[],
      edges: rawPayload.edges,
    };
  });

  const EMPTY_NODES: NodeData[] = [];
  const EMPTY_EDGES: EdgeData[] = [];

  const network = useGraphNetwork(
    data?.nodes ?? EMPTY_NODES,
    data?.edges ?? EMPTY_EDGES
  );

  const [hoverState, setHoverState] = useState<HoverState>({
    node: null,
    x: 0,
    y: 0,
    scoreExternal: null,
    scoreInternal: null,
    deceptionDelta: null,
  });

  const dataValue = useMemo(
    () => ({
      data,
      setData,
      network,
    }),
    [data, network]
  );

  const hoverValue = useMemo(
    () => ({ hoverState, setHoverState }),
    [hoverState]
  );

  const [annotations, setAnnotations] =
    useState<GraphAnnotation[]>(DEFAULT_ANNOTATIONS);

  const addAnnotation = useCallback((a: GraphAnnotation) => {
    setAnnotations((prev) => [...prev, a]);
  }, []);

  const updateAnnotation = useCallback(
    (id: string, patch: Partial<GraphAnnotation>) => {
      setAnnotations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...patch } : a))
      );
    },
    []
  );

  const removeAnnotation = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const annotationValue = useMemo(
    () => ({ annotations, addAnnotation, updateAnnotation, removeAnnotation }),
    [annotations, addAnnotation, updateAnnotation, removeAnnotation]
  );

  return (
    <GraphDataContext.Provider value={dataValue}>
      <GraphHoverContext.Provider value={hoverValue}>
        <GraphAnnotationContext.Provider value={annotationValue}>
          {children}
        </GraphAnnotationContext.Provider>
      </GraphHoverContext.Provider>
    </GraphDataContext.Provider>
  );
};
