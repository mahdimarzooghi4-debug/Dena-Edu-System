"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";

export function SignOutButton({ appearance = "default" }: { appearance?: "default" | "sidebar" }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <div className={appearance === "sidebar" ? "flex flex-col items-stretch gap-2" : "flex items-center gap-3"}>
      {error && <span role="alert" className={appearance === "sidebar" ? "text-xs text-red-200" : "text-xs text-red-700"}>{error}</span>}
      <Button variant="outline" className={appearance === "sidebar"
        ? "min-h-[34px] justify-start gap-2 rounded-lg border-transparent bg-transparent px-2.5 py-2 text-xs font-normal text-[#f26666] hover:bg-white/10 focus-visible:outline-[#f26666]"
        : undefined} disabled={busy} onClick={async () => {
        setBusy(true);
        setError("");
        try {
          const response = await fetch("/api/auth/sign-out", {
            method: "POST", credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}), cache: "no-store",
          });
          if (!response.ok) {
            setError("خروج انجام نشد؛ مجدداً تلاش کنید.");
            return;
          }
          router.replace("/login");
          router.refresh();
        } catch {
          setError("اتصال برقرار نشد؛ مجدداً تلاش کنید.");
        } finally {
          setBusy(false);
        }
      }}>
        {appearance === "sidebar" && <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-[#f26666]" />}
        {busy ? "در حال خروج…" : "خروج از حساب"}
      </Button>
    </div>
  );
}
