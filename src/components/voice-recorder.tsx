import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Mic, Square, Play, Pause, Trash2, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

interface Submission {
  id: string;
  storage_path: string;
  duration_seconds: number;
  file_size_bytes: number;
  created_at: string;
  signed_url?: string;
}

const MAX_SECONDS = 300; // 5 min cap per recording (~2-3 MB)
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB hard cap

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

export function VoiceRecorder({ postId }: { postId: string }) {
  const { user } = useAuth();
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    void loadSubs();
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, postId]);

  async function loadSubs() {
    setLoading(true);
    const { data, error } = await supabase
      .from("voice_submissions")
      .select("id,storage_path,duration_seconds,file_size_bytes,created_at")
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

  function cleanup() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      // Pick widely supported mime
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4"
        : "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 64000 } : undefined);
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
    void loadSubs();
  }

  async function deleteSub(s: Submission) {
    if (!confirm("Delete this recording?")) return;
    await supabase.storage.from("submissions").remove([s.storage_path]);
    const { error } = await supabase.from("voice_submissions").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    setSubmissions((xs) => xs.filter((x) => x.id !== s.id));
  }

  if (!user) {
    return (
      <div className="mt-6 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
        <Link to="/login" className="font-medium text-primary underline">Sign in</Link> to record and submit your voice note for this lesson.
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-lg border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-medium">Submit a voice note</h4>
          <p className="mt-1 text-xs text-muted-foreground">Record up to 5 minutes. Only you and the lesson author can hear it.</p>
        </div>
        <Mic className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!recording && !blob && (
          <Button onClick={startRecording} disabled={uploading}>
            <Mic className="h-4 w-4" /> Start recording
          </Button>
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
            <audio src={previewUrl} controls className="h-9" />
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
                  {fmtTime(s.duration_seconds)} · {fmtSize(s.file_size_bytes)} ·{" "}
                  {new Date(s.created_at).toLocaleString()}
                </div>
                <Button variant="ghost" size="sm" onClick={() => deleteSub(s)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
