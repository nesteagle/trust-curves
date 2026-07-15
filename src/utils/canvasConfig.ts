import * as d3 from "d3";
import type { NodeData } from "../types";
import { getMs } from "./time";

export const bisectTime = d3.bisector<NodeData, number>((d) =>
  getMs(d.timestamp)
).left;

export const CONFIG = {
  MARGIN: { top: 20, right: 30, bottom: 40, left: 50 },
  TICK_SPACING: 120,
  X_PAD_RATIO: 0.05,
  HOVER_RADIUS: 10,
  TIME: {
    GAP_THRESHOLD_MS: 6 * 60 * 60 * 1000, // 6 hour + gaps are collapsed
    COLLAPSED_SPACE_MS: 0.25 * 60 * 60 * 1000, // collapsed space takes 1/4 hour or 15 minutes
  },
  EDGE: { MAX_BULGE: 50, BULGE_RATIO: 0.2 },
  OPACITY: {
    NODE_BASE_MIN: 0.15,
    NODE_BASE_MAX: 1.0,
    NODE_BASE_FADE_RATE: 0.1,
    EDGE_BASE_MIN: 0.0,
    EDGE_BASE_MAX: 0.5,
    EDGE_BASE_FADE_RATE: 0.15,
    SPOTLIGHT_MUTED: 0.2,
    SPOTLIGHT_SOLID: 0.9,
    NODE_FILL_INACTIVE_SCALE: 0.6,
    NODE_FILL_BASE_SCALE: 0.8,
    TETHER_MAX: 0.5,
    TETHER_FADE_RATE: 0.2,
    TETHER_ACTIVE: 0.8,
    TETHER_MUTED_SCALE: 0.1,
    TREND_MUTED_SCALE: 0.1,
    TREND_MIN: 0.05,
    TREND_MAX: 0.8,
  },
  ZOOM: {
    NODE_FADE_START: 1.0,
    EDGE_FADE_START: 1.2,
    NODE_SMALL: 2.0,
    TETHER_FADE_START: 3.0,
    TETHER_VISIBLE: 4.0,
    MID_DETAIL: 15.0,
    HIGH_DETAIL: 50.0,
    MAX_SCALE: 500,
  },
  RADIUS: { MIN: 3, MAX: 6.5, SCALE: 1.5 },
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
  COLOR: {
    TIME_GAP_FILL: "rgba(0, 0, 0, 0.02)",
    TIME_GAP_LINE: "rgba(0, 0, 0, 0.08)",
    ANNOTATION_LINE: "rgba(100, 116, 139, 0.6)",
    ANNOTATION_LABEL_BG: "rgba(255, 255, 255, 0.85)",
    TETHER: (opacity: number) => `rgba(180, 50, 50, ${opacity})`,
  },
  ANNOTATION: { HIT_RADIUS: 4, VIEWPORT_PADDING: 50 },
};

export const DEFAULT_SCORE_DOMAIN: [number, number] = [-1.25, 1.25];
