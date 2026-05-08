"use client";

import { Fragment, useState, type ReactNode } from "react";
import type { AppPost, VideoRatio } from "@/lib/app-types";

export function getVideoAspectClass(ratio: VideoRatio) {
  switch (ratio) {
    case "16:9":
      return "aspect-video";
    case "4:5":
      return "aspect-[4/5]";
    case "1:1":
      return "aspect-square";
    default:
      return "aspect-[9/16]";
  }
}

function isVideoUrl(url: string): boolean {
  const lower = url.toLowerCase().split("?")[0] ?? "";
  return lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.endsWith(".webm");
}

export function PostMediaPreview({
  post,
  detail = false,
  onView,
}: {
  post: AppPost;
  detail?: boolean;
  onView?: () => void;
}) {
  const mediaUrls = Array.isArray(post.mediaUrls) ? post.mediaUrls : [];
  const [activeIndex, setActiveIndex] = useState(0);
  const currentIndex = Math.min(activeIndex, mediaUrls.length - 1);
  const effectiveMediaKind =
    post.mediaKind !== "none"
      ? post.mediaKind
      : mediaUrls.length > 1
        ? "carousel"
        : mediaUrls.length === 1
          ? "photo"
          : "none";

  if (effectiveMediaKind === "none" || !mediaUrls.length) return null;

  if (effectiveMediaKind === "photo") {
    return (
      <div data-no-swipe className={`overflow-hidden rounded-[24px] bg-[#FFF0D0] ring-1 ring-[#FFF0D0] ${detail ? "flex justify-center bg-white p-2" : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaUrls[0]}
          alt={post.title}
          className={detail ? "max-h-[70vh] w-auto max-w-full object-contain" : "h-auto w-full object-contain"}
          loading="lazy"
        />
      </div>
    );
  }

  if (effectiveMediaKind === "video") {
    return (
      <div data-no-swipe className={`${detail ? "overflow-hidden rounded-[24px] bg-[#FFF0D0] ring-1 ring-[#FFF0D0]" : `${getVideoAspectClass(post.videoRatio)} overflow-hidden rounded-[24px] bg-[#FFF0D0] ring-1 ring-[#FFF0D0]`}`}>
        <video
          src={mediaUrls[0]}
          controls
          playsInline
          className={detail ? "max-h-[70vh] w-full object-contain bg-black" : "h-full w-full object-cover"}
          onPlay={(e) => {
            if (!onView) return;
            const vid = e.currentTarget;
            const timer = window.setTimeout(() => {
              if (!vid.paused && !vid.ended) onView();
            }, 3000);
            vid.dataset.viewTimer = String(timer);
          }}
          onPause={(e) => {
            const timer = Number(e.currentTarget.dataset.viewTimer);
            if (timer) window.clearTimeout(timer);
          }}
          onEnded={(e) => {
            const timer = Number(e.currentTarget.dataset.viewTimer);
            if (timer) window.clearTimeout(timer);
          }}
        />
      </div>
    );
  }

  const cropOffset = post.cropOffsets?.[currentIndex];
  const slideIsVideo =
    post.mediaTypes?.[currentIndex] === "video" || isVideoUrl(mediaUrls[currentIndex] ?? "");

  return (
    <div className="space-y-3" data-no-swipe>
      <div className="relative overflow-hidden rounded-[24px] bg-[#FFF0D0] ring-1 ring-[#FFF0D0]">
        {slideIsVideo ? (
          <video
            key={mediaUrls[currentIndex]}
            src={mediaUrls[currentIndex]}
            controls
            playsInline
            preload="metadata"
            className={detail ? "max-h-[70vh] w-full object-contain bg-black" : "h-[28rem] w-full object-cover"}
            style={!detail && cropOffset ? { objectPosition: `${cropOffset.x}% ${cropOffset.y}%` } : undefined}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaUrls[currentIndex]}
            alt={`${post.title} ${currentIndex + 1}`}
            className={detail ? "max-h-[70vh] w-full object-contain bg-white" : "h-[28rem] w-full object-cover"}
            style={!detail && cropOffset ? { objectPosition: `${cropOffset.x}% ${cropOffset.y}%` } : undefined}
            loading="lazy"
          />
        )}
        {mediaUrls.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="previous slide"
              onClick={() => setActiveIndex((current) => (current <= 0 ? mediaUrls.length - 1 : current - 1))}
              className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-2xl text-[#2C1A0E] shadow-[0_10px_24px_rgba(44,26,14,0.16)]"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="next slide"
              onClick={() => setActiveIndex((current) => (current + 1) % mediaUrls.length)}
              className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-2xl text-[#2C1A0E] shadow-[0_10px_24px_rgba(44,26,14,0.16)]"
            >
              ›
            </button>
          </>
        ) : null}
      </div>
      {mediaUrls.length > 1 ? (
        <div className="flex items-center justify-center gap-2">
          {mediaUrls.map((url, index) => (
            <Fragment key={url}>
              <button
                type="button"
                aria-label={`show slide ${index + 1}`}
                onClick={() => setActiveIndex(index)}
                className={`h-2.5 rounded-full transition-all ${index === currentIndex ? "w-6 bg-[#F5A623]" : "w-2.5 bg-[#D8DFEB]"}`}
              />
            </Fragment>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function PostActionIcon({
  label,
  children,
  active = false,
  onPress,
}: {
  label: string;
  children: ReactNode;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onPress}
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition-colors ${
        active
          ? "border-[#F5A623] bg-[#F5A623] text-white"
          : "border-[#F3DFC1] bg-white text-[#2C1A0E] hover:border-[#F5A623]/60"
      }`}
    >
      <span className="pointer-events-none flex items-center justify-center">{children}</span>
    </button>
  );
}
