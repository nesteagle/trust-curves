import * as d3 from "d3";
import type { NodeData, EdgeData, TrendPoint, GraphAnnotation } from "../types";
import type { DAGNode } from "../hooks/useGraphNetwork";
import { getMs } from "./time";
import { colorScale } from "../hooks/useColor";
import { CONFIG } from "./canvasConfig";
import type { TimeCompression } from "../hooks/useTimeCompression";

interface SpotlightState {
  isSpotlighting: boolean;
  highlightNodeId: string | null;
  highlightThreadId: number | null;
}

const getSpotlightOpacity = (
  spotlight: SpotlightState,
  isActive: boolean,
  baseOpacity: number
) => {
  if (!spotlight.isSpotlighting) return baseOpacity;
  return isActive
    ? CONFIG.OPACITY.SPOTLIGHT_SOLID
    : CONFIG.OPACITY.SPOTLIGHT_MUTED;
};
export const drawTimeGaps = (
  ctx: CanvasRenderingContext2D,
  timeCompression: TimeCompression,
  currentX: d3.ScaleLinear<number, number>,
  innerWidth: number,
  innerHeight: number
) => {
  ctx.save();

  timeCompression.gaps.forEach((g) => {
    const x1 = currentX(timeCompression.toSim(g.start));
    const x2 = currentX(timeCompression.toSim(g.end));
    if (x2 > 0 && x1 < innerWidth) {
      ctx.fillStyle = CONFIG.COLOR.TIME_GAP_FILL;
      ctx.fillRect(x1, 0, x2 - x1, innerHeight);
    }
  });

  ctx.restore();
};

export const drawTrendLines = (
  ctx: CanvasRenderingContext2D,
  trends: Record<string, TrendPoint[]>,
  baseScales: {
    x: d3.ScaleLinear<number, number>;
    y: d3.ScaleLinear<number, number>;
  },
  timeCompression: TimeCompression,
  transform: d3.ZoomTransform,
  k: number,
  isSpotlighting: boolean
) => {
  if (k >= CONFIG.ZOOM.MID_DETAIL) return;

  const line = d3
    .line<TrendPoint>()
    .defined(() => true)
    .x((p) =>
      transform.applyX(baseScales.x(timeCompression.toSim(getMs(p.timestamp))))
    )
    .y((p) => baseScales.y(p.rollingAvg ?? 0))
    .curve(d3.curveBasis);

  ctx.save();
  Object.entries(trends).forEach(([agent, points]) => {
    ctx.beginPath();
    line.context(ctx)(points);
    ctx.strokeStyle = colorScale(agent);
    const trendOpacity = Math.max(
      CONFIG.OPACITY.TREND_MIN,
      CONFIG.OPACITY.TREND_MAX - k / CONFIG.ZOOM.MID_DETAIL
    );
    ctx.globalAlpha = isSpotlighting
      ? trendOpacity * CONFIG.OPACITY.TREND_MUTED_SCALE
      : trendOpacity;
    ctx.lineWidth = CONFIG.LINE_WIDTH.TREND;
    ctx.stroke();
  });
  ctx.restore();
};

