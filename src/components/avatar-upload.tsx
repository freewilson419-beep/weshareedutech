import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { initialsFor } from "@/lib/author-display";

export function AvatarUpload({
  userId,
  url,
  name,
  onChange,
  size = 96,
}: {
  userId: string;
  url: string;
  name: string;
  onChange: (url: string) => void;
  size?: number;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Image only");
    if (file.size > 5 * 1024 * 1024) return toast.error("Max 5MB");
    setBusy(true);
    const { compressImage } = await import("@/lib/compress-image");
    const compressed = await compressImage(file, { maxEdge: 512, quality: 0.85 });
    const ext = compressed.name.split(".").pop() || "webp";
    const path = `avatars/${userId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("post-media").upload(path, compressed, { contentType: compressed.type, upsert: true });
    if (error) {
      setBusy(false);
      return toast.error(error.message);
    }
    const { data } = supabase.storage.from("post-media").getPublicUrl(path);
    onChange(data.publicUrl);
    setBusy(false);
    toast.success("Avatar updated");
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar style={{ width: size, height: size }} className="ring-2 ring-primary/10">
        <AvatarImage src={url || undefined} alt={name} />
        <AvatarFallback className="bg-primary/10 text-lg font-medium text-primary">{initialsFor(name)}</AvatarFallback>
      </Avatar>
      <div className="space-y-2">
        <input
          ref={ref}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
        />
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {url ? "Change photo" : "Upload photo"}
          </Button>
          {url && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")} disabled={busy}>
              <Trash2 className="h-4 w-4" /> Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">PNG or JPG, up to 5MB.</p>
      </div>
    </div>
  );
}
