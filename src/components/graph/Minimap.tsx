import React, { useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import { useGraphData } from "../../store/GraphContext";
import { getMs } from "../../utils/time";

interface MinimapProps {
  mainWidth: number;
  mainHeight: number;
}

const MINI_WIDTH = 250;
const MINI_HEIGHT = 150;

export const Minimap: React.FC<MinimapProps> = ({ mainWidth, mainHeight }) => {
  const { network } = useGraphData();
  const viewportBoxRef = useRef<SVGRectElement>(null);

  const scales = useMemo(() => {
    if (!network || network.nodes.length === 0) return null;

    const [minT, maxT] = network.timeBounds;
    const pad = (maxT - minT) * 0.05;

    const xDomain = [minT - pad, maxT + pad];
    const yDomain = [-1.1, 1.1];

    return {
      baseMainX: d3.scaleLinear().domain(xDomain).range([0, mainWidth]),
      baseMainY: d3.scaleLinear().domain(yDomain).range([mainHeight, 0]),

      miniX: d3.scaleLinear().domain(xDomain).range([0, MINI_WIDTH]),
      miniY: d3.scaleLinear().domain(yDomain).range([MINI_HEIGHT, 0]),
    };
  }, [network, mainWidth, mainHeight]);

  useEffect(() => {
    if (!scales) return;

    const handleTransform = (e: Event) => {
      const customEvent = e as CustomEvent<d3.ZoomTransform>;
      const transform = customEvent.detail;
      const rect = viewportBoxRef.current;
      if (!rect) return;

      const currentMainX = transform.rescaleX(scales.baseMainX);
      const xDomain = currentMainX.domain();

      const visibleMinTime = Math.min(xDomain[0], xDomain[1]);
      const visibleMaxTime = Math.max(xDomain[0], xDomain[1]);

      const x = scales.miniX(visibleMinTime);
      const width = scales.miniX(visibleMaxTime) - x;

      rect.setAttribute("x", Math.max(0, x).toString());
      rect.setAttribute("y", "0");
      rect.setAttribute(
        "width",
        Math.max(0, Math.min(MINI_WIDTH, width)).toString()
      );
      rect.setAttribute("height", MINI_HEIGHT.toString());
    };

    window.addEventListener("graph-transform", handleTransform);
    return () => window.removeEventListener("graph-transform", handleTransform);
  }, [scales]);

  if (!network || !scales) return null;

  return (
    <div
      className="absolute bottom-6 right-6 bg-white border border-gray-200 shadow-xl rounded-lg overflow-hidden"
      style={{ width: MINI_WIDTH, height: MINI_HEIGHT }}
    >
      <svg width={MINI_WIDTH} height={MINI_HEIGHT} className="absolute inset-0">
        {network.nodes.map((node) => (
          <circle
            key={node.id}
            cx={scales.miniX(getMs(node.timestamp))}
            cy={scales.miniY(node.scoreExternal)}
            r={1}
            fill="rgba(100, 100, 100, 0.4)"
          />
        ))}

        <rect
          ref={viewportBoxRef}
          x={0}
          y={0}
          width={MINI_WIDTH}
          height={MINI_HEIGHT}
          fill="rgba(59, 130, 246, 0.15)"
          stroke="rgba(59, 130, 246, 0.8)"
          strokeWidth={1.5}
          className="pointer-events-none transition-none"
        />
      </svg>
    </div>
  );
};
