import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Mic, Square, Trash2, Upload, Loader2, FileAudio, Users, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

interface Submission {
  id: string;
  storage_path: string;
  duration_seconds: number;
  file_size_bytes: number;
  created_at: string;
  student_user_id?: string;
  signed_url?: string;
  student_name?: string;
}

const MAX_SECONDS = 300; // 5 min cap per recording
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB hard cap
const MAX_UPLOAD_INPUT = 50 * 1024 * 1024; // 50 MB before-compression cap

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}
function fmtSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

// Decode any browser-supported audio file, downmix to mono @ 22.05kHz,
// re-encode to opus/webm via MediaRecorder. Typically shrinks files 5-15x.
async function compressAudio(file: Blob): Promise<{ blob: Blob; durationSec: number }> {
  type AC = typeof AudioContext;
  const Ctor: AC = (window.AudioContext || (window as unknown as { webkitAudioContext: AC }).webkitAudioContext);
  const decodeCtx = new Ctor();
  const buf = await file.arrayBuffer();
  const decoded = await decodeCtx.decodeAudioData(buf.slice(0));
  await decodeCtx.close();

  const targetRate = 22050;
  const length = Math.max(1, Math.ceil(decoded.duration * targetRate));
  const offline = new OfflineAudioContext(1, length, targetRate);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start();
  const rendered = await offline.startRendering();

  const playCtx = new Ctor({ sampleRate: targetRate });
  const dest = playCtx.createMediaStreamDestination();
  const playSrc = playCtx.createBufferSource();
  playSrc.buffer = rendered;
  playSrc.connect(dest);

  const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : MediaRecorder.isTypeSupported("audio/webm")
    ? "audio/webm"
    : "audio/mp4";
  const rec = new MediaRecorder(dest.stream, { mimeType: mime, audioBitsPerSecond: 32000 });
  const chunks: BlobPart[] = [];

  return new Promise((resolve, reject) => {
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    rec.onerror = (e) => { void playCtx.close(); reject(e); };
    rec.onstop = () => {
      void playCtx.close();
      resolve({ blob: new Blob(chunks, { type: mime }), durationSec: Math.round(rendered.duration) });
    };
    playSrc.onended = () => { try { rec.stop(); } catch { /* ignore */ } };
    rec.start();
    playSrc.start();
  });
}

