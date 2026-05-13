import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImagePlus, Link2, Loader2, X, Youtube } from "lucide-react";
import { toast } from "sonner";

export type MediaItem =
  | { type: "image"; url: string; caption?: string }
  | { type: "youtube"; url: string; videoId: string; caption?: string }
  | { type: "video"; url: string; caption?: string };

function youtubeId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (u.hostname === "youtu.be") return u.pathname.slice(1) || null;
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2] || null;
      if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] || null;
    }
  } catch {}
  return null;
}

export function MediaManager({
  userId,
  items,
  onChange,
}: {
  userId: string;
  items: MediaItem[];
  onChange: (next: MediaItem[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [showLink, setShowLink] = useState(false);

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      return toast.error("Only image or video files");
    }
    if (file.size > 25 * 1024 * 1024) return toast.error("Max 25MB");
    setUploading(true);
    const ext = file.name.split(".").pop() || "bin";
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error } = await supabase.storage.from("post-media").upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
    });
    if (error) {
      setUploading(false);
      return toast.error(error.message);
    }
    const { data } = supabase.storage.from("post-media").getPublicUrl(path);
    onChange([
      ...items,
      file.type.startsWith("video/")
        ? { type: "video", url: data.publicUrl }
        : { type: "image", url: data.publicUrl },
    ]);
    setUploading(false);
  };

  const addLink = () => {
    const v = linkInput.trim();
    if (!v) return;
    const id = youtubeId(v);
    if (id) onChange([...items, { type: "youtube", url: v, videoId: id }]);
    else if (/\.(mp4|webm|mov)(\?|$)/i.test(v)) onChange([...items, { type: "video", url: v }]);
    else if (/\.(png|jpe?g|gif|webp|avif)(\?|$)/i.test(v)) onChange([...items, { type: "image", url: v }]);
    else return toast.error("Paste a YouTube link or a direct image/video URL");
    setLinkInput("");
    setShowLink(false);
  };

  return (
    <div className="space-y-2">
      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {items.map((m, i) => (
            <div key={i} className="relative overflow-hidden rounded-md border bg-muted">
              {m.type === "image" && <img src={m.url} alt="" className="aspect-video w-full object-cover" />}
              {m.type === "video" && <video src={m.url} className="aspect-video w-full object-cover" muted />}
              {m.type === "youtube" && (
                <img src={`https://img.youtube.com/vi/${m.videoId}/hqdefault.jpg`} alt="" className="aspect-video w-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-foreground hover:bg-background"
                aria-label="Remove"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
        />
        <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          Upload image / video
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setShowLink((s) => !s)}>
          <Youtube className="h-4 w-4" /> YouTube / link
        </Button>
      </div>

      {showLink && (
        <div className="flex gap-2">
          <Input
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            placeholder="https://youtube.com/watch?v=…"
            className="text-sm"
          />
          <Button type="button" size="sm" onClick={addLink}><Link2 className="h-4 w-4" /> Add</Button>
        </div>
      )}
    </div>
  );
}

export function MediaRender({ items }: { items: MediaItem[] }) {
  if (!items?.length) return null;
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      {items.map((m, i) => (
        <figure key={i} className="overflow-hidden rounded-lg border bg-muted">
          {m.type === "image" && (
            <img src={m.url} alt={m.caption ?? ""} loading="lazy" className="w-full" />
          )}
          {m.type === "video" && (
            <video src={m.url} controls preload="metadata" className="w-full" />
          )}
          {m.type === "youtube" && (
            <div className="relative aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${m.videoId}`}
                title="YouTube video"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            </div>
          )}
          {m.caption && <figcaption className="px-3 py-2 text-xs text-muted-foreground">{m.caption}</figcaption>}
        </figure>
      ))}
    </div>
  );
}
