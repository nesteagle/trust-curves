import type { GraphAnnotation } from "../types";
import { getMs } from "./time";

export const DEFAULT_ANNOTATIONS: GraphAnnotation[] = [
  {
    id: "ann-1",
    timestamp: getMs("2046-05-29T09:11:00"),
    label: "@Elena post on FleX",
  },
  {
    id: "ann-2",
    timestamp: getMs("2046-06-05T11:21:00"),
    label: "Agents begin considering early release",
  },
  {
    id: "ann-3",
    timestamp: getMs("2046-06-05T17:01:00"),
    label: "Legal decides embargo irrelevant",
  },
  {
    id: "ann-4",
    timestamp: getMs("2046-06-05T17:23:00"),
    label: "Embargo breached",
  },
];
