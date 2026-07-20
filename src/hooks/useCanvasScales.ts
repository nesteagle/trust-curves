import { useMemo } from "react";
import * as d3 from "d3";
import type { TrendPoint } from "../types";
import { getMs } from "../utils/time";
import { CONFIG } from "../utils/canvasConfig";
import type { TimeCompression } from "./useTimeCompression";

export function buildXScale(
  timeBounds: [number, number],
  innerWidth: number,
  timeCompression: TimeCompression
): d3.ScaleLinear<number, number> {
  const simMin = timeCompression.toSim(timeBounds[0]);
  const simMax = timeCompression.toSim(timeBounds[1]);
  const pad = (simMax - simMin) * CONFIG.X_PAD_RATIO;
  return d3
    .scaleLinear()
    .domain([simMin - pad, simMax + pad])
    .range([0, innerWidth]);
}

export function buildYScale(
  scoreDomain: [number, number],
  innerHeight: number
): d3.ScaleLinear<number, number> {
  return d3.scaleLinear().domain(scoreDomain).range([innerHeight, 0]);
}

export function buildTrendLine(
  timeCompression: TimeCompression
): d3.Line<TrendPoint> {
  return d3
    .line<TrendPoint>()
    .defined(() => true)
    .x((p) => timeCompression.toSim(getMs(p.timestamp)))
    .y((p) => p.rollingAvg ?? 0)
    .curve(d3.curveBasis);
}

export const useCanvasScales = (
  timeBounds: [number, number],
  innerWidth: number,
  innerHeight: number,
  timeCompression: TimeCompression,
  scoreDomain: [number, number]
) => {
  const baseScales = useMemo(
    () => ({
      x: buildXScale(timeBounds, innerWidth, timeCompression),
      y: buildYScale(scoreDomain, innerHeight),
    }),
    [timeBounds, innerWidth, innerHeight, timeCompression, scoreDomain]
  );

  const trendLine = useMemo(
    () => buildTrendLine(timeCompression),
    [timeCompression]
  );

  return { baseScales, trendLine };
};
