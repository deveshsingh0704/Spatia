"use client";

import { useEffect } from "react";
import { applyAppearanceSettings, loadAppearanceSettings } from "@/lib/appearance";

export function AppearanceSync() {
  useEffect(() => {
    const sync = () => {
      const settings = loadAppearanceSettings();
      applyAppearanceSettings(settings);
    };
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  return null;
}

