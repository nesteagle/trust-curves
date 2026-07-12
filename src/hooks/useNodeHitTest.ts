import { useCallback } from "react";
import type { NodeData } from "../types";
import { getMs } from "../utils/time";
import { bisectTime, CONFIG } from "../utils/canvasConfig";
import type { TimeCompression } from "./useTimeCompression";

interface BaseScales {
  x: d3.ScaleLinear<number, number>;
  y: d3.ScaleLinear<number, number>;
}

export const useNodeHitTest = (
  nodes: NodeData[],
  baseScales: BaseScales,
  timeCompression: TimeCompression,
  getExternalScoreOrZero: (nodeId: string) => number,
  transformRef: React.RefObject<d3.ZoomTransform>
) => {
  return useCallback(
    (mouseX: number, mouseY: number): NodeData | null => {
      const currentX = transformRef.current.rescaleX(baseScales.x);
      const hoveredRealTime = timeCompression.toReal(currentX.invert(mouseX));

      const searchRadiusTime =
        timeCompression.toReal(currentX.invert(CONFIG.HOVER_RADIUS)) -
        timeCompression.toReal(currentX.invert(0));

      const startIndex = bisectTime(nodes, hoveredRealTime - searchRadiusTime);
      const endIndex = bisectTime(nodes, hoveredRealTime + searchRadiusTime);

      let closestNode: NodeData | null = null;
      let minDistance = CONFIG.HOVER_RADIUS;

      for (
        let i = Math.max(0, startIndex - 1);
        i <= Math.min(nodes.length - 1, endIndex + 1);
        i++
      ) {
        const candidate = nodes[i];
        if (!candidate) continue;

        const score = getExternalScoreOrZero(candidate.id);

        const distance = Math.hypot(
          currentX(timeCompression.toSim(getMs(candidate.timestamp))) - mouseX,
          baseScales.y(score) - mouseY
        );

        if (distance < minDistance) {
          minDistance = distance;
          closestNode = candidate;
        }
      }
      return closestNode;
    },
    [nodes, baseScales, timeCompression, getExternalScoreOrZero, transformRef]
  );
};
