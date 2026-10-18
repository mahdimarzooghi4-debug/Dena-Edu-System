"use client";

import { Room, RoomEvent, VideoPresets } from "livekit-client";
import { useEffect, useRef, useState } from "react";

type Props = { callId: string };

export function LiveKitCallRoom({ callId }: Props) {
  const roomRef = useRef<Room | null>(null);
  const localRef = useRef<HTMLDivElement>(null);
  const remoteRef = useRef<HTMLDivElement>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => () => {
    roomRef.current?.disconnect();
    roomRef.current = null;
  }, []);

  async function join() {
    if (!confirmed || busy || connected) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/service-calls/${encodeURIComponent(callId)}/token`, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) {
        setMessage(response.status === 503
          ? "سرویس تماس هنوز برای این محیط تنظیم نشده است."
          : "ورود به جلسه مجاز نیست؛ وضعیت پرداخت، رضایت و شروع جلسه را بررسی کنید.");
        return;
      }
      const credentials = await response.json() as { url: string; token: string };
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: { resolution: VideoPresets.h360.resolution },
      });
      roomRef.current = room;
      room.on(RoomEvent.TrackSubscribed, (track) => {
        const element = track.attach();
        element.className = "max-h-72 max-w-full rounded-xl bg-black object-contain";
        if (remoteRef.current) remoteRef.current.appendChild(element);
      });
      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((element) => element.remove());
      });
      room.on(RoomEvent.Disconnected, () => {
        setConnected(false);
        if (roomRef.current === room) roomRef.current = null;
      });
      await room.connect(credentials.url, credentials.token);
      await room.localParticipant.enableCameraAndMicrophone();
      for (const publication of room.localParticipant.videoTrackPublications.values()) {
        if (!publication.track || !localRef.current) continue;
        const element = publication.track.attach() as HTMLVideoElement;
        element.className = "max-h-72 max-w-full rounded-xl bg-black object-contain";
        element.muted = true;
        element.playsInline = true;
        localRef.current.appendChild(element);
      }
      setConnected(true);
      setMessage("به جلسه متصل شدید.");
    } catch {
      roomRef.current?.disconnect();
      roomRef.current = null;
      setConnected(false);
      setMessage("اتصال یا دسترسی میکروفن و دوربین برقرار نشد؛ مجوز مرورگر و شبکه را بررسی کنید.");
    } finally {
      setBusy(false);
    }
  }

  function leave() {
    roomRef.current?.disconnect();
    roomRef.current = null;
    localRef.current?.replaceChildren();
    remoteRef.current?.replaceChildren();
    setConnected(false);
    setMessage("از جلسه خارج شدید.");
  }

  return <section aria-label="تماس زندهٔ جلسه" className="space-y-3 rounded-xl border border-dena-lavender p-4">
    <h5 className="font-bold text-dena-deep">تماس زنده</h5>
    {!connected && <label className="flex items-start gap-2 text-sm leading-7 text-dena-muted">
      <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)}
        className="mt-2 size-4 accent-dena-brand" />
      <span>می‌دانم با ورود به جلسه، صدا و در صورت روشن‌بودن دوربین، تصویرم برای افراد حاضر در اتاق پخش می‌شود.</span>
    </label>}
    <div className="grid gap-3 sm:grid-cols-2" aria-live="polite">
      <div ref={localRef} aria-label="تصویر شما" className="flex min-h-24 flex-wrap gap-2" />
      <div ref={remoteRef} aria-label="تصویر افراد حاضر در جلسه" className="flex min-h-24 flex-wrap gap-2" />
    </div>
    <div className="flex flex-wrap gap-2">
      {!connected ? <button type="button" onClick={() => void join()} disabled={!confirmed || busy}
        className="min-h-11 rounded-lg bg-dena-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
        {busy ? "در حال اتصال…" : "ورود به جلسه و روشن‌کردن دوربین و میکروفن"}
      </button> : <button type="button" onClick={leave}
        className="min-h-11 rounded-lg border border-dena-line px-4 py-2 text-sm font-bold text-dena-deep">
        خروج از جلسه
      </button>}
    </div>
    {message && <p role="status" className="text-sm leading-6 text-dena-muted">{message}</p>}
    <p className="text-xs leading-6 text-dena-muted">این رابط ضبط جلسه یا اشتراک‌گذاری صفحه را فعال نمی‌کند.</p>
  </section>;
}
