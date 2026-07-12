import React, { useState, useMemo } from "react";
import type { ReactNode } from "react";
import type { EdgeData, GraphPayload, NodeData } from "../types";
import { useGraphNetwork } from "../hooks/useGraphNetwork";
import {
  GraphDataContext,
  GraphHoverContext,
  type HoverState,
} from "./GraphContext";

import rawPayload from "../data/data_eval.json";

export const GraphProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [data, setData] = useState<GraphPayload | null>(() => {
    return {
      nodes: rawPayload.nodes as NodeData[],
      edges: rawPayload.edges,
      trends: rawPayload.trends,
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

  return (
    <GraphDataContext.Provider value={dataValue}>
      <GraphHoverContext.Provider value={hoverValue}>
        {children}
      </GraphHoverContext.Provider>
    </GraphDataContext.Provider>
  );
};
