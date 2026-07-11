import * as d3 from "d3";

// Engine.tsx is the source of truth for the timeline's zoom/pan transform.
// It broadcasts changes via the "graph-transform" window CustomEvent (which
// Minimap already listens to), but a listener that starts *after* the user
// has already zoomed has no way to learn the current transform from that
// event stream alone. This tiny store keeps the last known transform around
// so late subscribers (like the chord panel, opened on demand) can read the
// current state immediately instead of waiting for the next zoom tick.
let current: d3.ZoomTransform = d3.zoomIdentity;

export const getGraphTransform = (): d3.ZoomTransform => current;

export const setGraphTransform = (transform: d3.ZoomTransform): void => {
  current = transform;
};
