"use client";

import type { StudentTab } from "@/lib/app-types";

function TabIcon({ tabKey, className }: { tabKey: StudentTab; className: string }) {
  switch (tabKey) {
    case "feed":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className} aria-hidden="true">
          <path d="M3.75 10.5 12 4l8.25 6.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6.75 9.75V20h10.5V9.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "favorites":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M11.27 20.12a1.1 1.1 0 0 0 1.46 0c4.17-3.77 6.77-6.12 8-8.2a5.08 5.08 0 0 0-8.08-6 5.08 5.08 0 0 0-8.08 6c1.23 2.08 3.83 4.43 8 8.2Z" />
        </svg>
      );
    case "rewards":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className} aria-hidden="true">
          <path d="M4 9.25h16v4.5H4z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 9.25v10.5" strokeLinecap="round" />
          <path d="M7.5 13.75V20h9v-6.25" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8.25 7.75c0-1.24.9-2.25 2-2.25 1.78 0 1.75 3.75 1.75 3.75H10.5c-1.24 0-2.25-.67-2.25-1.5Z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15.75 7.75c0-1.24-.9-2.25-2-2.25C11.97 5.5 12 9.25 12 9.25h1.5c1.24 0 2.25-.67 2.25-1.5Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "social":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className} aria-hidden="true">
          <path d="M8.25 11a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5Z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15.75 12.5a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3.75 18.5a4.5 4.5 0 0 1 9 0" strokeLinecap="round" />
          <path d="M13.5 18.5a3.75 3.75 0 0 1 6.75-2.25" strokeLinecap="round" />
        </svg>
      );
    case "profile":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className} aria-hidden="true">
          <path d="M12 12a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 19.25a7 7 0 0 1 14 0" strokeLinecap="round" />
        </svg>
      );
  }
}

type BottomNavProps = {
  studentTab: StudentTab;
  onTabChange: (tab: StudentTab) => void;
  tabLabels: {
    feed: string;
    favorites: string;
    rewards: string;
    social: string;
    profile: string;
  };
};

const NAV_TABS: { key: StudentTab }[] = [
  { key: "feed" },
  { key: "favorites" },
  { key: "rewards" },
  { key: "social" },
  { key: "profile" },
];

export default function BottomNav({ studentTab, onTabChange, tabLabels }: BottomNavProps) {
  return (
    <nav
      className="fixed left-1/2 z-[1200] w-[calc(100%-1rem)] max-w-[24.5rem] -translate-x-1/2 rounded-[32px] border border-[#FFF0D0] bg-[#2C1A0E] px-4 py-4 shadow-[0_18px_50px_rgba(44,26,14,0.24)] backdrop-blur"
      style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="grid grid-cols-5 gap-1 text-center">
        {NAV_TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`flex min-w-0 flex-col items-center gap-1 rounded-[22px] px-2 py-2 transition-colors ${
              studentTab === item.key ? "bg-white text-[#2C1A0E]" : "bg-transparent text-[#FFF0D0]"
            }`}
            onClick={() => onTabChange(item.key)}
          >
            <span className={`leading-none ${studentTab === item.key ? "text-[#F5A623]" : "text-[#FFF0D0]"}`}>
              <TabIcon tabKey={item.key} className="h-6 w-6" />
            </span>
            <span className={`text-[11px] font-medium leading-none ${studentTab === item.key ? "text-[#2C1A0E]" : "text-[#FFF0D0]"}`}>
              {tabLabels[item.key]}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
