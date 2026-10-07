"use client";

import { useEffect, useState } from "react";

/** Whether the screen is taller than wide: the same test the focus cameras use for their portrait framing (`aspect < 1`). */
export function usePortrait(): boolean {
  const [portrait, setPortrait] = useState(false);
  useEffect(() => {
    const check = () => setPortrait(window.innerWidth < window.innerHeight);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return portrait;
}
