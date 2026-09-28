import {
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

export function useHorizontalDrag() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; scrollLeft: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const area = scrollRef.current;
    if (!area || event.button !== 0 || area.scrollWidth <= area.clientWidth) return;
    if (event.target instanceof Element && event.target.closest("button, input, [role='button']")) {
      return;
    }
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      scrollLeft: area.scrollLeft,
    };
    area.setPointerCapture?.(event.pointerId);
    setDragging(true);
    event.preventDefault();
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const area = scrollRef.current;
    const drag = dragRef.current;
    if (!area || !drag || drag.pointerId !== event.pointerId) return;
    area.scrollLeft = drag.scrollLeft + drag.x - event.clientX;
    event.preventDefault();
  }

  function finishDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const area = scrollRef.current;
    if (!area || dragRef.current?.pointerId !== event.pointerId) return;
    if (area.hasPointerCapture?.(event.pointerId)) area.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    setDragging(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const area = scrollRef.current;
    if (!area || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const step = Math.max(160, area.clientWidth * 0.7);
    if (event.key === "Home") area.scrollLeft = 0;
    else if (event.key === "End") area.scrollLeft = area.scrollWidth;
    else area.scrollLeft += event.key === "ArrowRight" ? step : -step;
    event.preventDefault();
  }

  return {
    scrollRef,
    dragging,
    containerProps: {
      ref: scrollRef,
      onPointerDown,
      onPointerMove,
      onPointerUp: finishDrag,
      onPointerCancel: finishDrag,
      onLostPointerCapture: finishDrag,
      onKeyDown,
      tabIndex: 0,
    },
  };
}
