"use client";

import { useEffect, useState } from "react";

/** Whether the primary pointer is a finger (`pointer: coarse`): read on the client, after mount, like `usePortrait` (no matchMedia on the server). */
export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(pointer: coarse)");
    const check = () => setCoarse(query.matches);
    check();
    query.addEventListener("change", check);
    return () => query.removeEventListener("change", check);
  }, []);
  return coarse;
}
