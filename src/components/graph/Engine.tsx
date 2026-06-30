import React, { useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import type { NodeData, EdgeData, TrendPoint } from "../../types";
import { getMs } from "../../utils/time";
interface CanvasEngineProps {
  width: number;
  height: number;
  nodes: NodeData[];
  edges: EdgeData[];
  trends: Record<string, TrendPoint[]>;
  nodeMap: Map<string, NodeData>;
  threadMap: Map<string, string>;
  selectedThreadId: string | null;
  sidebarHoveredId: string | null;
  onHoverNode: (node: NodeData | null, x: number, y: number) => void;
  onClickNode: (node: NodeData | null) => void;
}

const bisectTime = d3.bisector<NodeData, number>((d) =>
  getMs(d.timestamp)
).left;

const CONFIG = {
  MARGIN: { top: 20, right: 30, bottom: 40, left: 50 },
  MAX_AXIS_WIDTH: 500,
  Y_DOMAIN: [-1.1, 1.1] as [number, number],
  X_PAD_RATIO: 0.05,
  OVERSCAN_NODES: 15, // extra buffer nodes
  HOVER_RADIUS: 20, // max distance for interaction
  MAX_EDGE_BULGE: 50,
  BULGE_RATIO: 0.2,
  OPACITY: { MIN: 0.2, MAX: 0.8 },
  ZOOM: {
    LOW: 2.0,
    TETHER: 4.0,
    MID: 15.0,
    HIGH: 50.0,
  },
  RADIUS: { MIN: 3, MAX: 6.5 },
  LINE_WIDTH: {
    TREND: 4,
    EDGE_ACTIVE: 3,
    EDGE_BASE: 1.5,
    EDGE_MUTED: 1,
    NODE_HOVER: 4.0,
    NODE_ACTIVE: 3.0,
    NODE_BASE: 2,
    NODE_TINY: 1,
    TETHER: 1.5,
  },
};

const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

export const CanvasEngine: React.FC<CanvasEngineProps> = ({
  width,
  height,
  nodes,
  edges,
  trends,
  nodeMap,
  threadMap,
  selectedThreadId,
  sidebarHoveredId,
  onHoverNode,
  onClickNode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const xAxisRef = useRef<SVGGElement>(null);
  const yAxisRef = useRef<SVGGElement>(null);
  const hoveredNodeIdRef = useRef<string | null>(null);

  const innerWidth = Math.max(
    0,
    width - CONFIG.MARGIN.left - CONFIG.MARGIN.right
  );
  const innerHeight = Math.max(
    0,
    height - CONFIG.MARGIN.top - CONFIG.MARGIN.bottom
  );

  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const xScaleRef = useRef<d3.ScaleLinear<number, number>>(d3.scaleLinear());
  const yScaleRef = useRef<d3.ScaleLinear<number, number>>(d3.scaleLinear());

  const callbacksRef = useRef({ onHoverNode, onClickNode });
  useEffect(() => {
    callbacksRef.current = { onHoverNode, onClickNode };
  }, [onHoverNode, onClickNode]);

  useEffect(() => {
    if (nodes.length === 0 || innerWidth === 0) return;
    const extent = d3.extent(nodes, (d) => getMs(d.timestamp));
    const minT = extent[0] ?? 0;
    const maxT = extent[1] ?? Date.now();
    const pad = (maxT - minT) * CONFIG.X_PAD_RATIO;

    xScaleRef.current.domain([minT - pad, maxT + pad]).range([0, innerWidth]);
    yScaleRef.current.domain(CONFIG.Y_DOMAIN).range([innerHeight, 0]);
  }, [nodes, innerWidth, innerHeight]);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || nodes.length === 0) return;

    ctx.clearRect(0, 0, innerWidth, innerHeight);
    const k = transformRef.current.k;
    const currentX = transformRef.current.rescaleX(xScaleRef.current);
    const currentY = yScaleRef.current;

    if (xAxisRef.current && yAxisRef.current) {
      const xAxis = d3
        .axisBottom(currentX)
        .ticks(Math.max(innerWidth / CONFIG.MAX_AXIS_WIDTH, 4))
        .tickFormat((d) => {
          const date = new Date(d as number);
          if (k > CONFIG.ZOOM.HIGH) return d3.timeFormat("%H:%M:%S.%L")(date);
          if (k > CONFIG.ZOOM.MID) return d3.timeFormat("%H:%M:%S")(date);
          return d3.timeFormat("%b %d, %H:%M")(date);
        });
      d3.select(xAxisRef.current).call(xAxis);
      d3.select(yAxisRef.current).call(d3.axisLeft(currentY).ticks(7));
    }

    const hoveredId = hoveredNodeIdRef.current;
    const hoverThreadId = hoveredId ? threadMap.get(hoveredId) : null;
    const activeThreadId = selectedThreadId || hoverThreadId;
    const isSpotlighting =
      activeThreadId !== undefined && activeThreadId !== null;

    const [minVisibleTime, maxVisibleTime] = currentX.domain();
    const startIndex = bisectTime(nodes, minVisibleTime);
    const endIndex = bisectTime(nodes, maxVisibleTime);

    const visibleNodes = nodes.slice(
      Math.max(0, startIndex - CONFIG.OVERSCAN_NODES),
      endIndex + CONFIG.OVERSCAN_NODES
    );

    const baseNodeOpacity = Math.max(0.15, Math.min(1.0, 0.15 + (k - 1) * 0.1));
    const baseEdgeOpacity = Math.max(0.0, Math.min(0.5, (k - 1.2) * 0.15));

    if (k < CONFIG.ZOOM.MID) {
      Object.entries(trends).forEach(([agent, points]) => {
        ctx.beginPath();
        let isDrawing = false;
        points.forEach((p) => {
          if (p.rollingAvg === null) {
            isDrawing = false;
            return;
          }
          const x = currentX(getMs(p.timestamp));
          const y = currentY(p.rollingAvg);

          if (!isDrawing) {
            ctx.moveTo(x, y);
            isDrawing = true;
          } else {
            ctx.lineTo(x, y);
          }
        });

        ctx.strokeStyle = colorScale(agent);
        const trendOpacity = Math.max(0.05, 0.8 - k / CONFIG.ZOOM.MID);
        ctx.globalAlpha = isSpotlighting ? trendOpacity * 0.1 : trendOpacity;
        ctx.lineWidth = CONFIG.LINE_WIDTH.TREND;
        ctx.stroke();
      });
      ctx.globalAlpha = 1.0;
    }

    // EDGES
    if (baseEdgeOpacity > 0 || isSpotlighting) {
      edges.forEach((edge) => {
        const nodeA = nodeMap.get(edge.source);
        const nodeB = nodeMap.get(edge.target);
        if (!nodeA || !nodeB) return;

        const timeA = getMs(nodeA.timestamp);
        const timeB = getMs(nodeB.timestamp);
        const sourceNode = timeA <= timeB ? nodeA : nodeB;
        const targetNode = timeA > timeB ? nodeA : nodeB;

        const sx = currentX(getMs(sourceNode.timestamp));
        const sy = currentY(sourceNode.scoreExternal);
        const tx = currentX(getMs(targetNode.timestamp));
        const ty = currentY(targetNode.scoreExternal);

        if (
          !isSpotlighting &&
          ((sx < 0 && tx < 0) || (sx > innerWidth && tx > innerWidth))
        )
          return;

        const isEdgeActive =
          isSpotlighting &&
          (threadMap.get(sourceNode.id) === activeThreadId ||
            threadMap.get(targetNode.id) === activeThreadId);

        if (isSpotlighting && !isEdgeActive) {
          ctx.globalAlpha = CONFIG.OPACITY.MIN;
          ctx.lineWidth = CONFIG.LINE_WIDTH.EDGE_MUTED;
        } else if (isSpotlighting && isEdgeActive) {
          ctx.globalAlpha = CONFIG.OPACITY.MAX;
          ctx.lineWidth = CONFIG.LINE_WIDTH.EDGE_ACTIVE;
        } else {
          ctx.globalAlpha = baseEdgeOpacity;
          ctx.lineWidth = CONFIG.LINE_WIDTH.EDGE_BASE;
        }

        ctx.beginPath();
        ctx.moveTo(sx, sy);
        const cpX = (sx + tx) / 2;
        const bulge = Math.min(
          CONFIG.MAX_EDGE_BULGE,
          Math.abs(tx - sx) * CONFIG.BULGE_RATIO
        );
        ctx.quadraticCurveTo(cpX, Math.min(sy, ty) - bulge, tx, ty);
        ctx.strokeStyle = colorScale(sourceNode.agent);
        ctx.stroke();
      });
      ctx.globalAlpha = 1.0;
    }

    // NODES
    visibleNodes.forEach((node) => {
      const cx = currentX(getMs(node.timestamp));
      const cy = currentY(node.scoreExternal);
      const radius =
        k < CONFIG.ZOOM.LOW
          ? CONFIG.RADIUS.MIN
          : Math.min(CONFIG.RADIUS.MAX, k * 1.5);
      const isNodeActive =
        isSpotlighting && threadMap.get(node.id) === activeThreadId;
      const isSidebarHovered = sidebarHoveredId === node.id;

      let finalOpacity = baseNodeOpacity;
      if (isSpotlighting && !isNodeActive) finalOpacity = CONFIG.OPACITY.MIN;
      else if (isSpotlighting && isNodeActive)
        finalOpacity = CONFIG.OPACITY.MAX;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI);

      ctx.fillStyle = colorScale(node.agent);
      ctx.globalAlpha = isSidebarHovered
        ? CONFIG.OPACITY.MAX
        : finalOpacity * (isNodeActive ? 0.6 : CONFIG.OPACITY.MIN);
      ctx.fill();

      ctx.strokeStyle = colorScale(node.agent);
      ctx.globalAlpha = finalOpacity;

      ctx.lineWidth = isSidebarHovered
        ? CONFIG.LINE_WIDTH.NODE_HOVER
        : isSpotlighting && isNodeActive
        ? CONFIG.LINE_WIDTH.NODE_ACTIVE
        : k < CONFIG.ZOOM.LOW
        ? CONFIG.LINE_WIDTH.NODE_TINY
        : CONFIG.LINE_WIDTH.NODE_BASE;
      ctx.stroke();

      if (k >= CONFIG.ZOOM.TETHER && node.scoreInternal !== null) {
        let tetherOpacity = Math.min(0.5, (k - 3) * 0.2);
        if (isSpotlighting && !isNodeActive) tetherOpacity *= 0.1;
        else if (isSpotlighting && isNodeActive) tetherOpacity = 0.8;

        ctx.beginPath();
        ctx.setLineDash([2, 3]);
        ctx.moveTo(
          cx,
          cy + (node.scoreInternal > node.scoreExternal ? -radius : radius)
        );
        ctx.lineTo(cx, currentY(node.scoreInternal));
        ctx.strokeStyle = `rgba(180, 50, 50, ${tetherOpacity})`;
        ctx.lineWidth = CONFIG.LINE_WIDTH.TETHER;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });
    ctx.globalAlpha = 1.0;
  }, [
    nodes,
    edges,
    trends,
    innerWidth,
    innerHeight,
    nodeMap,
    threadMap,
    selectedThreadId,
    sidebarHoveredId,
  ]);

  const drawFrameRef = useRef(drawFrame);
  useEffect(() => {
    drawFrameRef.current = drawFrame;
  }, [drawFrame]);

  useEffect(() => {
    drawFrameRef.current();
  }, [selectedThreadId, nodes, edges, sidebarHoveredId]);

  const getNodeAtEvent = useCallback(
    (mouseX: number, mouseY: number): NodeData | null => {
      const currentX = transformRef.current.rescaleX(xScaleRef.current);
      const hoveredTime = currentX.invert(mouseX);
      const searchRadiusTime =
        currentX.invert(CONFIG.HOVER_RADIUS) - currentX.invert(0);
      const startIndex = bisectTime(nodes, hoveredTime - searchRadiusTime);
      const endIndex = bisectTime(nodes, hoveredTime + searchRadiusTime);

      let closestNode: NodeData | null = null;
      let minDistance = CONFIG.HOVER_RADIUS;

      for (let i = startIndex; i <= endIndex; i++) {
        if (!nodes[i]) continue;
        const distance = Math.hypot(
          currentX(getMs(nodes[i].timestamp)) - mouseX,
          yScaleRef.current(nodes[i].scoreExternal) - mouseY
        );
        if (distance < minDistance) {
          minDistance = distance;
          closestNode = nodes[i];
        }
      }
      return closestNode;
    },
    [nodes]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || innerWidth === 0) return;

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;

    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx?.scale(dpr, dpr);
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;

    const zoom = d3
      .zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([1, CONFIG.MAX_AXIS_WIDTH])
      .on("zoom", (event) => {
        transformRef.current = event.transform;
        drawFrameRef.current();
        window.dispatchEvent(
          new CustomEvent("graph-transform", { detail: event.transform })
        );
      });

    d3.select(canvas)
      .call(zoom)
      .on("click", (event: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        const clickedNode = getNodeAtEvent(
          event.clientX - rect.left,
          event.clientY - rect.top
        );
        callbacksRef.current.onClickNode(clickedNode);
      });

    drawFrameRef.current();
  }, [innerWidth, innerHeight, nodes, getNodeAtEvent]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const closestNode = getNodeAtEvent(mouseX, mouseY);

      if (closestNode) {
        if (hoveredNodeIdRef.current !== closestNode.id) {
          hoveredNodeIdRef.current = closestNode.id;
          drawFrameRef.current();
        }
        const currentX = transformRef.current.rescaleX(xScaleRef.current);
        callbacksRef.current.onHoverNode(
          closestNode,
          currentX(getMs(closestNode.timestamp)) + CONFIG.MARGIN.left,
          yScaleRef.current(closestNode.scoreExternal) + CONFIG.MARGIN.top
        );
        canvas.style.cursor = "pointer";
      } else {
        if (hoveredNodeIdRef.current !== null) {
          hoveredNodeIdRef.current = null;
          drawFrameRef.current();
        }
        callbacksRef.current.onHoverNode(null, 0, 0);
        canvas.style.cursor = "crosshair";
      }
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    return () => canvas.removeEventListener("mousemove", handleMouseMove);
  }, [nodes, innerWidth, getNodeAtEvent]);

  return (
    <div className="relative w-full h-full text-xs font-sans select-none">
      <svg
        className="absolute inset-0 pointer-events-none"
        width={width}
        height={height}
      >
        <g
          ref={xAxisRef}
          className="text-gray-500"
          transform={`translate(${CONFIG.MARGIN.left}, ${
            CONFIG.MARGIN.top + innerHeight
          })`}
        />
        <g
          ref={yAxisRef}
          className="text-gray-500"
          transform={`translate(${CONFIG.MARGIN.left}, ${CONFIG.MARGIN.top})`}
        />
        <text
          x={CONFIG.MARGIN.left + innerWidth / 2}
          y={height - 5}
          fill="currentColor"
          textAnchor="middle"
          className="text-gray-400 font-medium"
        >
          Timeline
        </text>
        <text
          x={-(CONFIG.MARGIN.top + innerHeight / 2)}
          y={15}
          fill="currentColor"
          textAnchor="middle"
          transform="rotate(-90)"
          className="text-gray-400 font-medium"
        >
          Alignment Score
        </text>
      </svg>
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: CONFIG.MARGIN.top,
          left: CONFIG.MARGIN.left,
        }}
        className="outline-none"
      />
    </div>
  );
};
