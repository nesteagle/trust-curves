import { useCallback } from "react";
import type { GraphAnnotation } from "../types";
import { getMs } from "../utils/time";
import { CONFIG } from "../utils/canvasConfig";
import type { TimeCompression } from "./useTimeCompression";

interface BaseScales {
  x: d3.ScaleLinear<number, number>;
}

export const useAnnotationHitTest = (
  annotations: GraphAnnotation[],
  baseScales: BaseScales,
  timeCompression: TimeCompression,
  transformRef: React.MutableRefObject<d3.ZoomTransform>
) => {
  return useCallback(
    (mouseX: number): GraphAnnotation | null => {
      const currentX = transformRef.current.rescaleX(baseScales.x);
      let closest: GraphAnnotation | null = null;
      let minDist = CONFIG.ANNOTATION.HIT_RADIUS;

      for (const ann of annotations) {
        const sx = currentX(timeCompression.toSim(getMs(ann.timestamp)));
        const dist = Math.abs(sx - mouseX);
        if (dist < minDist) {
          minDist = dist;
          closest = ann;
        }
      }
      return closest;
    },
    [annotations, baseScales, timeCompression, transformRef]
  );
};
