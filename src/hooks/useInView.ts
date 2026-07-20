import { useEffect, useMemo, useState } from "react";
import * as d3 from "d3";
import { useGraphData, useGraphFilter } from "../store/GraphContext";
import { useTimeCompression } from "./useTimeCompression";
import { bisectTime, CONFIG } from "../utils/canvasConfig";
import { extractEntities } from "../utils/chordMatrix";
import type { NodeData } from "../types";
import { buildXScale } from "./useCanvasScales";

export function getNodesInView(
  nodes: NodeData[],
  xScale: d3.ScaleLinear<number, number>,
  transform: d3.ZoomTransform,
  toReal: (sim: number) => number
): NodeData[] {
  if (nodes.length === 0) return nodes;
  const currentXScale = transform.rescaleX(xScale);
  const [minSimTime, maxSimTime] = currentXScale.domain();
  const startIndex = bisectTime(nodes, toReal(minSimTime));
  const endIndex = bisectTime(nodes, toReal(maxSimTime));
  return nodes.slice(startIndex, endIndex);
}

export function useEntitiesInView(canvasWidth: number) {
  const { network } = useGraphData();
  const { isNodeFiltered } = useGraphFilter();
  const nodes = network.nodes;
  const timeCompression = useTimeCompression(nodes);
  const [transform, setTransform] = useState(d3.zoomIdentity);

  useEffect(() => {
    const handleTransform = (e: Event) => {
      setTransform((e as CustomEvent<d3.ZoomTransform>).detail);
    };
    window.addEventListener("graph-transform", handleTransform);
    return () => window.removeEventListener("graph-transform", handleTransform);
  }, []);

  const innerWidth = Math.max(
    0,
    canvasWidth - CONFIG.MARGIN.left - CONFIG.MARGIN.right
  );

  const xScale = useMemo(
    () => buildXScale(network?.timeBounds, innerWidth, timeCompression),
    [network?.timeBounds, innerWidth, timeCompression]
  );

  const nodesInView = useMemo(() => {
    const inView = getNodesInView(
      nodes,
      xScale,
      transform,
      timeCompression.toReal
    );
    return inView.filter((n) => !isNodeFiltered(n));
  }, [nodes, xScale, transform, timeCompression, isNodeFiltered]);

  const entities = useMemo(() => extractEntities(nodesInView), [nodesInView]);

  return { nodesInView, entities };
}
