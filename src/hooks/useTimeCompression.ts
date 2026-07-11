import { useMemo } from "react";
import type { NodeData } from "../types";
import { getMs } from "../utils/time";
import { CONFIG } from "../utils/canvasConfig";

export const useTimeCompression = (nodes: NodeData[]) => {
  return useMemo(() => {
    const gaps: {
      start: number;
      end: number;
      shiftBefore: number;
      shiftAfter: number;
    }[] = [];
    let totalShift = 0;

    for (let i = 0; i < nodes.length - 1; i++) {
      const start = getMs(nodes[i].timestamp);
      const end = getMs(nodes[i + 1].timestamp);
      if (end - start > CONFIG.TIME.GAP_THRESHOLD_MS) {
        const shift = end - start - CONFIG.TIME.COLLAPSED_SPACE_MS;
        totalShift += shift;
        gaps.push({
          start,
          end,
          shiftBefore: totalShift - shift,
          shiftAfter: totalShift,
        });
      }
    }

    const reversedGaps = [...gaps].reverse();
    const reversedSimGaps = reversedGaps.map((g) => ({
      ...g,
      simStart: g.start - g.shiftBefore,
      simEnd: g.end - g.shiftAfter,
    }));

    return {
      gaps,
      toSim: (real: number) => {
        const gap = reversedGaps.find((g) => real >= g.start);
        if (!gap) return real;
        if (real >= gap.end) return real - gap.shiftAfter;
        const progress = (real - gap.start) / (gap.end - gap.start);
        return (
          gap.start -
          gap.shiftBefore +
          progress * CONFIG.TIME.COLLAPSED_SPACE_MS
        );
      },
      toReal: (sim: number) => {
        const gap = reversedSimGaps.find((g) => sim >= g.simStart);
        if (!gap) return sim;
        if (sim >= gap.simEnd) return sim + gap.shiftAfter;
        const progress = (sim - gap.simStart) / (gap.simEnd - gap.simStart);
        return gap.start + progress * (gap.end - gap.start);
      },
    };
  }, [nodes]);
};

export type TimeCompression = ReturnType<typeof useTimeCompression>;
