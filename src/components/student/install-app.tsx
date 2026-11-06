"use client";

import { useEffect, useState } from "react";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** Android/Chromium PWA installation. No iOS-specific install flow. */
export function InstallStudentApp() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && window.isSecureContext) {
      void navigator.serviceWorker.register("/student-sw.js", { scope: "/student/" })
        .catch(() => undefined);
    }
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return <p role="status" className="mb-4 text-xs font-semibold text-dena-muted">اپ دنا روی این دستگاه نصب شده است.</p>;
  if (!prompt) return null;
  return (
    <button type="button" disabled={installing}
      className="mb-4 rounded-xl border border-dena-brand bg-white px-4 py-2 text-xs font-bold text-dena-brand disabled:opacity-60"
      onClick={async () => {
        setInstalling(true);
        try {
          await prompt.prompt();
          await prompt.userChoice;
          setPrompt(null);
        } finally {
          setInstalling(false);
        }
      }}>
      {installing ? "در حال نصب…" : "نصب اپ دانش‌آموز روی اندروید"}
    </button>
  );
}