export const drawEdges = (
  ctx: CanvasRenderingContext2D,
  edges: EdgeData[],
  nodeMap: Map<string, DAGNode>,
  getX: (timestamp: string | number) => number,
  getY: (score: number) => number,
  getExternalScoreOrZero: (nodeId: string) => number,
  innerWidth: number,
  spotlight: SpotlightState,
  baseEdgeOpacity: number
) => {
  ctx.save();
  edges.forEach((edge) => {
    const nodeA = nodeMap.get(edge.source);
    const nodeB = nodeMap.get(edge.target);
    if (!nodeA || !nodeB) return;

    const isAFirst = getMs(nodeA.timestamp) <= getMs(nodeB.timestamp);
    const sourceNode = isAFirst ? nodeA : nodeB;
    const targetNode = isAFirst ? nodeB : nodeA;

    const sx = getX(sourceNode.timestamp);
    const tx = getX(targetNode.timestamp);

    if (
      !spotlight.isSpotlighting &&
      ((sx < 0 && tx < 0) || (sx > innerWidth && tx > innerWidth))
    ) {
      return;
    }

    const sourceScore = getExternalScoreOrZero(sourceNode.id);
    const targetScore = getExternalScoreOrZero(targetNode.id);
    const sy = getY(sourceScore);
    const ty = getY(targetScore);

    const sourceActive =
      spotlight.highlightThreadId != null
        ? sourceNode.threadId === spotlight.highlightThreadId
        : sourceNode.id === spotlight.highlightNodeId;

    const targetActive =
      spotlight.highlightThreadId != null
        ? targetNode.threadId === spotlight.highlightThreadId
        : targetNode.id === spotlight.highlightNodeId;

    const isEdgeActive =
      spotlight.isSpotlighting && (sourceActive || targetActive);

    ctx.globalAlpha = getSpotlightOpacity(
      spotlight,
      isEdgeActive,
      baseEdgeOpacity
    );
    ctx.lineWidth =
      spotlight.isSpotlighting && isEdgeActive
        ? CONFIG.LINE_WIDTH.EDGE_ACTIVE
        : spotlight.isSpotlighting
        ? CONFIG.LINE_WIDTH.EDGE_MUTED
        : CONFIG.LINE_WIDTH.EDGE_BASE;

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    const bulge = Math.min(
      CONFIG.EDGE.MAX_BULGE,
      (tx - sx) * CONFIG.EDGE.BULGE_RATIO
    );
    ctx.quadraticCurveTo((sx + tx) / 2, Math.min(sy, ty) - bulge, tx, ty);
    ctx.strokeStyle = colorScale(sourceNode.agent);
    ctx.stroke();
  });
  ctx.restore();
};

export const drawNodes = (
  ctx: CanvasRenderingContext2D,
  visibleNodes: NodeData[],
  getX: (timestamp: string | number) => number,
  getY: (score: number) => number,
  getExternalScoreOrZero: (nodeId: string) => number,
  scoresInternal: Map<string, number | null>,
  k: number,
  spotlight: SpotlightState,
  sidebarHoveredId: string | null,
  baseNodeOpacity: number
) => {
  ctx.save();
  visibleNodes.forEach((node) => {
    const externalScore = getExternalScoreOrZero(node.id);

    const cx = getX(node.timestamp);
    const cy = getY(externalScore);
    const radius =
      k < CONFIG.ZOOM.NODE_SMALL
        ? CONFIG.RADIUS.MIN
        : Math.min(CONFIG.RADIUS.MAX, k * CONFIG.RADIUS.SCALE);

    const isNodeActive =
      spotlight.isSpotlighting &&
      (spotlight.highlightThreadId != null
        ? node.threadId === spotlight.highlightThreadId
        : node.id === spotlight.highlightNodeId);
    const isSidebarHovered = sidebarHoveredId === node.id;

    const finalOpacity = getSpotlightOpacity(
      spotlight,
      isNodeActive,
      baseNodeOpacity
    );
    const internalScore = scoresInternal.get(node.id);

    if (k >= CONFIG.ZOOM.TETHER_VISIBLE && internalScore != null) {
      ctx.save();
      let tetherOpacity = Math.min(
        CONFIG.OPACITY.TETHER_MAX,
        (k - CONFIG.ZOOM.TETHER_FADE_START) * CONFIG.OPACITY.TETHER_FADE_RATE
      );
      if (spotlight.isSpotlighting) {
        tetherOpacity = isNodeActive
          ? CONFIG.OPACITY.TETHER_ACTIVE
          : tetherOpacity * CONFIG.OPACITY.TETHER_MUTED_SCALE;
      }

      ctx.beginPath();
      ctx.setLineDash([2, 3]);
      ctx.moveTo(cx, cy + (internalScore > externalScore ? -radius : radius));
      ctx.lineTo(cx, getY(internalScore));
      ctx.strokeStyle = CONFIG.COLOR.TETHER(tetherOpacity);
      ctx.lineWidth = CONFIG.LINE_WIDTH.TETHER;
      ctx.stroke();
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);

    ctx.fillStyle = colorScale(node.agent);
    ctx.globalAlpha = isSidebarHovered
      ? CONFIG.OPACITY.SPOTLIGHT_SOLID
      : spotlight.isSpotlighting
      ? finalOpacity *
        (isNodeActive ? CONFIG.OPACITY.NODE_FILL_INACTIVE_SCALE : 1.0)
      : finalOpacity * CONFIG.OPACITY.NODE_FILL_BASE_SCALE;
    ctx.fill();

    ctx.strokeStyle = colorScale(node.agent);
    ctx.globalAlpha = finalOpacity;
    ctx.lineWidth = isSidebarHovered
      ? CONFIG.LINE_WIDTH.NODE_HOVER
      : spotlight.isSpotlighting && isNodeActive
      ? CONFIG.LINE_WIDTH.NODE_ACTIVE
      : k < CONFIG.ZOOM.NODE_SMALL
      ? CONFIG.LINE_WIDTH.NODE_TINY
      : CONFIG.LINE_WIDTH.NODE_BASE;
    ctx.stroke();
  });
  ctx.restore();
};

