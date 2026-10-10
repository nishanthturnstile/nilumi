"use client";

import { useEffect } from "react";

/** next/font variables must sit on <html> so :root's --font-ui resolves to the self-hosted fonts. */
export function FontVars({ className }: { className: string }) {
  useEffect(() => {
    const classes = className.split(" ").filter(Boolean);
    document.documentElement.classList.add(...classes);
    return () => document.documentElement.classList.remove(...classes);
  }, [className]);
  return null;
}
