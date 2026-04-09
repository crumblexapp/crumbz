"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ProfileRedirect({ username }: { username: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/?profile=${encodeURIComponent(username)}`);
  }, [router, username]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fffaf2] px-6 text-center text-[#2C1A0E]">
      opening @{username}&apos;s profile...
    </div>
  );
}
