import React, {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import * as d3 from "d3";
import { colorScale } from "../../hooks/useColor";

interface ChordSelection {
  type: "node" | "edge";
  index?: number;
  source?: number;
  target?: number;
}

export interface ChordDiagramHandle {
  clearPin: () => void;
}

interface ChordDiagramProps {
  matrix: number[][];
  labels: string[];
  size?: number;
  unit?: string;
  showLegend?: boolean;
  legendPosition?: "bottom" | "side";
  emptyMessage?: string;
}

// Radii are proportions of `size` (not fixed pixel offsets) so the arc band
// thickness — and everything derived from it — looks the same regardless of
// how large the diagram is rendered.
const OUTER_RADIUS_RATIO = 0.39;
const INNER_RADIUS_RATIO = 0.35;

// A fixed angular gap between each ribbon and the arc it meets, independent
// of radius. Deriving this from `1 / innerRadius` (the textbook default)
// makes the gap eat up a much bigger share of each ribbon's angular width as
// the diagram shrinks, which reads as the ribbons "pinching" a lot more at
// small sizes than at large ones.
const RIBBON_PAD_ANGLE = 0.008;

const sameSelection = (
  a: ChordSelection | null,
  b: ChordSelection | null
): boolean => {
  if (!a || !b) return false;
  if (a.type !== b.type) return false;
  if (a.type === "node") return a.index === b.index;
  return a.source === b.source && a.target === b.target;
};

const pluralize = (n: number, unit: string) =>
  `${n} ${unit}${n === 1 ? "" : "s"}`;

export const ChordDiagram = React.forwardRef<
  ChordDiagramHandle,
  ChordDiagramProps
>(
  (
    {
      matrix,
      labels,
      size = 320,
      unit = "message",
      showLegend = true,
      legendPosition = "bottom",
      emptyMessage = "No interactions in this window.",
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const clearPinRef = useRef<() => void>(() => {});

    const totalWeight = useMemo(
      () =>
        matrix.reduce((sum, row) => sum + row.reduce((a, b) => a + b, 0), 0),
      [matrix]
    );

    useImperativeHandle(
      ref,
      () => ({
        clearPin: () => clearPinRef.current(),
      }),
      []
    );

    useEffect(() => {
      const container = containerRef.current;
      const tooltipEl = tooltipRef.current;
      if (!container) return;

      d3.select(container).selectAll("*").remove();
      if (!tooltipEl || totalWeight === 0) {
        clearPinRef.current = () => {};
        return;
      }

      const outerRadius = size * OUTER_RADIUS_RATIO;
      const innerRadius = size * INNER_RADIUS_RATIO;

      const chordLayout = d3
        .chordDirected()
        .padAngle(0.06)
        .sortSubgroups(d3.descending)
        .sortChords(d3.descending);

      const chords = chordLayout(matrix);

      const arcGen = d3
        .arc<d3.ChordGroup>()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);

      const ribbonGen = d3
        .ribbonArrow<d3.Chord, d3.ChordSubgroup>()
        .radius(innerRadius - 1)
        .padAngle(RIBBON_PAD_ANGLE);

      const root = d3.select(container);
      const svg = root
        .append("svg")
        .attr("width", size)
        .attr("height", size)
        .attr("viewBox", `${-size / 2} ${-size / 2} ${size} ${size}`)
        .attr("font-family", "inherit");

      const ribbonLayer = svg.append("g").attr("fill-opacity", 0.75);
      const groupLayer = svg.append("g");
      const tooltip = d3.select(tooltipEl);

      const showTooltip = (html: string, event: MouseEvent) => {
        const rect = container.getBoundingClientRect();
        tooltip
          .html(html)
          .style("opacity", "1")
          .style(
            "transform",
            `translate(${event.clientX - rect.left + 14}px, ${
              event.clientY - rect.top + 10
            }px)`
          );
      };
      const hideTooltip = () => tooltip.style("opacity", "0");

      let pinned: ChordSelection | null = null;

      const applyHighlight = (sel: ChordSelection | null) => {
        if (!sel) {
          ribbons.style("opacity", 1);
          groupArcs.style("opacity", 1);
          return;
        }
        if (sel.type === "node") {
          ribbons.style("opacity", (d) =>
            d.source.index === sel.index || d.target.index === sel.index
              ? 1
              : 0.08
          );
          groupArcs.style("opacity", (d) => (d.index === sel.index ? 1 : 0.35));
        } else {
          ribbons.style("opacity", (d) =>
            d.source.index === sel.source && d.target.index === sel.target
              ? 1
              : 0.08
          );
          groupArcs.style("opacity", (d) =>
            d.index === sel.source || d.index === sel.target ? 1 : 0.35
          );
        }
      };

      const togglePin = (sel: ChordSelection) => {
        pinned = sameSelection(pinned, sel) ? null : sel;
        applyHighlight(pinned);
      };

      const clearPin = () => {
        pinned = null;
        applyHighlight(null);
      };
      clearPinRef.current = clearPin;

      const outTotal = (i: number) => matrix[i].reduce((a, b) => a + b, 0);
      const inTotal = (j: number) =>
        matrix.reduce((sum, row) => sum + row[j], 0);

      const ribbonTooltip = (sourceIdx: number, targetIdx: number) =>
        `<b>${labels[sourceIdx]}</b> &rarr; <b>${
          labels[targetIdx]
        }</b><br/>${pluralize(matrix[sourceIdx][targetIdx], unit)}`;

      const ribbons = ribbonLayer
        .selectAll<SVGPathElement, d3.Chord>("path.ribbon")
        .data(chords)
        .join("path")
        .attr("class", "ribbon")
        .style("cursor", "pointer")
        .attr("d", ribbonGen)
        .attr("fill", (d) => colorScale(labels[d.source.index]))
        .attr("stroke", (d) =>
          d3.rgb(colorScale(labels[d.source.index])).darker(0.6).toString()
        )
        .attr("stroke-width", 0.4)
        .on("mouseenter", (event, d) => {
          applyHighlight({
            type: "edge",
            source: d.source.index,
            target: d.target.index,
          });
          showTooltip(ribbonTooltip(d.source.index, d.target.index), event);
        })
        .on("mousemove", (event, d) => {
          showTooltip(ribbonTooltip(d.source.index, d.target.index), event);
        })
        .on("mouseleave", () => {
          hideTooltip();
          applyHighlight(pinned);
        })
        .on("click", (event, d) => {
          event.stopPropagation();
          togglePin({
            type: "edge",
            source: d.source.index,
            target: d.target.index,
          });
        });

      const groups = groupLayer
        .selectAll<SVGGElement, d3.ChordGroup>("g.chord-group")
        .data(chords.groups)
        .join((enter) => {
          const g = enter.append("g").attr("class", "chord-group");
          g.append("path").attr("class", "group-arc");
          g.append("text").attr("class", "group-label");
          return g;
        });

      const groupArcs = groups
        .select<SVGPathElement>("path.group-arc")
        .style("cursor", "pointer")
        .attr("d", arcGen)
        .attr("fill", (d) => colorScale(labels[d.index]))
        .attr("stroke", (d) =>
          d3.rgb(colorScale(labels[d.index])).darker(0.8).toString()
        );

      groups
        .select<SVGTextElement>("text.group-label")
        .attr("dy", "0.32em")
        .attr("font-size", 10.5)
        .attr("fill", "currentColor")
        .attr("transform", (d) => {
          const angle = (d.startAngle + d.endAngle) / 2;
          return `rotate(${(angle * 180) / Math.PI - 90}) translate(${
            outerRadius + 6
          }) ${angle > Math.PI ? "rotate(180)" : ""}`;
        })
        .attr("text-anchor", (d) =>
          (d.startAngle + d.endAngle) / 2 > Math.PI ? "end" : "start"
        )
        .text((d) => labels[d.index]);

      groups
        .on("mouseenter", (event, d) => {
          applyHighlight({ type: "node", index: d.index });
          showTooltip(
            `<b>${labels[d.index]}</b><br/>Sent: ${outTotal(
              d.index
            )}<br/>Received: ${inTotal(d.index)}`,
            event
          );
        })
        .on("mousemove", (event, d) => {
          showTooltip(
            `<b>${labels[d.index]}</b><br/>Sent: ${outTotal(
              d.index
            )}<br/>Received: ${inTotal(d.index)}`,
            event
          );
        })
        .on("mouseleave", () => {
          hideTooltip();
          applyHighlight(pinned);
        })
        .on("click", (event, d) => {
          event.stopPropagation();
          togglePin({ type: "node", index: d.index });
        });

      svg.on("click", clearPin);

      return () => {
        clearPinRef.current = () => {};
        d3.select(container).selectAll("*").remove();
      };
    }, [matrix, labels, size, unit, totalWeight]);

    return (
      <div
        className={`select-none ${
          legendPosition === "side" ? "flex items-center gap-5" : ""
        }`}
      >
        <div
          className="relative flex-shrink-0"
          style={{ width: size, height: totalWeight === 0 ? undefined : size }}
        >
          <div
            ref={containerRef}
            className="flex items-center justify-center text-slate-700"
            style={{ width: size, height: totalWeight === 0 ? 0 : size }}
          />
          <div
            ref={tooltipRef}
            className="absolute top-0 left-0 pointer-events-none bg-white border border-slate-200 shadow-lg rounded-md px-2.5 py-1.5 text-[11px] leading-snug opacity-0 transition-opacity z-50 max-w-[220px]"
          />
          {totalWeight === 0 && (
            <p className="text-center text-xs text-slate-400 py-8">
              {emptyMessage}
            </p>
          )}
        </div>

        {showLegend && totalWeight > 0 && (
          <div
            className={
              legendPosition === "side"
                ? "flex flex-col gap-1.5"
                : "flex flex-wrap gap-x-3 gap-y-1 justify-center mt-2 w-full"
            }
          >
            {labels.map((label) => (
              <div
                key={label}
                className="flex items-center gap-1.5 text-[11px] text-slate-600 whitespace-nowrap"
              >
                <span
                  className="w-2.5 h-2.5 rounded-sm inline-block flex-shrink-0"
                  style={{ backgroundColor: colorScale(label) }}
                />
                {label}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);

ChordDiagram.displayName = "ChordDiagram";
