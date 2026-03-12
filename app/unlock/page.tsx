"use client";

import { FormEvent, useState } from "react";
import { Button, Card, CardBody, Input } from "@heroui/react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function UnlockPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const unlock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/unlock", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      setError("that password didn’t match.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#daf1ff_0%,_#edf7e8_42%,_#f7eee3_100%)] px-4 py-8 text-zinc-950">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <Card className="w-full max-w-xl rounded-[2rem] border border-white/70 bg-white/80 shadow-2xl shadow-slate-300/30">
            <CardBody className="gap-5 p-8">
              <div className="font-[family-name:var(--font-space-grotesk)]">
                <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">private access</p>
                <h1 className="mt-3 text-5xl font-black leading-none text-zinc-950">
                  josh&apos;s
                  <span className="block text-sky-600">75 hard vault</span>
                </h1>
                <p className="mt-4 text-base text-zinc-600">
                  this app is locked because it holds your daily history, weight logs, notes, and progress photos.
                </p>
              </div>

              <form className="grid gap-4" onSubmit={unlock}>
                <Input
                  type="password"
                  label="site password"
                  value={password}
                  onValueChange={setPassword}
                  autoFocus
                />
                {error ? <p className="text-sm text-rose-600">{error}</p> : null}
                <Button type="submit" radius="full" className="bg-zinc-950 text-white" isLoading={loading}>
                  unlock app
                </Button>
              </form>

              <div className="rounded-[1.5rem] bg-zinc-950 p-4 text-sm text-zinc-300">
                start date is locked in for 13 march 2026. once you’re in, your dashboard and saved days stay yours.
              </div>
            </CardBody>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
