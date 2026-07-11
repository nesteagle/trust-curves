import { useMemo } from "react";
import * as d3 from "d3";
import type { TrendPoint } from "../types";
import { getMs } from "../utils/time";
import { CONFIG } from "../utils/canvasConfig";
import type { TimeCompression } from "./useTimeCompression";

export const useCanvasScales = (
  timeBounds: [number, number],
  innerWidth: number,
  innerHeight: number,
  timeCompression: TimeCompression,
  scoreDomain: [number, number]
) => {
  const baseScales = useMemo(() => {
    const simMin = timeCompression.toSim(timeBounds[0]);
    const simMax = timeCompression.toSim(timeBounds[1]);
    const pad = (simMax - simMin) * CONFIG.X_PAD_RATIO;
    return {
      x: d3
        .scaleLinear()
        .domain([simMin - pad, simMax + pad])
        .range([0, innerWidth]),
      y: d3.scaleLinear().domain(scoreDomain).range([innerHeight, 0]),
    };
  }, [timeBounds, innerWidth, innerHeight, timeCompression, scoreDomain]);

  const trendLine = useMemo(() => {
    return d3
      .line<TrendPoint>()
      .defined(() => true)
      .x((p) => timeCompression.toSim(getMs(p.timestamp)))
      .y((p) => p.rollingAvg ?? 0)
      .curve(d3.curveBasis);
  }, [timeCompression]);

  return { baseScales, trendLine };
};
