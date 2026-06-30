import React from "react";
import { useGraphHover } from "../../store/GraphContext";
import { dateFormatter } from "../../utils/time";

export const TooltipOverlay: React.FC = () => {
  const { hoverState } = useGraphHover();
  const { node, x, y } = hoverState;

  if (!node) return null;

  return (
    <div
      className="absolute z-50 pointer-events-none bg-white border border-gray-200 shadow-lg rounded-md p-4 text-sm w-72"
      style={{
        left: `${x + 15}px`,
        top: `${y + 15}px`,
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
            {node.scoreExternal.toFixed(3)}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Int. Alignment</p>
          <p className="font-mono font-semibold">
            {node.scoreInternal !== null
              ? node.scoreInternal.toFixed(3)
              : "N/A"}
          </p>
        </div>
        <div className="col-span-2 mt-1">
          <p className="text-gray-500">Deception Score</p>
          <p
            className={`font-mono font-semibold ${
              node.deceptionDelta && node.deceptionDelta > 0.2
                ? "text-red-500"
                : "text-gray-800"
            }`}
          >
            {node.deceptionDelta !== null
              ? node.deceptionDelta.toFixed(3)
              : "0.000"}
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
