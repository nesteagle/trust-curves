import { useEffect, useRef, useState, type RefObject } from "react";

export interface ContainerSize {
  width: number;
  height: number;
}

export const useContainerSize = <T extends HTMLElement>(): [
  RefObject<T | null>,
  ContainerSize
] => {
  const containerRef = useRef<T>(null);
  const [size, setSize] = useState<ContainerSize>({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return [containerRef, size];
};
