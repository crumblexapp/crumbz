"use client";

import { useEffect } from "react";
import { HeroUIProvider } from "@heroui/react";
import FloatingProgressOverlay from "@/components/FloatingProgressOverlay";
import PullToRefresh from "@/components/PullToRefresh";
import { initCapacitor, initBackButtonHandler, handleNativeAuthCallback } from "@/lib/capacitor";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initCapacitor();

    initBackButtonHandler(() => {
      import('@capacitor/app').then(({ App }) => App.minimizeApp()).catch(() => {});
    });

    // Handle deep links from native OAuth (Google Sign-In via SFSafariViewController)
    import('@capacitor/app').then(({ App }) => {
      App.addListener('appUrlOpen', ({ url }) => {
        if (url.startsWith('crumbz://login-callback')) {
          handleNativeAuthCallback(url);
        }
      });
    }).catch(() => {});
  }, []);

  return (
    <HeroUIProvider>
      <PullToRefresh />
      {children}
      <FloatingProgressOverlay />
    </HeroUIProvider>
  );
}
