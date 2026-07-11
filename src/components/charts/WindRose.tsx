import React, { useMemo } from "react";
import { arc } from "d3";
import { useDivergingColorScale } from "../../hooks/useColor";
import { normalizeScore } from "../../utils/scores";
import type { Explanations } from "../../types";
import { formatDimensionKey } from "../../utils/dimensions";
interface WindRoseProps {
  explanations?: Explanations | null;
  baseColor: string;
  agentName: string;
  size?: number;
  hoveredKey?: string | null;
  onHoverDimension?: (key: string | null) => void;
}

export const WindRose: React.FC<WindRoseProps> = ({
  explanations,
  baseColor,
  agentName,
  size = 56,
  hoveredKey,
  onHoverDimension,
}) => {
  const entries = Object.entries(explanations || {});

  const center = size / 2;
  const innerRadius = Math.max(10, size * 0.22);
  const baseOffset = Math.max(3, size * 0.06);
  const maxRadius = center;
  const availableRadius = maxRadius - (innerRadius + baseOffset);

  const numSlices = entries.length || 1;
  const sliceAngle = (2 * Math.PI) / numSlices;

  const arcGenerator = useMemo(
    () =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      arc<any, { startAngle: number; endAngle: number }>()
        .innerRadius(innerRadius)
        .padAngle(0.04)
        .padRadius(innerRadius),
    [innerRadius]
  );

  const divergingColorScale = useDivergingColorScale();

  const getRadiusForMagnitude = (magnitude: number) =>
    innerRadius + baseOffset + magnitude * availableRadius;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="overflow-visible select-none"
    >
      <g transform={`translate(${center}, ${center})`}>
        <circle
          r={getRadiusForMagnitude(1.0)}
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="1"
          opacity={0.7}
        />

        {entries.map(([key, [explanation, score]], i) => {
          const normalized = normalizeScore(score);
          const magnitude = Math.abs(normalized);
          const displayKey = formatDimensionKey(key);

          const startAngle = i * sliceAngle;
          const endAngle = (i + 1) * sliceAngle;
          const outerRadius = getRadiusForMagnitude(magnitude);
          const isHovered = hoveredKey === key;

          const petalColor = divergingColorScale(normalized);

          const arcPath = arcGenerator.outerRadius(outerRadius)({
            startAngle,
            endAngle,
          });

          return (
            <path
              key={key}
              d={arcPath || undefined}
              fill={petalColor}
              fillOpacity={isHovered ? 1 : 0.35 + 0.65 * magnitude}
              stroke="#5F6573"
              strokeWidth={isHovered ? "2" : "1"}
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => onHoverDimension?.(key)}
              onMouseLeave={() => onHoverDimension?.(null)}
            >
              <title>{`${displayKey}: Score ${score} (Norm: ${normalized.toFixed(
                2
              )})\n${explanation}`}</title>
            </path>
          );
        })}

        <circle
          r={innerRadius - 1}
          fill={baseColor}
          className="shadow-inner stroke-white stroke-2"
        />
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fill="#ffffff"
          fontSize={Math.max(9, size * 0.2)}
          fontWeight="bold"
          className="pointer-events-none tracking-tighter font-sans"
        >
          {agentName.substring(0, 2).toUpperCase()}
        </text>
      </g>
    </svg>
  );
};
