"use client";

import { ConnectionState, Room, RoomEvent, VideoPresets } from "livekit-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = { callId: string; messageHref?: string };

export function LiveKitCallRoom({ callId, messageHref }: Props) {
  const router = useRouter();
  const roomRef = useRef<Room | null>(null);
  const activeCallRef = useRef(false);
  const localRef = useRef<HTMLDivElement>(null);
  const remoteRef = useRef<HTMLDivElement>(null);
  const mobileRemoteRef = useRef<HTMLDivElement>(null);
  const remoteAudioRef = useRef<HTMLDivElement>(null);
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
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectFailed, setReconnectFailed] = useState(false);
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

  const attachRemoteVideoTracks = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    for (const participant of room.remoteParticipants.values()) {
      for (const publication of participant.videoTrackPublications.values()) {
        const track = publication.track;
        if (!track) continue;
        for (const container of [remoteRef.current, mobileRemoteRef.current]) {
          if (!container || container.childElementCount > 0) continue;
          const element = track.attach() as HTMLVideoElement;
          element.className = "absolute inset-0 h-full w-full object-cover";
          element.playsInline = true;
          container.appendChild(element);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (connected) attachRemoteVideoTracks();
  }, [connected, attachRemoteVideoTracks]);

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

  async function join(options: { retry?: boolean; audioOnly?: boolean } = {}) {
    if (!confirmed || busy || (connected && !options.retry)) return;
    const joinAudioOnly = options.audioOnly ?? audioOnly;
    setReconnectFailed(false);
    setReconnecting(Boolean(options.retry));
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
        if (options.retry) {
          setReconnectFailed(true);
          setReconnecting(false);
        }
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
        if (track.kind === "video") {
          attachRemoteVideoTracks();
          return;
        }
        const element = track.attach();
        element.className = "sr-only";
        remoteAudioRef.current?.appendChild(element);
      });
      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((element) => element.remove());
      });
      room.on(RoomEvent.Reconnecting, () => {
        setReconnectFailed(false);
        setReconnecting(true);
        setConnectionLabel("در حال اتصال مجدد…");
      });
      room.on(RoomEvent.Reconnected, () => {
        activeCallRef.current = true;
        setConnected(true);
        setReconnectFailed(false);
        setReconnecting(false);
        setConnectionLabel("متصل");
      });
      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        if (state === ConnectionState.Connected) setConnectionLabel("متصل");
        if (state === ConnectionState.Disconnected) setConnectionLabel("ارتباط قطع شد");
      });
      room.on(RoomEvent.Disconnected, () => {
        if (roomRef.current !== room) return;
        const wasActive = activeCallRef.current;
        activeCallRef.current = false;
        setConnected(false);
        setReconnecting(false);
        if (wasActive) {
          setReconnectFailed(true);
          setConnectionLabel("اتصال قطع شد");
        }
        setRemoteConnected(false);
        setMicrophoneEnabled(false);
        setCameraEnabled(false);
        localRef.current?.replaceChildren();
        remoteRef.current?.replaceChildren();
        mobileRemoteRef.current?.replaceChildren();
        remoteAudioRef.current?.replaceChildren();
        if (roomRef.current === room) roomRef.current = null;
      });
      await room.connect(credentials.url, credentials.token);
      await room.localParticipant.setMicrophoneEnabled(true);
      setMicrophoneEnabled(true);
      if (!joinAudioOnly) {
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
      activeCallRef.current = true;
      setConnected(true);
      setConnectedAt((current) => current ?? Date.now());
      setReconnectFailed(false);
      setReconnecting(false);
      setConnectionLabel("متصل");
      setMessage(cameraFallback
        ? "دوربین در دسترس نبود؛ جلسه با صدا ادامه پیدا می‌کند."
        : joinAudioOnly ? "با صدا به جلسه متصل شدید." : "به جلسه متصل شدید.");
    } catch {
      activeCallRef.current = false;
      roomRef.current?.disconnect();
      roomRef.current = null;
      setConnected(false);
      setReconnecting(false);
      setReconnectFailed(true);
      setConnectionLabel("اتصال برقرار نشد");
      setMessage("اتصال برقرار نشد یا اجازهٔ میکروفن داده نشد؛ مجوز مرورگر و شبکه را بررسی کنید. می‌توانید جلسه را فقط با صدا امتحان کنید.");
    } finally {
      setBusy(false);
    }
  }

  function retryConnection(onlyAudio: boolean) {
    const previousRoom = roomRef.current;
    roomRef.current = null;
    activeCallRef.current = false;
    previousRoom?.disconnect();
    setAudioOnly(onlyAudio);
    setConnected(false);
    setReconnectFailed(false);
    setReconnecting(true);
    setConnectionLabel("در حال اتصال مجدد…");
    void join({ retry: true, audioOnly: onlyAudio });
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
      activeCallRef.current = false;
      roomRef.current?.disconnect();
      roomRef.current = null;
      localRef.current?.replaceChildren();
      remoteRef.current?.replaceChildren();
      mobileRemoteRef.current?.replaceChildren();
      remoteAudioRef.current?.replaceChildren();
      setConnected(false);
      setReconnectFailed(false);
      setReconnecting(false);
      setMicrophoneEnabled(false);
      setCameraEnabled(false);
      setConnectedAt(null);
      setElapsedSeconds(0);
      setEndConfirm(false);
      router.refresh();
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
    {(reconnecting || reconnectFailed) && <div className="flex h-[430px] flex-col items-center rounded-[16px] bg-[#17132b] px-5 py-8 text-center text-white">
      <div className="grid size-16 place-items-center rounded-full bg-[#3a2436] text-[#f26c70]">
        <svg viewBox="0 0 24 24" fill="none" className="size-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 8.8a15 15 0 0 1 17.4-3.1M5 12a10 10 0 0 1 7.6-2.4M8.5 15.4a5 5 0 0 1 4.2-.8M2 2l20 20" /><path d="M12 19h.01" /></svg>
      </div>
      <h3 className="mt-5 text-lg font-extrabold">اتصال قطع شد</h3>
      <p className="mt-2 max-w-[280px] text-xs leading-6 text-white/70">پیام‌ها و فایل‌ها محفوظ‌اند. دوباره تلاش کنید.</p>
      <span className="mt-5 rounded-full bg-[#4b3822] px-3 py-1.5 text-[11px] font-bold text-[#f3c26b]" aria-live="polite">
        {busy ? "در حال تلاش مجدد…" : reconnecting ? "در حال اتصال مجدد…" : "ارتباط برقرار نشد"}
      </span>
      <div className="mt-auto grid w-full gap-2 pt-6">
        <button type="button" onClick={() => retryConnection(false)} disabled={busy} className="h-12 rounded-xl bg-dena-brand text-sm font-bold text-white disabled:opacity-50">شروع مسیر</button>
        <button type="button" onClick={() => retryConnection(true)} disabled={busy} className="h-12 rounded-xl border border-white/20 bg-white/[0.04] text-sm font-bold text-white disabled:opacity-50">ادامه فقط با صدا</button>
      </div>
    </div>}

    {!connected && !reconnecting && !reconnectFailed && <div className="space-y-3">
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

    {connected && !reconnecting && !reconnectFailed && <div className="relative h-[500px] overflow-hidden rounded-2xl bg-[#17132b] p-[14px] text-white md:hidden">
      <div className="absolute inset-0" ref={mobileRemoteRef} aria-label="تصویر مشاور" />
      <div className="relative z-10 flex items-center justify-between">
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${connectionLabel === "متصل" ? "bg-[#d9f8ef] text-[#24886b]" : "bg-amber-100 text-amber-900"}`}>{connectionLabel}</span>
        <span dir="ltr" className="font-mono text-[10px] text-[#d8d5e4]">{formatElapsed(elapsedSeconds)}</span>
      </div>
      <div className="absolute inset-x-4 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-2 text-center">
        <span className="grid size-[90px] place-items-center rounded-full bg-[#3ac9a1] text-3xl font-extrabold text-[#17132b]">م</span>
        <p className="text-xs font-bold">مشاور مؤسسه</p>
        <p className="text-[9px] text-[#d8d5e4]">{remoteConnected ? "متصل" : "مشاور تخصیص‌یافته"}</p>
      </div>
      <div className="absolute inset-x-[14px] bottom-[14px] z-20 flex items-center justify-center gap-4">
        <button type="button" onClick={() => void toggleMicrophone()} disabled={busy}
          aria-label={microphoneEnabled ? "خاموش‌کردن میکروفن" : "روشن‌کردن میکروفن"} aria-pressed={microphoneEnabled}
          className={`grid size-[42px] place-items-center rounded-full disabled:opacity-50 ${microphoneEnabled ? "bg-white/[0.14] text-white" : "bg-red-500 text-white"}`}>
          <svg viewBox="0 0 24 24" fill="none" className="size-[18px]" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8" /></svg>
        </button>
        <button type="button" onClick={() => void toggleCamera()} disabled={busy}
          aria-label={cameraEnabled ? "خاموش‌کردن دوربین" : "روشن‌کردن دوربین"} aria-pressed={cameraEnabled}
          className={`grid size-[42px] place-items-center rounded-full disabled:opacity-50 ${cameraEnabled ? "bg-white/[0.14] text-white" : "bg-white/[0.14] text-white"}`}>
          <svg viewBox="0 0 24 24" fill="none" className="size-[18px]" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="13" height="14" rx="2" /><path d="m16 10 5-3v10l-5-3" /></svg>
        </button>
        {messageHref && <Link href={messageHref} aria-label="پیام مشاور" className="grid size-[42px] place-items-center rounded-full bg-white/[0.14] text-white">
          <svg viewBox="0 0 24 24" fill="none" className="size-[18px]" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" /></svg>
        </Link>}
        <button type="button" onClick={() => setEndConfirm(true)} aria-label="پایان تماس"
          className="grid size-[42px] place-items-center rounded-full bg-[#ef4444] text-white">
          <svg viewBox="0 0 24 24" fill="none" className="size-[18px]" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.5 2.7a2 2 0 0 1-.6 1.8L7.7 9.5a16 16 0 0 0 6.8 6.8l1.3-1.3a2 2 0 0 1 1.8-.6l2.7.5a2 2 0 0 1 1.7 2z" /><path d="m4 4 16 16" /></svg>
        </button>
      </div>
    </div>}

    {connected && !reconnecting && !reconnectFailed && <div className="hidden overflow-hidden rounded-[14px] bg-[#17132b] p-3 text-white sm:p-5 md:block">
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
    <div ref={remoteAudioRef} className="sr-only" aria-hidden="true" />
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
