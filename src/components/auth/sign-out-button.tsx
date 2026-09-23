"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";

export function SignOutButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <div className="flex items-center gap-3">
      {error && <span role="alert" className="text-xs text-red-700">{error}</span>}
      <Button variant="outline" disabled={busy} onClick={async () => {
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
        {busy ? "در حال خروج…" : "خروج از حساب"}
      </Button>
    </div>
  );
}
