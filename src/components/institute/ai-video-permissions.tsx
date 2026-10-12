"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Card } from "../ui/card";

type VideoAsset = {
  assetId: string;
  title: string;
  mediaStatus: "ready" | "withdrawn";
  permissionDecision: "granted" | "revoked" | null;
  changedAt: string | null;
};

export function AiVideoPermissions({
  courseId,
  grantEligible,
}: {
  courseId: string;
  grantEligible: boolean;
}) {
  const [assets, setAssets] = useState<VideoAsset[]>([]);
  const [transcriptChunkCounts, setTranscriptChunkCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [savingAsset, setSavingAsset] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/institute/courses/${courseId}/ai-permissions`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("فهرست ویدئوها در دسترس نیست.");
      const body = await response.json() as { assets: VideoAsset[] };
      setAssets(body.assets);
      const transcriptsResponse = await fetch(
        `/api/institute/courses/${courseId}/ai-transcripts`,
        { cache: "no-store" },
      );
      if (!transcriptsResponse.ok) throw new Error("وضعیت رونوشت‌ها در دسترس نیست.");
      const transcriptBody = await transcriptsResponse.json() as {
        assets: Array<{ assetId: string; chunkCount: number }>;
      };
      setTranscriptChunkCounts(Object.fromEntries(
        transcriptBody.assets.map((item) => [item.assetId, item.chunkCount]),
      ));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "خطا در دریافت ویدئوها.");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function submitTranscript(
    event: FormEvent<HTMLFormElement>,
    asset: VideoAsset,
  ) {
    event.preventDefault();
    setSavingAsset(asset.assetId);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(
        `/api/institute/courses/${courseId}/ai-transcripts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assetId: asset.assetId,
            transcript: String(form.get("transcript") ?? ""),
          }),
        },
      );
      const result = await response.json().catch(() => null) as
        { error?: string; chunkCount?: number } | null;
      if (!response.ok) throw new Error(result?.error ===
        "Course, video, or AI permission unavailable"
        ? "مجوز فعال این ویدئو پیدا نشد."
        : "ثبت رونوشت انجام نشد؛ متن و مجوز را بررسی کنید.");
      setMessage(`رونوشت ذخیره شد و به ${result?.chunkCount ?? 0} بخش جست‌وجوپذیر تقسیم شد.`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ثبت رونوشت انجام نشد.");
    } finally {
      setSavingAsset(null);
    }
  }

  async function submit(
    event: FormEvent<HTMLFormElement>,
    asset: VideoAsset,
    decision: "granted" | "revoked",
  ) {
    event.preventDefault();
    setSavingAsset(asset.assetId);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const body = decision === "granted"
      ? {
          decision,
          assetId: asset.assetId,
          requestId: crypto.randomUUID(),
          rightsReviewRef: String(form.get("rightsReviewRef") ?? "").trim(),
        }
      : {
          decision,
          assetId: asset.assetId,
          requestId: crypto.randomUUID(),
          reason: String(form.get("reason") ?? "").trim(),
        };
    try {
      const response = await fetch(
        `/api/institute/courses/${courseId}/ai-permissions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!response.ok) {
        const result = await response.json().catch(() => null) as
          { error?: string } | null;
        throw new Error(result?.error === "Course or video unavailable"
          ? "این ویدئو برای ثبت مجوز آماده نیست."
          : "ثبت تصمیم انجام نشد. دوباره بررسی کنید.");
      }
      setMessage(decision === "granted"
        ? "ارجاع بازبینی ثبت شد؛ این ثبت، اثبات حقوق یا مجوز قانونی نیست."
        : "لغو مجوز ثبت شد و منبع از فهرست مجاز دانش‌آموزان خارج شد.");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ثبت تصمیم انجام نشد.");
    } finally {
      setSavingAsset(null);
    }
  }

  return (
    <section aria-labelledby="ai-video-permission-title" className="space-y-4">
      <div>
        <h2 id="ai-video-permission-title" className="text-xl font-extrabold">
          مجوز استفاده از ویدئو برای معلم هوشمند
        </h2>
        <p className="mt-2 text-sm leading-8 text-dena-muted">
          فقط ویدئوهای آماده و متعلق به همین مؤسسه قابل تأیید هستند.
          ارجاع ثبت‌شده به پروندهٔ بازبینی اشاره می‌کند و دنا اعتبار حقوقی آن را بررسی نمی‌کند.
          نبود مجوز یا ثبت لغو، دسترسی AI به ویدئو را می‌بندد.
        </p>
      </div>

      {message && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm leading-7 text-emerald-800">{message}</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm leading-7 text-red-800">{error}</p>}
      {loading ? (
        <Card className="p-5 text-sm text-dena-muted">در حال دریافت فهرست ویدئوها…</Card>
      ) : assets.length === 0 ? (
        <Card className="p-5 text-sm leading-7 text-dena-muted">
          هنوز ویدئویی برای این دوره ثبت نشده است.
        </Card>
      ) : (
        <div className="space-y-3">
          {assets.map((asset) => {
            const granted = asset.permissionDecision === "granted";
            const saving = savingAsset === asset.assetId;
            return (
              <Card key={asset.assetId} className="space-y-4 rounded-2xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{asset.title}</h3>
                    <p className="mt-1 text-xs text-dena-muted">
                      {asset.mediaStatus === "ready" ? "ویدئوی آماده" : "ویدئو لغو یا خارج شده"}
                      {" · "}
                      {granted ? "مجوز ثبت شده" :
                        asset.permissionDecision === "revoked" ? "مجوز لغوشده" : "بدون مجوز"}
                    </p>
                  </div>
                  {granted && (
                    <form onSubmit={(event) => void submit(event, asset, "revoked")}
                      className="flex flex-wrap items-end gap-2">
                      <label className="sr-only" htmlFor={`revoke-${asset.assetId}`}>
                        دلیل لغو مجوز
                      </label>
                      <input id={`revoke-${asset.assetId}`} name="reason"
                        required minLength={3} maxLength={500}
                        placeholder="دلیل لغو"
                        className="min-h-10 rounded-lg border border-dena-border px-3 text-sm"
                      />
                      <button disabled={saving}
                        className="min-h-10 rounded-lg bg-red-700 px-4 text-sm font-bold text-white disabled:opacity-60">
                        {saving ? "در حال ثبت…" : "لغو مجوز"}
                      </button>
                    </form>
                  )}
                </div>

                {!granted && asset.mediaStatus === "ready" && grantEligible && (
                  <form onSubmit={(event) => void submit(event, asset, "granted")}
                    className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex-1">
                      <label htmlFor={`review-${asset.assetId}`}
                        className="mb-1 block text-xs font-bold text-dena-muted">
                        شناسهٔ ارجاع پروندهٔ بازبینی مجوز
                      </label>
                      <input id={`review-${asset.assetId}`} name="rightsReviewRef"
                        required minLength={8} maxLength={200}
                        className="min-h-11 w-full rounded-lg border border-dena-border px-3 text-sm"
                        placeholder="مثلاً شناسهٔ پروندهٔ داخلی مؤسسه"
                      />
                    </div>
                    <button disabled={saving}
                      className="min-h-11 rounded-lg bg-dena-brand px-4 text-sm font-bold text-white disabled:opacity-60">
                      {saving ? "در حال ثبت…" : "ثبت ارجاع بازبینی"}
                    </button>
                  </form>
                )}

                {granted && asset.mediaStatus === "ready" && (
                  <form onSubmit={(event) => void submitTranscript(event, asset)}
                    className="space-y-3 rounded-xl bg-dena-bg p-4">
                    <div>
                      <h4 className="font-bold">رونوشت آموزشی ویدئو</h4>
                      <p className="mt-1 text-xs leading-6 text-dena-muted">
                        متن را از منبع مجاز وارد کنید. دنا فعلاً گفتار را خودکار پیاده نمی‌کند؛ متن در پاسخ‌ها به صورت نقل‌قول قابل جست‌وجو می‌شود.
                        {transcriptChunkCounts[asset.assetId]
                          ? ` ${transcriptChunkCounts[asset.assetId]} بخش ثبت‌شده.`
                          : " هنوز رونوشت ثبت نشده است."}
                      </p>
                    </div>
                    <label className="block text-xs font-bold text-dena-muted">
                      متن رونوشت (۸۰ تا ۲۰٬۰۰۰ نویسه)
                      <textarea name="transcript" required minLength={80} maxLength={20000}
                        className="mt-2 min-h-36 w-full rounded-lg border border-dena-border bg-white p-3 text-sm font-normal leading-7"
                        placeholder="بخش پیاده‌سازی‌شدهٔ درس را وارد کنید…"
                      />
                    </label>
                    <button disabled={saving}
                      className="min-h-10 rounded-lg bg-dena-brand px-4 text-sm font-bold text-white disabled:opacity-60">
                      {saving ? "در حال ثبت…" : "جایگزینی رونوشت"}
                    </button>
                  </form>
                )}

                {!grantEligible && !granted && (
                  <p className="rounded-lg bg-dena-bg p-3 text-xs leading-7 text-dena-muted">
                    این دوره متعلق به ارائه‌دهنده یا مدرس مستقل است؛ تا زمان اضافه‌شدن تأیید مالک محتوا،
                    مجوز پردازش AI برای آن قابل ثبت نیست.
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
