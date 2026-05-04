"use client";

import { HeroUIProvider } from "@heroui/react";
import FloatingProgressOverlay from "@/components/FloatingProgressOverlay";
import PullToRefresh from "@/components/PullToRefresh";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <HeroUIProvider>
      <PullToRefresh />
      {children}
      <FloatingProgressOverlay />
    </HeroUIProvider>
  );
}
