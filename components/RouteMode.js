"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function RouteMode() {
  const pathname = usePathname();

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    html.classList.add("route-flow");
    body.classList.add("route-flow");
    const isLockedRoute =
      pathname === "/" || pathname === "/about" || pathname === "/projects";
    html.classList.toggle("route-locked", isLockedRoute);
    body.classList.toggle("route-locked", isLockedRoute);

    return () => {
      html.classList.remove("route-flow");
      body.classList.remove("route-flow");
      html.classList.remove("route-locked");
      body.classList.remove("route-locked");
    };
  }, [pathname]);

  return null;
}
