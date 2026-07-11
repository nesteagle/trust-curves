import React, { useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import type { NodeData, EdgeData, TrendPoint } from "../../types";
import { getMs } from "../../utils/time";
import type { DAGNode } from "../../hooks/useGraphNetwork";
import {
  CONFIG,
  DEFAULT_SCORE_DOMAIN,
  bisectTime,
} from "../../utils/canvasConfig";
import { useTimeCompression } from "../../hooks/useTimeCompression";
import { setGraphTransform } from "../../utils/graphTransformStore";
import { useCanvasScales } from "../../hooks/useCanvasScales";
import { useNodeHitTest } from "../../hooks/useNodeHitTest";
import {
  drawTimeGaps,
  drawTrendLines,
  drawEdges,
  drawNodes,
} from "../../utils/canvasDraw";

interface CanvasEngineProps {
  width: number;
  height: number;
  nodes: NodeData[];
  edges: EdgeData[];
  trends: Record<string, TrendPoint[]>;
  timeBounds: [number, number];
  nodeMap: Map<string, DAGNode>;
  selectedNodeId: string | null;
  sidebarHoveredId: string | null;
  onHoverNode: (node: NodeData | null, x: number, y: number) => void;
  onClickNode: (node: NodeData | null) => void;
  scoresExternal: Map<string, number | null>;
  scoresInternal: Map<string, number | null>;
  scoreDomain?: [number, number];
}

export const CanvasEngine: React.FC<CanvasEngineProps> = ({
  width,
  height,
  nodes,
  edges,
  trends,
  timeBounds,
  nodeMap,
  selectedNodeId,
  sidebarHoveredId,
  onHoverNode,
  onClickNode,
  scoresExternal,
  scoresInternal,
  scoreDomain = DEFAULT_SCORE_DOMAIN,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const xAxisRef = useRef<SVGGElement>(null);
  const yAxisRef = useRef<SVGGElement>(null);

  const hoveredNodeIdRef = useRef<string | null>(null);
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);

  const innerWidth = Math.max(
    0,
    width - CONFIG.MARGIN.left - CONFIG.MARGIN.right
  );
  const innerHeight = Math.max(
    0,
    height - CONFIG.MARGIN.top - CONFIG.MARGIN.bottom
  );

  const getExternalScoreOrZero = useCallback(
    (nodeId: string) => scoresExternal.get(nodeId) ?? 0,
    [scoresExternal]
  );

  const timeCompression = useTimeCompression(nodes);
  const { baseScales } = useCanvasScales(
    timeBounds,
    innerWidth,
    innerHeight,
    timeCompression,
    scoreDomain
  );

  const getNodeAtEvent = useNodeHitTest(
    nodes,
    baseScales,
    timeCompression,
    getExternalScoreOrZero,
    transformRef
  );

  const latestCallbacks = useRef({ onHoverNode, onClickNode, getNodeAtEvent });
  useEffect(() => {
    latestCallbacks.current = { onHoverNode, onClickNode, getNodeAtEvent };
  }, [onHoverNode, onClickNode, getNodeAtEvent]);

  const renderAxes = useCallback(
    (transform: d3.ZoomTransform) => {
      if (!xAxisRef.current || !yAxisRef.current) return;

      const currentX = transform.rescaleX(baseScales.x);
      const k = transform.k;

      const xAxis = d3
        .axisBottom(currentX)
        .ticks(Math.max(innerWidth / CONFIG.TICK_SPACING, 4))
        .tickFormat((d) => {
          const date = new Date(timeCompression.toReal(d as number));
          if (k > CONFIG.ZOOM.HIGH_DETAIL)
            return d3.timeFormat("%H:%M:%S.%L")(date);
          if (k > CONFIG.ZOOM.MID_DETAIL)
            return d3.timeFormat("%H:%M:%S")(date);
          return d3.timeFormat("%b %d, %H:%M")(date);
        });

      d3.select(xAxisRef.current).call(xAxis);
      d3.select(yAxisRef.current).call(d3.axisLeft(baseScales.y).ticks(7));
    },
    [baseScales, innerWidth, timeCompression]
  );

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || nodes.length === 0) return;

    ctx.clearRect(0, 0, innerWidth, innerHeight);

    const transform = transformRef.current;
    const currentX = transform.rescaleX(baseScales.x);
    const currentY = baseScales.y;

    const getX = (timestamp: string | number) =>
      currentX(timeCompression.toSim(getMs(timestamp)));
    const getY = (score: number) => currentY(score);

    const [minSimTime, maxSimTime] = currentX.domain();
    const startIndex = bisectTime(nodes, timeCompression.toReal(minSimTime));
    const endIndex = bisectTime(nodes, timeCompression.toReal(maxSimTime));
    const visibleNodes = nodes.slice(
      Math.max(0, startIndex - CONFIG.OVERSCAN_NODES),
      endIndex + CONFIG.OVERSCAN_NODES
    );

    let highlightNodeId = selectedNodeId;
    if (!highlightNodeId && hoveredNodeIdRef.current) {
      highlightNodeId = hoveredNodeIdRef.current;
    }

    const isSpotlighting = highlightNodeId !== null;
    let highlightThreadId: number | null = null;

    if (highlightNodeId) {
      const hNode = nodeMap.get(highlightNodeId);
      if (hNode && hNode.threadId != null) {
        highlightThreadId = hNode.threadId;
      }
    }

    const spotlight = { isSpotlighting, highlightNodeId, highlightThreadId };
    const k = transform.k;

    const baseNodeOpacity = Math.max(
      CONFIG.OPACITY.NODE_BASE_MIN,
      Math.min(
        CONFIG.OPACITY.NODE_BASE_MAX,
        CONFIG.OPACITY.NODE_BASE_MIN +
          (k - CONFIG.ZOOM.NODE_FADE_START) * CONFIG.OPACITY.NODE_BASE_FADE_RATE
      )
    );
    const baseEdgeOpacity = Math.max(
      CONFIG.OPACITY.EDGE_BASE_MIN,
      Math.min(
        CONFIG.OPACITY.EDGE_BASE_MAX,
        (k - CONFIG.ZOOM.EDGE_FADE_START) * CONFIG.OPACITY.EDGE_BASE_FADE_RATE
      )
    );

    drawTimeGaps(ctx, timeCompression, currentX, innerWidth, innerHeight);
    drawTrendLines(
      ctx,
      trends,
      baseScales,
      timeCompression,
      transform,
      k,
      isSpotlighting
    );

    if (baseEdgeOpacity > 0 || isSpotlighting) {
      drawEdges(
        ctx,
        edges,
        nodeMap,
        getX,
        getY,
        getExternalScoreOrZero,
        innerWidth,
        spotlight,
        baseEdgeOpacity
      );
    }

    drawNodes(
      ctx,
      visibleNodes,
      getX,
      getY,
      getExternalScoreOrZero,
      scoresInternal,
      k,
      spotlight,
      sidebarHoveredId,
      baseNodeOpacity
    );
  }, [
    nodes,
    edges,
    trends,
    innerWidth,
    innerHeight,
    nodeMap,
    selectedNodeId,
    sidebarHoveredId,
    baseScales,
    timeCompression,
    getExternalScoreOrZero,
    scoresInternal,
  ]);

  useEffect(() => {
    renderAxes(transformRef.current);
    drawFrame();
  }, [drawFrame, renderAxes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const zoom = d3
      .zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([1, CONFIG.ZOOM.MAX_SCALE])
      .on("zoom", (event) => {
        transformRef.current = event.transform;
        setGraphTransform(event.transform);
        renderAxes(event.transform);
        drawFrame();
        window.dispatchEvent(
          new CustomEvent("graph-transform", { detail: event.transform })
        );
      });

    d3.select(canvas)
      .call(zoom)
      .on("click", (event: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        latestCallbacks.current.onClickNode(
          latestCallbacks.current.getNodeAtEvent(
            event.clientX - rect.left,
            event.clientY - rect.top
          )
        );
      });

    let frameId: number | null = null;
    const handleMouseMove = (e: MouseEvent) => {
      if (frameId !== null) return;

      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const closestNode = latestCallbacks.current.getNodeAtEvent(mx, my);

        if (closestNode) {
          if (hoveredNodeIdRef.current !== closestNode.id) {
            hoveredNodeIdRef.current = closestNode.id;
            drawFrame();
          }
          const currentX = transformRef.current.rescaleX(baseScales.x);
          const score = getExternalScoreOrZero(closestNode.id);

          latestCallbacks.current.onHoverNode(
            closestNode,
            currentX(timeCompression.toSim(getMs(closestNode.timestamp))) +
              CONFIG.MARGIN.left,
            baseScales.y(score) + CONFIG.MARGIN.top
          );
          canvas.style.cursor = "pointer";
        } else {
          if (hoveredNodeIdRef.current !== null) {
            hoveredNodeIdRef.current = null;
            drawFrame();
          }
          latestCallbacks.current.onHoverNode(null, 0, 0);
          canvas.style.cursor = "crosshair";
        }
      });
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    return () => {
      d3.select(canvas).on(".zoom", null).on("click", null);
      canvas.removeEventListener("mousemove", handleMouseMove);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [
    baseScales,
    drawFrame,
    getExternalScoreOrZero,
    renderAxes,
    timeCompression,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || innerWidth <= 0 || innerHeight <= 0) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;

    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx?.scale(dpr, dpr);
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;

    renderAxes(transformRef.current);
    drawFrame();
  }, [innerWidth, innerHeight, drawFrame, renderAxes]);

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
        className="outline-none touch-none"
      />
    </div>
  );
};
