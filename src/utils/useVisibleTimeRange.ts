import { useEffect, useMemo, useState } from "react";
import * as d3 from "d3";
import { getGraphTransform } from "./graphTransformStore";
import { CONFIG } from "./canvasConfig";
import type { TimeCompression } from "../hooks/useTimeCompression";

/**
 * Tracks the real-time window currently visible on the main timeline
 * (Engine.tsx), by listening to the same "graph-transform" CustomEvent it
 * dispatches on zoom/pan. Only subscribes while `enabled` is true, so idle
 * panels don't pay the cost of re-deriving a range on every tick.
 *
 * Engine.tsx's x-scale domain is in "sim time" (long gaps between messages
 * are compressed for display — see useTimeCompression), not raw epoch time,
 * so the rescaled domain has to be converted back via `timeCompression.toReal`
 * before it's comparable to real message/edge timestamps.
 */
export const useVisibleTimeRange = (
  timeBounds: [number, number],
  mainWidth: number,
  timeCompression: TimeCompression,
  enabled: boolean
): [number, number] | null => {
  const baseX = useMemo(() => {
    // Must mirror Engine.tsx's own baseScales.x exactly: the zoom behavior
    // there is bound to the canvas's inner area (width minus margins), so
    // rescaling against the full container width would misalign the domain.
    const innerWidth = Math.max(
      0,
      mainWidth - CONFIG.MARGIN.left - CONFIG.MARGIN.right
    );
    if (innerWidth === 0) return null;
    const simMin = timeCompression.toSim(timeBounds[0]);
    const simMax = timeCompression.toSim(timeBounds[1]);
    const pad = (simMax - simMin) * CONFIG.X_PAD_RATIO;
    return d3
      .scaleLinear()
      .domain([simMin - pad, simMax + pad])
      .range([0, innerWidth]);
  }, [timeBounds, mainWidth, timeCompression]);

  const [range, setRange] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!baseX || !enabled) return;

    let frame: number | null = null;
    // Seed with whatever transform the timeline is already at — the user
    // may have zoomed/panned before ever opening this panel, so we can't
    // assume the identity transform here.
    let latestTransform: d3.ZoomTransform = getGraphTransform();

    const applyTransform = () => {
      const [simA, simB] = latestTransform.rescaleX(baseX).domain();
      const a = timeCompression.toReal(simA);
      const b = timeCompression.toReal(simB);
      setRange([Math.min(a, b), Math.max(a, b)]);
    };

    applyTransform();

    const handleTransform = (e: Event) => {
      latestTransform = (e as CustomEvent<d3.ZoomTransform>).detail;
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        applyTransform();
      });
    };

    window.addEventListener("graph-transform", handleTransform);
    return () => {
      window.removeEventListener("graph-transform", handleTransform);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [baseX, enabled, timeCompression]);

  return enabled ? range : null;
};
