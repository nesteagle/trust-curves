import React, { useMemo, useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { colorScale } from "../../hooks/useColor";
import { useGraphData } from "../../store/GraphContext";
import { generateChordMatrix } from "../../utils/chordMatrix";
import { bisectTime, CONFIG } from "../../utils/canvasConfig";
import { useTimeCompression } from "../../hooks/useTimeCompression";
import type { NodeData } from "../../types";

const OUTER_RADIUS_RATIO = 0.32;
const INNER_RADIUS_RATIO = 0.3;
const RIBBON_PAD_ANGLE = 0.02;

interface ChordSelection {
  type: "node" | "edge";
  index?: number;
  source?: number;
  target?: number;
}

interface ChordDiagramProps {
  matrix: number[][];
  labels: string[];
  size: number;
}

const sameSelection = (
  a: ChordSelection | null,
  b: ChordSelection | null
): boolean => {
  if (!a || !b) return false;
  if (a.type !== b.type) return false;
  if (a.type === "node") return a.index === b.index;
  return a.source === b.source && a.target === b.target;
};

export const ChordDiagram: React.FC<ChordDiagramProps> = ({
  matrix,
  labels,
  size,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const totalWeight = useMemo(
    () => matrix.reduce((sum, row) => sum + row.reduce((a, b) => a + b, 0), 0),
    [matrix]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    d3.select(container).selectAll("*").remove();
    if (totalWeight === 0) return;

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

    const svg = d3
      .select(container)
      .append("svg")
      .attr("width", size)
      .attr("height", size)
      .attr("viewBox", `${-size / 2} ${-size / 2} ${size} ${size}`)
      .attr("font-family", "inherit");

    const ribbonLayer = svg.append("g").attr("fill-opacity", 0.7);
    const groupLayer = svg.append("g");

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
            : 0.06
        );
        groupArcs.style("opacity", (d) => (d.index === sel.index ? 1 : 0.3));
      } else {
        ribbons.style("opacity", (d) =>
          d.source.index === sel.source && d.target.index === sel.target
            ? 1
            : 0.06
        );
        groupArcs.style("opacity", (d) =>
          d.index === sel.source || d.index === sel.target ? 1 : 0.3
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

    const ribbons = ribbonLayer
      .selectAll<SVGPathElement, d3.Chord>("path.ribbon")
      .data(chords)
      .join("path")
      .attr("class", "ribbon")
      .style("cursor", "help")
      .style("mix-blend-mode", "multiply")
      .attr("d", ribbonGen)
      .attr("fill", (d) => colorScale(labels[d.source.index]))
      .attr("stroke", (d) =>
        d3.rgb(colorScale(labels[d.source.index])).darker(0.4).toString()
      )
      .attr("stroke-width", 0.5)
      .on("mouseenter", (_, d) =>
        applyHighlight({
          type: "edge",
          source: d.source.index,
          target: d.target.index,
        })
      )
      .on("mouseleave", () => applyHighlight(pinned))
      .on("click", (event, d) => {
        event.stopPropagation();
        togglePin({
          type: "edge",
          source: d.source.index,
          target: d.target.index,
        });
      });

    // add tooltip
    ribbons.append("title").text((d) => {
      const count = matrix[d.source.index][d.target.index];
      const from = labels[d.source.index].replaceAll("-Agent", "");
      const to = labels[d.target.index].replaceAll("-Agent", "");
      return `${from} -> ${to}: ${count} message${count === 1 ? "" : "s"}`;
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
      .attr("d", arcGen)
      .attr("fill", (d) => colorScale(labels[d.index]))
      .attr("stroke", (d) =>
        d3.rgb(colorScale(labels[d.index])).darker(0.6).toString()
      );

    groups
      .select<SVGTextElement>("text.group-label")
      .attr("dy", "0.32em")
      .attr("font-size", 10)
      .attr("font-weight", "500")
      .attr("fill", "#4A5568")
      .attr("transform", (d) => {
        const angle = (d.startAngle + d.endAngle) / 2;
        return `rotate(${(angle * 180) / Math.PI - 90}) translate(${
          outerRadius + 8
        }) ${angle > Math.PI ? "rotate(180)" : ""}`;
      })
      .attr("text-anchor", (d) =>
        (d.startAngle + d.endAngle) / 2 > Math.PI ? "end" : "start"
      )
      .text((d) => labels[d.index].replaceAll("-Agent", ""));

    groups
      .on("mouseenter", (_, d) =>
        applyHighlight({ type: "node", index: d.index })
      )
      .on("mouseleave", () => applyHighlight(pinned))
      .on("click", (event, d) => {
        event.stopPropagation();
        togglePin({ type: "node", index: d.index });
      });

    svg.on("click", clearPin);

    return () => {
      d3.select(container).selectAll("*").remove();
    };
  }, [matrix, labels, size, totalWeight]);

  return (
    <div className="select-none">
      <div
        className="relative flex-shrink-0"
        style={{ width: size, height: totalWeight === 0 ? undefined : size }}
      >
        <div
          ref={containerRef}
          className="flex items-center justify-center text-slate-700"
          style={{ width: size, height: totalWeight === 0 ? 0 : size }}
        />

        {totalWeight === 0 && (
          <p className="text-center text-xs text-slate-400 py-12 px-6 font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No messages were sent in this window.
          </p>
        )}
      </div>
    </div>
  );
};

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

interface ChordDiagramPanelProps {
  size: number;
  canvasWidth: number;
}

export const ChordDiagramPanel: React.FC<ChordDiagramPanelProps> = ({
  size,
  canvasWidth,
}) => {
  const [open, setOpen] = useState(false);
  const { data, network } = useGraphData();
  const [transform, setTransform] = useState(d3.zoomIdentity);

  useEffect(() => {
    const handleTransform = (e: Event) => {
      const { detail } = e as CustomEvent<d3.ZoomTransform>;
      setTransform(detail);
    };
    window.addEventListener("graph-transform", handleTransform);
    return () => window.removeEventListener("graph-transform", handleTransform);
  }, []);

  const nodes = network.nodes;
  const timeCompression = useTimeCompression(nodes);

  const innerWidth = Math.max(
    0,
    canvasWidth - CONFIG.MARGIN.left - CONFIG.MARGIN.right
  );

  const nodesInView = useMemo(() => {
    return getNodesInView(
      nodes,
      network?.timeBounds,
      transform,
      innerWidth,
      timeCompression.toSim,
      timeCompression.toReal
    );
  }, [nodes, network?.timeBounds, transform, innerWidth, timeCompression]);

  const { matrix, entities } = useMemo(() => {
    const edges = data?.edges ?? [];
    return generateChordMatrix(edges, nodesInView);
  }, [data?.edges, nodesInView]);

  return (
    <div className="absolute right-6 top-4 z-30 flex w-fit min-w-[240px] max-w-[400px] flex-col rounded-lg border border-slate-200 bg-white/95 shadow-lg backdrop-blur-sm pointer-events-auto">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700"
      >
        <span>Message flow</span>
        <i
          className={`ti cursor-pointer ${
            open ? "ti-minus" : "ti-plus"
          } text-slate-400 text-xs`}
        />
      </button>

      {open && (
        <div className="border-t border-slate-100 px-3 py-3 flex flex-col items-center">
          <p className="mb-3 text-[12px] leading-relaxed text-slate-400 w-full font-small">
            View outbound message volume and patterns across rendered messages.
          </p>
          <div className="bg-slate-50/50 rounded-lg border border-slate-100 p-1 w-full flex justify-center">
            <ChordDiagram matrix={matrix} labels={entities} size={size} />
          </div>
        </div>
      )}
    </div>
  );
};
