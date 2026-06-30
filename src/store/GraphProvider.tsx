import React, { useState, useMemo, useCallback } from "react";
import type { ReactNode } from "react";
import type { GraphPayload } from "../types";
import { useGraphNetwork } from "../utils/useGraphNetwork";
import {
  GraphDataContext,
  GraphFilterContext,
  GraphHoverContext,
  type HoverState,
  type FilterState,
} from "./GraphContext";

export const GraphProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [data, setData] = useState<GraphPayload | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const network = useGraphNetwork(data?.nodes || [], data?.edges || []);

  const [hoverState, setHoverState] = useState<HoverState>({
    node: null,
    x: 0,
    y: 0,
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
      isLoading,
      error,
      setData,
      setIsLoading,
      setError,
      network,
    }),
    [data, isLoading, error, network]
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
