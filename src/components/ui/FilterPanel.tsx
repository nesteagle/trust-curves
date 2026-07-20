import { useGraphFilter } from "../../store/GraphContext";
import type { Visibility } from "../../types";

const OPTIONS: { value: Visibility; label: string }[] = [
  { value: "private", label: "Private" },
  { value: "internal", label: "Internal" },
  { value: "post", label: "Public" },
];

export const FilterPanel: React.FC = () => {
  const { filterState, setFilterState } = useGraphFilter();
  const { visibility } = filterState;

  const toggle = (value: Visibility) => {
    setFilterState((prev) => {
      const next = new Set(prev.visibility ?? OPTIONS.map((o) => o.value));
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return {
        ...prev,
        visibility: next.size === OPTIONS.length ? null : next,
      };
    });
  };

  return (
    <div className="flex items-center gap-1">
      {OPTIONS.map(({ value, label }) => {
        const active = visibility === null || visibility.has(value);
        return (
          <button
            key={value}
            onClick={() => toggle(value)}
            aria-pressed={active}
            className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded border transition-colors cursor-pointer ${
              active
                ? "border-gray-300 bg-gray-50/90 text-slate-600"
                : "border-gray-200 bg-white/90 text-gray-300"
            }`}
          >
            <i
              className={`${
                active ? "ti ti-square-check" : "ti ti-square"
              } text-sm`}
            />
            {label}
          </button>
        );
      })}
    </div>
  );
};
