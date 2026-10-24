"use client";

import { ConnectionState, Room, RoomEvent, VideoPresets } from "livekit-client";
import { useEffect, useRef, useState } from "react";

type Props = { callId: string };

export function LiveKitCallRoom({ callId }: Props) {
  const roomRef = useRef<Room | null>(null);
  const localRef = useRef<HTMLDivElement>(null);
  const remoteRef = useRef<HTMLDivElement>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [endConfirm, setEndConfirm] = useState(false);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [audioOnly, setAudioOnly] = useState(false);
  const [connectionLabel, setConnectionLabel] = useState("آمادهٔ ورود");
  const [connectedAt, setConnectedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => () => {
    roomRef.current?.disconnect();
    roomRef.current = null;
  }, []);

  useEffect(() => {
    if (!connectedAt) return;
    const update = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - connectedAt) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [connectedAt]);

  function attachLocalVideo(room: Room) {
    localRef.current?.replaceChildren();
    for (const publication of room.localParticipant.videoTrackPublications.values()) {
      if (!publication.track || !localRef.current) continue;
      const element = publication.track.attach() as HTMLVideoElement;
      element.className = "max-h-72 max-w-full rounded-xl bg-black object-contain";
      element.muted = true;
      element.playsInline = true;
      localRef.current.appendChild(element);
    }
  }

  function formatElapsed(seconds: number) {
    return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
  }

  async function join() {
    if (!confirmed || busy || connected) return;
    setBusy(true);
    setMessage("");
    let cameraFallback = false;
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
      room.on(RoomEvent.Reconnecting, () => setConnectionLabel("در حال اتصال مجدد…"));
      room.on(RoomEvent.Reconnected, () => setConnectionLabel("متصل"));
      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        if (state === ConnectionState.Connected) setConnectionLabel("متصل");
        if (state === ConnectionState.Disconnected) setConnectionLabel("ارتباط قطع شد");
      });
      room.on(RoomEvent.Disconnected, () => {
        setConnected(false);
        setMicrophoneEnabled(false);
        setCameraEnabled(false);
        setConnectedAt(null);
        localRef.current?.replaceChildren();
        remoteRef.current?.replaceChildren();
        if (roomRef.current === room) roomRef.current = null;
      });
      await room.connect(credentials.url, credentials.token);
      await room.localParticipant.setMicrophoneEnabled(true);
      setMicrophoneEnabled(true);
      if (!audioOnly) {
        try {
          await room.localParticipant.setCameraEnabled(true, {
            resolution: VideoPresets.h360.resolution,
          });
          setCameraEnabled(true);
          attachLocalVideo(room);
        } catch {
          setCameraEnabled(false);
          cameraFallback = true;
        }
      }
      setConnected(true);
      setConnectedAt(Date.now());
      setConnectionLabel("متصل");
      setMessage(cameraFallback
        ? "دوربین در دسترس نبود؛ جلسه با صدا ادامه پیدا می‌کند."
        : audioOnly ? "با صدا به جلسه متصل شدید." : "به جلسه متصل شدید.");
    } catch {
      roomRef.current?.disconnect();
      roomRef.current = null;
      setConnected(false);
      setConnectionLabel("اتصال برقرار نشد");
      setMessage("اتصال برقرار نشد یا اجازهٔ میکروفن داده نشد؛ مجوز مرورگر و شبکه را بررسی کنید. می‌توانید جلسه را فقط با صدا امتحان کنید.");
    } finally {
      setBusy(false);
    }
  }

  async function endCall() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/student/service-calls/${encodeURIComponent(callId)}/end`, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) {
        setMessage(response.status === 503
          ? "پایان تماس ثبت شد، اما بستن اتاق تماس تأیید نشد. دوباره تلاش کنید."
          : "پایان تماس انجام نشد؛ ممکن است جلسه قبلاً پایان یافته باشد.");
        return;
      }
      roomRef.current?.disconnect();
      roomRef.current = null;
      localRef.current?.replaceChildren();
      remoteRef.current?.replaceChildren();
      setConnected(false);
      setMicrophoneEnabled(false);
      setCameraEnabled(false);
      setConnectedAt(null);
      setElapsedSeconds(0);
      setEndConfirm(false);
      setConnectionLabel("جلسه پایان یافت");
      setMessage("جلسه برای هر دو طرف پایان یافت.");
    } catch {
      setMessage("ارتباط برقرار نشد؛ جلسه هنوز پایان‌یافته اعلام نشده است.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleMicrophone() {
    const room = roomRef.current;
    if (!room || busy) return;
    setBusy(true);
    try {
      await room.localParticipant.setMicrophoneEnabled(!microphoneEnabled);
      setMicrophoneEnabled(!microphoneEnabled);
      setMessage(!microphoneEnabled ? "میکروفن روشن شد." : "میکروفن خاموش شد.");
    } catch {
      setMessage("تغییر وضعیت میکروفن انجام نشد؛ مجوز مرورگر را بررسی کنید.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleCamera() {
    const room = roomRef.current;
    if (!room || busy) return;
    setBusy(true);
    try {
      await room.localParticipant.setCameraEnabled(!cameraEnabled, {
        resolution: VideoPresets.h360.resolution,
      });
      setCameraEnabled(!cameraEnabled);
      attachLocalVideo(room);
      setMessage(!cameraEnabled ? "دوربین روشن شد." : "دوربین خاموش شد.");
    } catch {
      setMessage("تغییر وضعیت دوربین انجام نشد؛ دستگاه و مجوز مرورگر را بررسی کنید.");
    } finally {
      setBusy(false);
    }
  }

  return <section aria-label="تماس زندهٔ جلسه" className="space-y-3 rounded-xl border border-dena-lavender p-4">
    <h5 className="font-bold text-dena-deep">تماس زنده</h5>
    {!connected && <label className="flex items-start gap-2 text-sm leading-7 text-dena-muted">
      <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)}
        className="mt-2 size-4 accent-dena-brand" />
      <span>می‌دانم با ورود به جلسه، صدا و در صورت روشن‌بودن دوربین، تصویرم برای افراد حاضر در اتاق پخش می‌شود.</span>
    </label>}
    {!connected && <label className="flex items-center gap-2 text-sm text-dena-deep">
      <input type="checkbox" checked={audioOnly} onChange={(event) => setAudioOnly(event.target.checked)}
        disabled={busy} className="size-4 accent-dena-brand" />
      <span>ورود فقط با صدا</span>
    </label>}
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-dena-bg px-3 py-2 text-sm" aria-live="polite">
      <span className="font-bold text-dena-deep">{connectionLabel}</span>
      {connected && <span dir="ltr" className="font-mono text-dena-muted">{formatElapsed(elapsedSeconds)}</span>}
    </div>
    <div className="grid gap-3 sm:grid-cols-2" aria-live="polite">
      <div ref={localRef} aria-label="تصویر شما" className="flex min-h-24 flex-wrap gap-2" />
      <div ref={remoteRef} aria-label="تصویر افراد حاضر در جلسه" className="flex min-h-24 flex-wrap gap-2" />
    </div>
    <div className="flex flex-wrap gap-2">
      {!connected ? <button type="button" onClick={() => void join()} disabled={!confirmed || busy}
        className="min-h-11 rounded-lg bg-dena-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
        {busy ? "در حال اتصال…" : audioOnly ? "ورود به جلسه با صدا" : "ورود به جلسه"}
      </button> : <>
        <button type="button" onClick={() => void toggleMicrophone()} disabled={busy}
          aria-label={microphoneEnabled ? "خاموش‌کردن میکروفن" : "روشن‌کردن میکروفن"}
          aria-pressed={microphoneEnabled}
          className="min-h-11 rounded-lg border border-dena-line px-4 py-2 text-sm font-bold text-dena-deep disabled:opacity-50">
          {microphoneEnabled ? "خاموش‌کردن میکروفن" : "روشن‌کردن میکروفن"}
        </button>
        <button type="button" onClick={() => void toggleCamera()} disabled={busy}
          aria-label={cameraEnabled ? "خاموش‌کردن دوربین" : "روشن‌کردن دوربین"}
          aria-pressed={cameraEnabled}
          className="min-h-11 rounded-lg border border-dena-line px-4 py-2 text-sm font-bold text-dena-deep disabled:opacity-50">
          {cameraEnabled ? "خاموش‌کردن دوربین" : "روشن‌کردن دوربین"}
        </button>
        <button type="button" onClick={() => setEndConfirm(true)}
          className="min-h-11 rounded-lg border border-dena-line px-4 py-2 text-sm font-bold text-dena-deep">
          پایان جلسه
        </button>
      </>}
    </div>
    {connected && endConfirm && <div role="alertdialog" aria-labelledby={`end-call-title-${callId}`}
      aria-describedby={`end-call-description-${callId}`} className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
      <h6 id={`end-call-title-${callId}`} className="font-bold text-dena-deep">پایان جلسه برای هر دو نفر؟</h6>
      <p id={`end-call-description-${callId}`} className="text-sm leading-6 text-dena-muted">
        با تأیید، تماس برای شما و مشاور بسته می‌شود. پیام‌ها و اطلاعات درخواست خدمت باقی می‌مانند.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setEndConfirm(false)} disabled={busy}
          className="min-h-10 rounded-lg border border-dena-line bg-white px-4 py-2 text-sm font-bold text-dena-deep disabled:opacity-50">
          بازگشت به جلسه
        </button>
        <button type="button" onClick={() => void endCall()} disabled={busy}
          className="min-h-10 rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
          {busy ? "در حال پایان جلسه…" : "تأیید پایان جلسه"}
        </button>
      </div>
    </div>}
    {message && <p role="status" className="text-sm leading-6 text-dena-muted">{message}</p>}
    <p className="text-xs leading-6 text-dena-muted">این رابط ضبط جلسه یا اشتراک‌گذاری صفحه را فعال نمی‌کند.</p>
  </section>;
}
