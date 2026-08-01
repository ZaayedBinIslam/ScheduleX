"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Scroll to and focus a newly added list row.
 *
 * New entries append to the end of their list, so on a long list (55 teachers,
 * 44 rooms) the row you just created lands off-screen and has to be hunted
 * down before it can be named. Appending keeps the ordering users expect;
 * this brings the new row to them instead.
 *
 * Mark the input that should receive focus with `data-row-input`. If a row has
 * several inputs, only the first is used.
 *
 * @param count Current number of items, so the hook can tell a real insertion
 *              from an unrelated re-render.
 */
export function useFocusOnAdd(count: number) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pendingRef = useRef(false);
  const previousCount = useRef(count);

  const handleAdd = useCallback((add: () => void) => {
    pendingRef.current = true;
    add();
  }, []);

  useEffect(() => {
    const grew = count > previousCount.current;
    previousCount.current = count;
    if (!pendingRef.current || !grew) return;
    pendingRef.current = false;

    const rows = containerRef.current?.querySelectorAll<HTMLElement>(
      "[data-row-input]"
    );
    const last = rows?.[rows.length - 1];
    if (!last) return;
    last.scrollIntoView({ block: "center", behavior: "smooth" });
    last.focus({ preventScroll: true });
    if (last instanceof HTMLInputElement) last.select();
  }, [count]);

  return { containerRef, handleAdd };
}
