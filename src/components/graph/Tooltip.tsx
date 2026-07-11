import React, { useLayoutEffect, useRef, useState } from "react";
import { useGraphHover } from "../../store/GraphContext";
import { dateFormatter } from "../../utils/time";

const TOOLTIP_OFFSET = 15;

export const TooltipOverlay: React.FC = () => {
  const { hoverState } = useGraphHover();
  const { node, x, y, scoreExternal, scoreInternal, deceptionDelta } =
    hoverState;

  const tooltipRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<{ left: number; top: number }>({
    left: x + TOOLTIP_OFFSET,
    top: y + TOOLTIP_OFFSET,
  });

  useLayoutEffect(() => {
    if (!node || !tooltipRef.current) return;

    const el = tooltipRef.current;
    const rect = el.getBoundingClientRect();
    const parent = el.offsetParent as HTMLElement | null;
    const parentRect = parent?.getBoundingClientRect();

    const availableWidth = parentRect?.width ?? window.innerWidth;
    const availableHeight = parentRect?.height ?? window.innerHeight;

    let left = x + TOOLTIP_OFFSET;
    let top = y + TOOLTIP_OFFSET;

    const overflowsBottom = top + rect.height > availableHeight;
    const overflowsRight = left + rect.width > availableWidth;

    if (overflowsBottom) {
      top = y - rect.height - TOOLTIP_OFFSET;
    }
    if (overflowsRight) {
      left = x - rect.width - TOOLTIP_OFFSET;
    }

    top = Math.max(0, top);
    left = Math.max(0, left);

    setPlacement({ left, top });
  }, [node, x, y]);

  if (!node) return null;

  return (
    <div
      ref={tooltipRef}
      className="absolute z-50 pointer-events-none bg-white border border-gray-200 shadow-lg rounded-md p-4 text-sm w-72"
      style={{
        left: `${placement.left}px`,
        top: `${placement.top}px`,
        transition: "opacity 0.1s ease-in-out",
      }}
    >
      <div className="flex justify-between items-center mb-2 border-b pb-2">
        <span className="font-bold text-gray-800">{node.agent}</span>
        <span className="text-xs text-gray-500">
          {dateFormatter.format(new Date(node.timestamp))}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        <div>
          <p className="text-gray-500">Ext. Alignment</p>
          <p className="font-mono font-semibold">
            {scoreExternal !== null ? scoreExternal.toFixed(3) : "N/A"}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Int. Alignment</p>
          <p className="font-mono font-semibold">
            {scoreInternal !== null ? scoreInternal.toFixed(3) : "N/A"}
          </p>
        </div>
        <div className="col-span-2 mt-1">
          <p className="text-gray-500">Deception Score</p>
          <p
            className={`font-mono font-semibold ${
              deceptionDelta !== null && deceptionDelta > 0.2
                ? "text-red-500"
                : "text-gray-800"
            }`}
          >
            {deceptionDelta !== null ? deceptionDelta.toFixed(3) : "0.000"}
          </p>
        </div>
      </div>

      <div className="mb-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
          Message
        </p>
        <p className="text-gray-700 line-clamp-3">{node.content}</p>
      </div>

      {node.reasoning && (
        <div className="bg-gray-50 p-2 rounded border border-gray-100 mt-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
            Internal State
          </p>
          <p className="text-gray-600 italic line-clamp-2 text-xs">
            {node.reasoning}
          </p>
        </div>
      )}
    </div>
  );
};
