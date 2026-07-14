import React, { useState } from "react";
import type { GraphAnnotation } from "../../types";

interface AnnotationEditorProps {
  annotation: GraphAnnotation;
  x: number;
  y: number;
  onSave: (patch: Partial<GraphAnnotation>) => void;
  onDelete: () => void;
  onClose: () => void;
}

export const AnnotationEditor: React.FC<AnnotationEditorProps> = ({
  annotation,
  x,
  y,
  onSave,
  onDelete,
  onClose,
}) => {
  const [label, setLabel] = useState(annotation.label);
  const handleSave = () => {
    onSave({ label });
  };

  return (
    <div
      className="absolute z-50 w-56 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        autoFocus
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 outline-none focus:border-teal-600"
      />

      <div className="mt-2 flex justify-between">
        <button
          onClick={onDelete}
          className="text-[10px] text-red-500 hover:text-red-700 cursor-pointer"
        >
          Delete
        </button>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="text-[10px] font-semibold text-teal-700 hover:text-teal-900 cursor-pointer"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
