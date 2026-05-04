"use client";

import { useEffect, useRef, useState } from "react";

const THRESHOLD = 65;

export default function PullToRefresh() {
  const [progress, setProgress] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef(0);
  const activeRef = useRef(false);
  const progressRef = useRef(0);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 4) return;
      startYRef.current = e.touches[0]?.clientY ?? 0;
      activeRef.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!activeRef.current) return;
      const delta = (e.touches[0]?.clientY ?? 0) - startYRef.current;
      if (delta <= 0) {
        activeRef.current = false;
        progressRef.current = 0;
        setProgress(0);
        return;
      }
      // Dampen the pull so it feels elastic
      const p = Math.min(delta / (THRESHOLD * 2.4), 1);
      progressRef.current = p;
      setProgress(p);
    };

    const onTouchEnd = () => {
      if (!activeRef.current) return;
      activeRef.current = false;
      if (progressRef.current >= 0.55) {
        setRefreshing(true);
        setProgress(0);
        window.dispatchEvent(new CustomEvent("crumbz-refresh"));
        setTimeout(() => setRefreshing(false), 1800);
      } else {
        setProgress(0);
      }
      progressRef.current = 0;
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  if (progress < 0.06 && !refreshing) return null;

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 top-0 z-[9999] flex justify-center"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)" }}
    >
      <div
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5A623] shadow-lg"
        style={{
          opacity: refreshing ? 1 : progress,
          transform: `scale(${refreshing ? 1 : 0.5 + progress * 0.5})`,
          transition: "transform 0.1s ease",
        }}
      >
        {refreshing ? (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            style={{ animation: "spin 0.75s linear infinite" }}
          >
            <path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
        ) : (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transform: `rotate(${progress * 180}deg)`, transition: "transform 0.1s ease" }}
          >
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        )}
      </div>
    </div>
  );
}