export function VoiceRecorder({ postId, authorUserId }: { postId: string; authorUserId?: string }) {
  const { user } = useAuth();
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [compressing, setCompressing] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allSubs, setAllSubs] = useState<Submission[] | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [allLoading, setAllLoading] = useState(false);

  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isAuthor = !!user && !!authorUserId && user.id === authorUserId;
  const canModerate = isAuthor || isAdmin;

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    void loadOwn();
    void checkAdmin();
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, postId]);

  async function checkAdmin() {
    if (!user) return;
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    setIsAdmin(!!data);
  }

  async function loadOwn() {
    setLoading(true);
    const { data, error } = await supabase
      .from("voice_submissions")
      .select("id,storage_path,duration_seconds,file_size_bytes,created_at,student_user_id")
      .eq("post_id", postId)
      .eq("student_user_id", user!.id)
      .order("created_at", { ascending: false });
    if (error) { toast.error(error.message); setLoading(false); return; }
    const withUrls = await Promise.all(
      (data ?? []).map(async (s) => {
        const { data: signed } = await supabase.storage.from("submissions").createSignedUrl(s.storage_path, 3600);
        return { ...s, signed_url: signed?.signedUrl };
      })
    );
    setSubmissions(withUrls);
    setLoading(false);
  }

  async function loadAll() {
    if (!canModerate) return;
    setAllLoading(true);
    const { data, error } = await supabase
      .from("voice_submissions")
      .select("id,storage_path,duration_seconds,file_size_bytes,created_at,student_user_id")
      .eq("post_id", postId)
      .order("created_at", { ascending: false });
    if (error) { toast.error(error.message); setAllLoading(false); return; }
    const ids = Array.from(new Set((data ?? []).map((d) => d.student_user_id)));
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("user_id,username,title,surname,othernames").in("user_id", ids)
      : { data: [] as Array<{ user_id: string; username: string; title: string; surname: string; othernames: string }> };
    const nameById = new Map((profs ?? []).map((p) => [p.user_id, [p.title, p.surname, p.othernames || p.username].filter(Boolean).join(" ").trim() || "Anonymous"]));
    const withUrls = await Promise.all(
      (data ?? []).map(async (s) => {
        const { data: signed } = await supabase.storage.from("submissions").createSignedUrl(s.storage_path, 3600);
        return { ...s, signed_url: signed?.signedUrl, student_name: nameById.get(s.student_user_id) || "Student" };
      })
    );
    setAllSubs(withUrls);
    setAllLoading(false);
  }

  function cleanup() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4"
        : "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 48000 } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const b = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        if (b.size > MAX_BYTES) { toast.error("Recording too large (max 10 MB)"); return; }
        setBlob(b);
        setPreviewUrl(URL.createObjectURL(b));
      };
      rec.start(1000);
      recRef.current = rec;
      setRecording(true);
      setElapsed(0);
      setBlob(null);
      if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(""); }
      timerRef.current = window.setInterval(() => {
        setElapsed((s) => {
          if (s + 1 >= MAX_SECONDS) { stopRecording(); return MAX_SECONDS; }
          return s + 1;
        });
      }, 1000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Microphone access denied";
      toast.error(msg);
    }
  }

  function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (recRef.current && recRef.current.state !== "inactive") recRef.current.stop();
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    setRecording(false);
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("audio/") && !/\.(mp3|m4a|wav|ogg|webm|aac|opus)$/i.test(file.name)) {
      return toast.error("Please pick an audio file");
    }
    if (file.size > MAX_UPLOAD_INPUT) return toast.error("File too large (max 50 MB)");
    setCompressing(true);
    try {
      const { blob: compressed, durationSec } = await compressAudio(file);
      if (compressed.size > MAX_BYTES) {
        toast.error("Compressed file still too large (max 10 MB). Try a shorter clip.");
      } else {
        setBlob(compressed);
        setElapsed(durationSec);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(compressed));
        toast.success(`Optimized: ${fmtSize(file.size)} → ${fmtSize(compressed.size)}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not process this audio file";
      toast.error(msg);
    } finally {
      setCompressing(false);
    }
  }

  function discard() {
    setBlob(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setElapsed(0);
  }

  async function upload() {
    if (!blob || !user) return;
    setUploading(true);
    setProgress(20);
    const ext = blob.type.includes("mp4") ? "m4a" : "webm";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const path = `${user.id}/voice/${postId}/${filename}`;
    const { error: upErr } = await supabase.storage
      .from("submissions")
      .upload(path, blob, { contentType: blob.type, upsert: false });
    if (upErr) { setUploading(false); setProgress(0); return toast.error(upErr.message); }
    setProgress(70);
    const { error: dbErr } = await supabase.from("voice_submissions").insert({
      post_id: postId,
      student_user_id: user.id,
      storage_path: path,
      duration_seconds: elapsed,
      file_size_bytes: blob.size,
      mime_type: blob.type || "audio/webm",
    });
    if (dbErr) {
      await supabase.storage.from("submissions").remove([path]);
      setUploading(false); setProgress(0);
      return toast.error(dbErr.message);
    }
    setProgress(100);
    toast.success("Recording submitted");
    discard();
    setUploading(false);
    setProgress(0);
    void loadOwn();
    if (showAll) void loadAll();
  }

  async function deleteSub(s: Submission, fromAll = false) {
    if (!confirm("Delete this recording?")) return;
    await supabase.storage.from("submissions").remove([s.storage_path]);
    const { error } = await supabase.from("voice_submissions").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    setSubmissions((xs) => xs.filter((x) => x.id !== s.id));
    if (fromAll) setAllSubs((xs) => (xs ?? []).filter((x) => x.id !== s.id));
  }

  if (!user) {
    return (
      <div className="mt-6 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
        <Link to="/login" className="font-medium text-primary underline">Sign in</Link> to record or upload your voice note for this lesson.
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-lg border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-medium">Submit a voice note</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Record in-app (up to 5 min) or upload from your phone. Files are auto-optimized so they upload fast and stay small. Only you, the lesson author, and admins can hear it.
          </p>
        </div>
        <Mic className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!recording && !blob && !compressing && (
          <>
            <Button onClick={startRecording} disabled={uploading}>
              <Mic className="h-4 w-4" /> Start recording
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <FileAudio className="h-4 w-4" /> Upload from device
            </Button>
            <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={onPickFile} />
          </>
        )}
        {compressing && (
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Optimizing audio…
          </span>
        )}
        {recording && (
          <>
            <Button variant="destructive" onClick={stopRecording}>
              <Square className="h-4 w-4" /> Stop
            </Button>
            <span className="inline-flex items-center gap-2 text-sm">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-destructive" />
              Recording… {fmtTime(elapsed)} / {fmtTime(MAX_SECONDS)}
            </span>
          </>
        )}
        {blob && !recording && (
          <>
            <audio src={previewUrl} controls className="h-9 max-w-full" />
            <Button onClick={upload} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Submit ({fmtSize(blob.size)})
            </Button>
            <Button variant="ghost" onClick={discard} disabled={uploading}>
              <Trash2 className="h-4 w-4" /> Discard
            </Button>
          </>
        )}
      </div>

      {uploading && <Progress value={progress} className="mt-3" />}

      <div className="mt-6">
        <h5 className="text-sm font-medium">Your submissions</h5>
        {loading ? (
          <p className="mt-2 text-xs text-muted-foreground">Loading…</p>
        ) : submissions.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">You haven't submitted any voice notes yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {submissions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-md border bg-background p-3">
                <audio src={s.signed_url} controls className="h-9 max-w-full" />
                <div className="flex-1 text-xs text-muted-foreground">
                  {fmtTime(s.duration_seconds)} · {fmtSize(s.file_size_bytes)} · {new Date(s.created_at).toLocaleString()}
                </div>
                <Button variant="ghost" size="sm" onClick={() => deleteSub(s)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {canModerate && (
        <div className="mt-6 border-t pt-4">
          <button
            type="button"
            onClick={() => {
              const next = !showAll;
              setShowAll(next);
              if (next && allSubs === null) void loadAll();
            }}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <Users className="h-4 w-4" />
            {isAuthor ? "All student submissions" : "All submissions (admin)"}
            {showAll ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showAll && (
            <div className="mt-3">
              {allLoading ? (
                <p className="text-xs text-muted-foreground">Loading…</p>
              ) : !allSubs || allSubs.length === 0 ? (
                <p className="text-xs text-muted-foreground">No submissions yet.</p>
              ) : (
                <ul className="space-y-2">
                  {allSubs.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-md border bg-background p-3">
                      <div className="w-full text-xs font-medium">{s.student_name}</div>
                      <audio src={s.signed_url} controls className="h-9 max-w-full" />
                      <div className="flex-1 text-xs text-muted-foreground">
                        {fmtTime(s.duration_seconds)} · {fmtSize(s.file_size_bytes)} · {new Date(s.created_at).toLocaleString()}
                      </div>
                      {isAdmin && (
                        <Button variant="ghost" size="sm" onClick={() => deleteSub(s, true)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
