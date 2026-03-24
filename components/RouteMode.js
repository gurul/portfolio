"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function RouteMode() {
  usePathname();

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    html.classList.add("route-flow");
    body.classList.add("route-flow");

    return () => {
      html.classList.remove("route-flow");
      body.classList.remove("route-flow");
    };
  }, []);

  return null;
}
