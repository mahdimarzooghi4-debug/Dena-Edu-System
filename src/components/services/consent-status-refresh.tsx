"use client";

import { useRouter } from "next/navigation";

export function ConsentStatusRefresh() {
  const router = useRouter();

  return <button type="button" onClick={() => router.refresh()}
    className="flex h-12 w-full items-center justify-center rounded-xl border-[1.5px] border-dena-brand bg-white px-6 py-3 text-sm font-semibold text-dena-brand">
    بررسی وضعیت رضایت
  </button>;
}
