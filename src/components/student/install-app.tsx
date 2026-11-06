"use client";

import { useEffect, useState } from "react";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallStudentApp() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [isIosSafari, setIsIosSafari] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setInstalled(standalone);
    const userAgent = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/u.test(userAgent) && !("MSStream" in window);
    const safari = /Safari/u.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/u.test(userAgent);
    setIsIosSafari(ios && safari);

    if ("serviceWorker" in navigator && window.isSecureContext) {
      void navigator.serviceWorker.register("/student-sw.js", { scope: "/student/" }).catch(() => undefined);
    }
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const onInstalled = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return <p role="status" className="mb-4 text-xs font-semibold text-dena-muted">اپ دنا روی این دستگاه نصب شده است.</p>;
  if (prompt) return (
    <button type="button" disabled={installing}
      className="mb-4 rounded-xl border border-dena-brand bg-white px-4 py-2 text-xs font-bold text-dena-brand disabled:opacity-60"
      onClick={async () => {
        setInstalling(true);
        try {
          await prompt.prompt();
          const choice = await prompt.userChoice;
          if (choice.outcome === "accepted") setInstalled(true);
          setPrompt(null);
        } finally { setInstalling(false); }
      }}>
      {installing ? "در حال نصب…" : "نصب اپ دانش‌آموز روی دستگاه"}
    </button>
  );
  if (!isIosSafari) return null;
  return (
    <details className="mb-4 rounded-xl border border-dena-border bg-white px-4 py-3 text-xs text-dena-deep">
      <summary className="cursor-pointer font-bold text-dena-brand">نصب دنا روی آیفون و آیپد</summary>
      <ol className="mt-3 list-decimal space-y-2 pr-5 leading-6">
        <li>در مرورگر Safari، دکمهٔ اشتراک‌گذاری را بزن.</li>
        <li>گزینهٔ «افزودن به صفحهٔ اصلی» را انتخاب کن.</li>
        <li>با زدن «افزودن»، آیکون دنا به صفحهٔ اصلی دستگاه اضافه می‌شود.</li>
      </ol>
    </details>
  );
}
