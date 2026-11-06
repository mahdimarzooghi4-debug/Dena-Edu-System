"use client";

import { useEffect, useState } from "react";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
export function InstallStudentApp() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  useEffect(() => {
    if ("serviceWorker" in navigator && window.isSecureContext) {
      void navigator.serviceWorker.register("/student-sw.js", { scope: "/student/" }).catch(() => {});
    }
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);
  if (!prompt) return null;
  return (
    <button type="button" className="mb-4 rounded-xl border border-dena-brand bg-white px-4 py-2 text-xs font-bold text-dena-brand"
      onClick={async () => { await prompt.prompt(); await prompt.userChoice; setPrompt(null); }}>
      نصب اپ دانش‌آموز روی دستگاه
    </button>
  );
}
