import React, { useState, useRef, useEffect } from "react";

export const CollapsibleText: React.FC<{ text: string }> = ({ text }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (textRef.current) {
      setIsTruncated(
        textRef.current.scrollHeight > textRef.current.clientHeight
      );
    }
  }, [text]);

  return (
    <div className="relative">
      <p
        ref={textRef}
        className={`text-[13px] leading-relaxed text-slate-700 whitespace-pre-wrap ${
          !isExpanded ? "line-clamp-4" : ""
        }`}
      >
        {text}
      </p>
      {isTruncated && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-1 text-xs font-semibold text-indigo-600 transition-colors hover:text-indigo-800 cursor-pointer"
        >
          {isExpanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
};
