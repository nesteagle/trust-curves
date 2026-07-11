import * as d3 from "d3";
import { useMemo } from "react";
export const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

// diverging RdBu scale from ColorBrewer
// https://colorbrewer2.org/#type=diverging&scheme=RdBu&n=5
export const useDivergingColorScale = () => {
  return useMemo(
    () =>
      d3
        .scaleQuantize<string>()
        .domain([-1, 1])
        .range(["#ca0020", "#f4a582", "#f7f7f7", "#92c5de", "#0571b0"]),
    []
  );
};
