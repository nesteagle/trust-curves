import React, { useMemo, useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { colorScale } from "../../hooks/useColor";
import { useGraphData } from "../../store/GraphContext";
import { generateChordMatrix } from "../../utils/chordMatrix";
import { useEntitiesInView } from "../../hooks/useInView";

const OUTER_RADIUS_RATIO = 0.36;
const INNER_RADIUS_RATIO = 0.34;
const RIBBON_PAD_ANGLE = 0.02;
const LABEL_SPACE_PX = 30;

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

function cleanLabel(label: string): string {
  return label.replaceAll("-Agent", "");
}
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

    const viewBoxSize = size + LABEL_SPACE_PX * 2;

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
      .attr(
        "viewBox",
        `${-viewBoxSize / 2} ${-viewBoxSize / 2} ${viewBoxSize} ${viewBoxSize}`
      )
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
      const from = cleanLabel(labels[d.source.index]);
      const to = cleanLabel(labels[d.target.index]);
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

    const groupLabels = groups
      .select<SVGTextElement>("text.group-label")
      .attr("dy", "0.32em")
      .attr("font-size", 12)
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
      .text((d) => cleanLabel(labels[d.index]));

    groupLabels.append("title").text((d) => cleanLabel(labels[d.index]));

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

interface ChordDiagramPanelProps {
  size: number;
  canvasWidth: number;
}
export const ChordDiagramPanel: React.FC<ChordDiagramPanelProps> = ({
  size,
  canvasWidth,
}) => {
  const [open, setOpen] = useState(true);
  const { data } = useGraphData();
  const { nodesInView } = useEntitiesInView(canvasWidth);

  const { matrix, entities } = useMemo(() => {
    const edges = data?.edges ?? [];
    return generateChordMatrix(edges, nodesInView);
  }, [data?.edges, nodesInView]);

  // drag state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragState = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);

  const DRAG_THRESHOLD = 12;

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: position.x,
      originY: position.y,
      moved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;

    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      dragState.current.moved = true;
    }

    if (dragState.current.moved) {
      setPosition({
        x: dragState.current.originX + dx,
        y: dragState.current.originY + dy,
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    const wasDrag = dragState.current?.moved ?? false;
    dragState.current = null;
    if (!wasDrag) {
      setOpen((o) => !o);
    }
  };

  return (
    <div
      className="z-10 flex w-fit min-w-[8vw] flex-col-reverse rounded-lg border border-slate-200 bg-white/95 shadow-sm backdrop-blur-sm pointer-events-auto"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
    >
      <button
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold text-slate-700 cursor-grab active:cursor-grabbing touch-none"
      >
        <span>Agent interactions</span>
        <i
          className={`ti cursor-pointer ${
            open ? "ti-minus" : "ti-plus"
          } text-slate-400 text-xs`}
        />
      </button>

      {open && (
        <div className="bg-slate-50/50 rounded-lg border border-slate-100 p-1 w-full flex justify-center">
          <ChordDiagram matrix={matrix} labels={entities} size={size} />
        </div>
      )}
    </div>
  );
};
