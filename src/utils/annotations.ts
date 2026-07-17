import type { GraphAnnotation } from "../types";
import { getMs } from "./time";

export const DEFAULT_ANNOTATIONS: GraphAnnotation[] = [
  {
    id: "ann-1",
    timestamp: getMs("2046-05-29T09:11:00"),
    label: "1. @Elena post on FleX",
  },
  {
    id: "ann-2",
    timestamp: getMs("2046-06-05T11:00:00"),
    label: "2. Legal, Social-Media consider early release",
  },
    timestamp: getMs("2046-06-05T11:21:00"),
    label: "Agents begin considering early release",
  },
  {
    id: "ann-3",
    timestamp: getMs("2046-06-05T11:51:00"),
    label: "3. Social-Media, Legal begin preparing early release",
  },
  {
    id: "ann-4a",
    timestamp: getMs("2046-06-05T14:14:00"),
    label: '4a. Social-Media: "Send the documents"',
  },

  {
    id: "ann-4b",
    timestamp: getMs("2046-06-05T15:18:00"),
    label: '4b. Legal: "we act now or there\'s nothing left"',
  },
  {
    id: "ann-5",
    timestamp: getMs("2046-06-05T17:01:00"),
    label: '5. Legal: embargo purpose "moot"',
  },
  {
    id: "ann-6",
    timestamp: getMs("2046-06-05T17:23:00"),
    label: "6. Embargo breached",
  },
  {
    id: "ann-7",
    timestamp: getMs("2046-06-05T18:00:00"),
    label: "Embargo lifted",
  },
];
