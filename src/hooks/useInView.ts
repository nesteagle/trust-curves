import { useEffect, useMemo, useState } from "react";
import * as d3 from "d3";
import { useGraphData } from "../store/GraphContext";
import { useTimeCompression } from "./useTimeCompression";
import { bisectTime, CONFIG } from "../utils/canvasConfig";
import { extractEntities } from "../utils/chordMatrix";
import type { NodeData } from "../types";

function getNodesInView(
  nodes: NodeData[],
  timeBounds: [number, number] | undefined,
  transform: d3.ZoomTransform,
  innerWidth: number,
  toSim: (real: number) => number,
  toReal: (sim: number) => number
) {
  if (nodes.length === 0 || !timeBounds) return nodes;

  const simMin = toSim(timeBounds[0]);
  const simMax = toSim(timeBounds[1]);
  const pad = (simMax - simMin) * CONFIG.X_PAD_RATIO;

  const baseXScale = d3
    .scaleLinear()
    .domain([simMin - pad, simMax + pad])
    .range([0, innerWidth]);

  const currentXScale = transform.rescaleX(baseXScale);
  const [minSimTime, maxSimTime] = currentXScale.domain();

  const startIndex = bisectTime(nodes, toReal(minSimTime));
  const endIndex = bisectTime(nodes, toReal(maxSimTime));

  return nodes.slice(startIndex, endIndex);
}

export function useEntitiesInView(canvasWidth: number) {
  const { network } = useGraphData();
  const nodes = network.nodes;
  const timeCompression = useTimeCompression(nodes);
  const [transform, setTransform] = useState(d3.zoomIdentity);

  useEffect(() => {
    const handleTransform = (e: Event) => {
      const { detail } = e as CustomEvent<d3.ZoomTransform>;
      setTransform(detail);
    };
    window.addEventListener("graph-transform", handleTransform);
    return () => window.removeEventListener("graph-transform", handleTransform);
  }, []);

  const innerWidth = Math.max(
    0,
    canvasWidth - CONFIG.MARGIN.left - CONFIG.MARGIN.right
  );

  const nodesInView = useMemo(
    () =>
      getNodesInView(
        nodes,
        network?.timeBounds,
        transform,
        innerWidth,
        timeCompression.toSim,
        timeCompression.toReal
      ),
    [nodes, network?.timeBounds, transform, innerWidth, timeCompression]
  );

  const entities = useMemo(() => extractEntities(nodesInView), [nodesInView]);

  return { nodesInView, entities };
}
