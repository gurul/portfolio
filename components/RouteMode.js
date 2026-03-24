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
    const isAbout = pathname === "/about" || pathname === "/";
    html.classList.toggle("route-about", isAbout);
    body.classList.toggle("route-about", isAbout);

    return () => {
      html.classList.remove("route-flow");
      body.classList.remove("route-flow");
      html.classList.remove("route-about");
      body.classList.remove("route-about");
    };
  }, [pathname]);

  return null;
}
