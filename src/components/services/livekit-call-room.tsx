"use client";

import { ConnectionState, Room, RoomEvent, VideoPresets } from "livekit-client";
import { useEffect, useRef, useState } from "react";

type Props = { callId: string };

export function LiveKitCallRoom({ callId }: Props) {
  const roomRef = useRef<Room | null>(null);
  const localRef = useRef<HTMLDivElement>(null);
  const remoteRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const [deviceCheck, setDeviceCheck] = useState<"idle" | "checking" | "ready" | "audio_only" | "failed">("idle");
  const [confirmed, setConfirmed] = useState(false);
  const [connected, setConnected] = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [endConfirm, setEndConfirm] = useState(false);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [audioOnly, setAudioOnly] = useState(false);
  const [connectionLabel, setConnectionLabel] = useState("آمادهٔ ورود");
  const [connectedAt, setConnectedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [message, setMessage] = useState("");
  const [showJoinConsent, setShowJoinConsent] = useState(false);
  const [speakerCheck, setSpeakerCheck] = useState<"idle" | "ready" | "failed">("idle");
  const [networkState, setNetworkState] = useState<"unknown" | "online" | "offline">("unknown");

  useEffect(() => () => {
    roomRef.current?.disconnect();
    roomRef.current = null;
    previewStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    if (!connectedAt) return;
    const update = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - connectedAt) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [connectedAt]);

  useEffect(() => {
    const update = () => setNetworkState(navigator.onLine ? "online" : "offline");
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);

  function attachLocalVideo(room: Room) {
    localRef.current?.replaceChildren();
    for (const publication of room.localParticipant.videoTrackPublications.values()) {
      if (!publication.track || !localRef.current) continue;
      const element = publication.track.attach() as HTMLVideoElement;
      element.className = "absolute inset-0 h-full w-full rounded-xl object-cover";
      element.muted = true;
      element.playsInline = true;
      localRef.current.appendChild(element);
    }
  }

  function formatElapsed(seconds: number) {
    return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
  }

  async function checkDevices() {
    if (busy || connected) return;
    setBusy(true);
    setDeviceCheck("checking");
    setMessage("");
    previewStreamRef.current?.getTracks().forEach((track) => track.stop());
    previewStreamRef.current = null;
    if (previewRef.current) previewRef.current.srcObject = null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: !audioOnly });
      previewStreamRef.current = stream;
      if (previewRef.current && !audioOnly) {
        previewRef.current.srcObject = stream;
        await previewRef.current.play().catch(() => undefined);
      }
      setDeviceCheck("ready");
      setMessage(audioOnly ? "میکروفن آماده است؛ می‌توانید با صدا وارد شوید." : "میکروفن و دوربین آماده‌اند. پیش‌نمایش فقط روی دستگاه شماست.");
    } catch {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        previewStreamRef.current = stream;
        setDeviceCheck("audio_only");
        setMessage("میکروفن آماده است؛ دوربین در دسترس نیست. می‌توانید جلسه را فقط با صدا ادامه دهید.");
      } catch {
        setDeviceCheck("failed");
        setMessage("دسترسی به میکروفن برقرار نشد؛ مجوز مرورگر و اتصال دستگاه را بررسی کنید.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function testSpeaker() {
    if (busy) return;
    try {
      const AudioContextConstructor = window.AudioContext;
      if (!AudioContextConstructor) throw new Error("Audio output testing is unavailable");
      const context = new AudioContextConstructor();
      await context.resume();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 660;
      gain.gain.value = 0.06;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.18);
      oscillator.onended = () => { void context.close(); };
      setSpeakerCheck("ready");
      setMessage("صدای کوتاه آزمون بلندگو پخش شد.");
    } catch {
      setSpeakerCheck("failed");
      setMessage("آزمون بلندگو اجرا نشد؛ خروجی صدای دستگاه را بررسی کنید.");
    }
  }

  async function join() {
    if (!confirmed || busy || connected) return;
    previewStreamRef.current?.getTracks().forEach((track) => track.stop());
    previewStreamRef.current = null;
    if (previewRef.current) previewRef.current.srcObject = null;
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
      room.on(RoomEvent.ParticipantConnected, () => setRemoteConnected(true));
      room.on(RoomEvent.ParticipantDisconnected, () => setRemoteConnected(false));
      room.on(RoomEvent.TrackSubscribed, (track) => {
        const element = track.attach();
        element.className = track.kind === "video"
          ? "absolute inset-0 h-full w-full rounded-xl object-cover"
          : "sr-only";
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
        setRemoteConnected(false);
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

  return <section aria-label="تماس زندهٔ جلسه" className="space-y-3">
    {!connected && <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-lg border-r-[3px] border-amber-600 bg-amber-50 p-3.5">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold text-amber-800">ضبط پیش‌فرض غیرفعال است</p>
          <p className="mt-1 text-[11px] leading-5 text-dena-deep">این جلسه ضبط نمی‌شود.</p>
        </div>
        <svg viewBox="0 0 24 24" fill="none" className="size-[18px] shrink-0 text-amber-700" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" /><path d="m5 5 14 14" />
        </svg>
      </div>

      <div className="relative flex h-[190px] flex-col justify-between overflow-hidden rounded-[14px] bg-[#17132b] p-[14px] text-white">
        <button type="button" onClick={() => void checkDevices()} disabled={busy}
          className="z-10 w-fit rounded-full bg-dena-bg px-2.5 py-1 text-[11px] font-bold text-dena-muted disabled:opacity-60">
          {deviceCheck === "checking" ? "در حال بررسی…" : deviceCheck === "ready" ? "پیش‌نمایش شما · آماده" : "پیش‌نمایش شما"}
        </button>
        <div className={`absolute inset-0 flex items-center justify-center ${deviceCheck === "ready" && !audioOnly ? "opacity-0" : ""}`}>
          <span className="grid size-[58px] place-items-center rounded-full bg-dena-brand text-xl font-bold">ش</span>
        </div>
        <video ref={previewRef} muted playsInline aria-label="پیش‌نمایش دوربین شما"
          className={`absolute inset-0 h-full w-full object-cover ${deviceCheck === "ready" && !audioOnly ? "opacity-100" : "opacity-0"}`} />
        <div className="z-10 flex justify-center gap-2">
          <button type="button" onClick={() => void checkDevices()} disabled={busy} aria-label="آزمون میکروفن"
            className="grid size-7 place-items-center text-white disabled:opacity-50">
            <svg viewBox="0 0 24 24" fill="none" className="size-[18px]" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8" /></svg>
          </button>
          <button type="button" onClick={() => { previewStreamRef.current?.getTracks().forEach((track) => track.stop()); previewStreamRef.current = null; if (previewRef.current) previewRef.current.srcObject = null; setDeviceCheck("idle"); setAudioOnly((value) => !value); }} disabled={busy} aria-label={audioOnly ? "فعال‌کردن دوربین" : "ورود فقط با صدا"}
            className={`grid size-7 place-items-center disabled:opacity-50 ${audioOnly ? "text-amber-200" : "text-white"}`}>
            <svg viewBox="0 0 24 24" fill="none" className="size-[18px]" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="13" height="14" rx="2" /><path d="m16 10 5-3v10l-5-3" /></svg>
          </button>
        </div>
      </div>

      <div className="space-y-2" aria-live="polite">
        <div className="flex min-h-[47px] items-center justify-between rounded-lg border border-dena-border bg-white p-2.5">
          <StatusBadge state={deviceCheck === "ready" ? "ready" : deviceCheck === "failed" || deviceCheck === "audio_only" ? "failed" : "pending"} />
          <span className="text-[10px] text-dena-deep">دوربین: {audioOnly ? "فقط صدا انتخاب شده" : deviceCheck === "ready" ? "آماده" : deviceCheck === "failed" ? "در دسترس نیست" : "بررسی‌نشده"}</span>
        </div>
        <div className="flex min-h-[47px] items-center justify-between rounded-lg border border-dena-border bg-white p-2.5">
          <StatusBadge state={deviceCheck === "ready" || deviceCheck === "audio_only" ? "ready" : deviceCheck === "failed" ? "failed" : "pending"} />
          <span className="text-[10px] text-dena-deep">میکروفن: {deviceCheck === "ready" || deviceCheck === "audio_only" ? "آماده" : deviceCheck === "failed" ? "در دسترس نیست" : "بررسی‌نشده"}</span>
        </div>
        <div className="flex min-h-[47px] items-center justify-between rounded-lg border border-dena-border bg-white p-2.5">
          <button type="button" onClick={() => void testSpeaker()} disabled={busy}
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold disabled:opacity-50 ${speakerCheck === "ready" ? "bg-emerald-100 text-emerald-800" : speakerCheck === "failed" ? "bg-rose-100 text-rose-800" : "bg-dena-bg text-dena-muted"}`}>
            {speakerCheck === "ready" ? "تأیید" : speakerCheck === "failed" ? "ناموفق" : "آزمون"}
          </button>
          <span className="text-[10px] text-dena-deep">بلندگو: {speakerCheck === "ready" ? "آزموده شد" : speakerCheck === "failed" ? "آزمون ناموفق" : "برای آزمون بزنید"}</span>
        </div>
        <div className="flex min-h-[47px] items-center justify-between rounded-lg border border-dena-border bg-white p-2.5">
          <StatusBadge state={networkState === "online" ? "ready" : networkState === "offline" ? "failed" : "pending"} />
          <span className="text-[10px] text-dena-deep">اتصال: {networkState === "online" ? "آنلاین" : networkState === "offline" ? "قطع است" : "در حال بررسی"}</span>
        </div>
      </div>

      <button type="button" onClick={() => confirmed ? void join() : setShowJoinConsent(true)} disabled={busy}
        className="flex h-12 w-full items-center justify-center rounded-xl bg-dena-brand px-6 py-3 text-sm font-bold text-white disabled:opacity-50">
        {busy ? "در حال اتصال…" : "شروع مسیر"}
      </button>
      {message && <p role="status" className="text-xs leading-6 text-dena-muted">{message}</p>}
      <p className="text-[11px] leading-5 text-dena-muted">با ورود، صدا و در صورت روشن‌بودن دوربین، تصویر برای افراد حاضر در اتاق پخش می‌شود. ضبط و اشتراک‌گذاری صفحه فعال نیست.</p>
      {showJoinConsent && <div role="alertdialog" aria-modal="true" aria-labelledby={`join-consent-title-${callId}`} className="space-y-3 rounded-xl border border-dena-border bg-white p-4 shadow-lg">
        <h5 id={`join-consent-title-${callId}`} className="text-sm font-extrabold text-dena-deep">پیش از ورود به جلسه</h5>
        <label className="flex items-start gap-2 text-xs leading-6 text-dena-muted">
          <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 size-4 accent-dena-brand" />
          <span>می‌دانم با ورود، صدا و در صورت روشن‌بودن دوربین، تصویرم برای افراد حاضر در جلسه پخش می‌شود.</span>
        </label>
        <div className="flex gap-2">
          <button type="button" onClick={() => setShowJoinConsent(false)} className="min-h-10 flex-1 rounded-lg border border-dena-line px-3 py-2 text-xs font-bold text-dena-deep">بازگشت</button>
          <button type="button" onClick={() => { setShowJoinConsent(false); void join(); }} disabled={!confirmed || busy} className="min-h-10 flex-1 rounded-lg bg-dena-brand px-3 py-2 text-xs font-bold text-white disabled:opacity-50">تأیید و ورود</button>
        </div>
      </div>}
    </div>}

    {connected && <div className="overflow-hidden rounded-[14px] bg-[#17132b] p-3 text-white sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-sm font-extrabold">جلسهٔ مشاوره در دنا</p><p className="mt-1 text-xs text-white/60">تماس امن در همین محیط</p></div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${connectionLabel === "متصل" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{connectionLabel}</span>
          <span dir="ltr" className="font-mono text-xs text-white/80">{formatElapsed(elapsedSeconds)}</span>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2" aria-live="polite">
        <div className="relative aspect-video min-h-40 overflow-hidden rounded-xl bg-[#302951]">
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-dena-brand text-xl font-bold">ش</span>
            <span className="text-xs font-semibold">شما · {cameraEnabled ? "تصویر روشن" : "دوربین خاموش"}</span>
          </div>
          <div ref={localRef} aria-label="تصویر شما" className="absolute inset-0 overflow-hidden rounded-xl" />
          <span className="absolute start-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-dena-deep">شما</span>
        </div>
        <div className="relative aspect-video min-h-40 overflow-hidden rounded-xl bg-[#302951]">
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-emerald-400 text-xl font-bold text-[#17132a]">م</span>
            <span className="text-xs font-semibold">مشاور · {remoteConnected ? "متصل" : "در انتظار اتصال مجدد"}</span>
          </div>
          <div ref={remoteRef} aria-label="تصویر افراد حاضر در جلسه" className="absolute inset-0 overflow-hidden rounded-xl" />
          <span className="absolute start-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-dena-deep">مشاور</span>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => void toggleMicrophone()} disabled={busy}
          aria-label={microphoneEnabled ? "خاموش‌کردن میکروفن" : "روشن‌کردن میکروفن"} aria-pressed={microphoneEnabled}
          className={`grid size-12 place-items-center rounded-full text-xs font-bold disabled:opacity-50 ${microphoneEnabled ? "bg-white/15 text-white" : "bg-red-500 text-white"}`}>
          {microphoneEnabled ? "میکروفن" : "بی‌صدا"}
        </button>
        <button type="button" onClick={() => void toggleCamera()} disabled={busy}
          aria-label={cameraEnabled ? "خاموش‌کردن دوربین" : "روشن‌کردن دوربین"} aria-pressed={cameraEnabled}
          className={`grid size-12 place-items-center rounded-full text-xs font-bold disabled:opacity-50 ${cameraEnabled ? "bg-white/15 text-white" : "bg-red-500 text-white"}`}>
          {cameraEnabled ? "دوربین" : "بدون تصویر"}
        </button>
        <button type="button" onClick={() => setEndConfirm(true)} className="grid size-12 place-items-center rounded-full bg-red-600 text-xs font-bold text-white">پایان</button>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <p className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs">وضعیت اتصال: {connectionLabel}</p>
        <p className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs">میکروفن: {microphoneEnabled ? "روشن" : "خاموش"}</p>
        <p className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs">دوربین: {cameraEnabled ? "روشن" : "خاموش"}</p>
      </div>
      {message && <p role="status" className="mt-3 text-sm leading-6 text-white/80">{message}</p>}
    </div>}
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
  </section>;
}

function StatusBadge({ state }: { state: "ready" | "failed" | "pending" }) {
  const label = state === "ready" ? "تأیید" : state === "failed" ? "خطا" : "بررسی‌نشده";
  const style = state === "ready" ? "bg-[#d9f8ef] text-[#24886b]" : state === "failed" ? "bg-rose-100 text-rose-800" : "bg-dena-bg text-dena-muted";
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${style}`}>{label}</span>;
}
