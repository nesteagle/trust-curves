import React, { useState, useMemo, useCallback } from "react";
import type { ReactNode } from "react";
import type { EdgeData, GraphPayload, NodeData } from "../types";
import { useGraphNetwork } from "../hooks/useGraphNetwork";
import {
  GraphDataContext,
  GraphFilterContext,
  GraphHoverContext,
  type HoverState,
  type FilterState,
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

  const [filters, setFilters] = useState<FilterState>({ hiddenAgents: [] });

  const toggleAgentFilter = useCallback((agent: string) => {
    setFilters((prev) => ({
      ...prev,
      hiddenAgents: prev.hiddenAgents.includes(agent)
        ? prev.hiddenAgents.filter((a) => a !== agent)
        : [...prev.hiddenAgents, agent],
    }));
  }, []);

  const dataValue = useMemo(
    () => ({
      data,
      setData,
      network,
    }),
    [data, network]
  );

  const filterValue = useMemo(
    () => ({ filters, setFilters, toggleAgentFilter }),
    [filters, toggleAgentFilter]
  );

  const hoverValue = useMemo(
    () => ({ hoverState, setHoverState }),
    [hoverState]
  );

  return (
    <GraphDataContext.Provider value={dataValue}>
      <GraphFilterContext.Provider value={filterValue}>
        <GraphHoverContext.Provider value={hoverValue}>
          {children}
        </GraphHoverContext.Provider>
      </GraphFilterContext.Provider>
    </GraphDataContext.Provider>
  );
};
