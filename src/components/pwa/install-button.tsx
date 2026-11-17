"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function InstallButton() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setPromptEvent(null);
  }

  if (installed) return <p className="text-sm font-bold text-emerald-700">اپ دنا به صفحهٔ اصلی گوشی اضافه شد.</p>;
  if (promptEvent) return <button type="button" onClick={install} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#5b4ce2] px-6 py-3 text-sm font-bold text-white">نصب اپ روی دستگاه</button>;
  return <p className="max-w-lg text-sm leading-8 text-[#756f83]">در مرورگر اندروید، منوی مرورگر را باز کنید و «نصب برنامه» یا «افزودن به صفحهٔ اصلی» را بزنید. در آیفون، گزینهٔ «Add to Home Screen» در منوی اشتراک‌گذاری است.</p>;
}
