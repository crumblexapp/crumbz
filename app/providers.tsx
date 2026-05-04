"use client";

import { useEffect } from "react";
import { HeroUIProvider } from "@heroui/react";
import FloatingProgressOverlay from "@/components/FloatingProgressOverlay";
import PullToRefresh from "@/components/PullToRefresh";
import { initCapacitor, initBackButtonHandler } from "@/lib/capacitor";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initCapacitor();
    initBackButtonHandler(() => {
      // On Android: if no history to go back to, minimize the app
      import('@capacitor/app').then(({ App }) => App.minimizeApp()).catch(() => {});
    });
  }, []);

  return (
    <HeroUIProvider>
      <PullToRefresh />
      {children}
      <FloatingProgressOverlay />
    </HeroUIProvider>
  );
}
