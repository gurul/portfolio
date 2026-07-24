"use client";

import { useEffect } from "react";
import { whenIntroReady } from "../lib/introReady";

export default function IntroGate() {
  useEffect(() => {
    whenIntroReady();
  }, []);

  return null;
}