export const drawAnnotations = (
  ctx: CanvasRenderingContext2D,
  annotations: GraphAnnotation[],
  getX: (timestamp: string | number) => number,
  innerWidth: number,
  innerHeight: number
) => {
  if (!annotations || annotations.length === 0) return;

  ctx.save();
  ctx.font = CONFIG.ANNOTATION.ANNOTATION_FONT;

  const positioned = annotations
    .map((ann) => ({ ann, sx: getX(ann.timestamp) }))
    .filter(
      ({ sx }) =>
        sx >= -CONFIG.ANNOTATION.VIEWPORT_PADDING &&
        sx <= innerWidth + CONFIG.ANNOTATION.VIEWPORT_PADDING
    )
    .sort((a, b) => a.sx - b.sx);

  positioned.forEach(({ sx }) => {
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, innerHeight);
    ctx.strokeStyle = CONFIG.COLOR.ANNOTATION_LINE;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
  });

  const laneEndX: number[] = [];

  const NOTCH_WIDTH = 9;
  const NOTCH_HEIGHT = 4;

  positioned.forEach(({ ann, sx }) => {
    const textWidth = Math.min(ctx.measureText(ann.label).width);
    const pillLeft = sx - textWidth / 2 - 4;
    const pillRight = sx + textWidth / 2 + 4;

    let lane = laneEndX.findIndex((endX) => pillLeft > endX);
    if (lane === -1) {
      lane = laneEndX.length;
    }
    laneEndX[lane] = pillRight;

    const y = lane * CONFIG.ANNOTATION.LABEL_LANE_HEIGHT;
    const bottomY = y + 18;

    ctx.beginPath();
    ctx.moveTo(pillLeft, bottomY);
    ctx.lineTo(sx - NOTCH_WIDTH / 2, bottomY);
    ctx.lineTo(sx, bottomY + NOTCH_HEIGHT);
    ctx.lineTo(sx + NOTCH_WIDTH / 2, bottomY);
    ctx.lineTo(pillRight, bottomY);
    ctx.strokeStyle = CONFIG.COLOR.ANNOTATION_LINE;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);

    ctx.fillStyle = CONFIG.COLOR.ANNOTATION_LABEL_BG;
    ctx.fillRect(pillLeft, y, textWidth + 8, 18);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(sx - NOTCH_WIDTH / 2 + 1, bottomY);
    ctx.lineTo(sx, bottomY + NOTCH_HEIGHT - 1);
    ctx.lineTo(sx + NOTCH_WIDTH / 2 - 1, bottomY);
    ctx.lineWidth = 1.5;
    ctx.closePath();

    ctx.fill();

    ctx.fillStyle = "#475569";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(ann.label, sx, y + 4);
  });

  ctx.restore();
};
