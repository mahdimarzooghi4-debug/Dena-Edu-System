"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MarkAllInstituteNotificationsRead({ ids }: { ids: string[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function markAll() {
    setPending(true);
    setError("");
    try {
      const results = await Promise.all(ids.map((id) =>
        fetch(`/api/support/notifications/${encodeURIComponent(id)}`, {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
        })));
      if (results.some((response) => !response.ok)) throw new Error("update_failed");
      router.refresh();
    } catch {
      setError("به‌روزرسانی اعلان‌ها انجام نشد. دوباره تلاش کنید.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button type="button" onClick={markAll} disabled={pending || ids.length === 0}
        className="min-h-10 rounded-lg border border-[#e5e1ed] bg-white px-4 text-sm font-semibold text-[#5b4ce2] disabled:cursor-not-allowed disabled:opacity-50">
        {pending ? "در حال به‌روزرسانی…" : "علامت‌گذاری همه به‌عنوان خوانده‌شده"}
      </button>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
