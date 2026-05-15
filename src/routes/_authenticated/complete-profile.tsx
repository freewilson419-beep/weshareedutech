import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/complete-profile")({
  component: CompleteProfilePage,
});

function CompleteProfilePage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "Mr",
    surname: "",
    othernames: "",
    username: "",
    phone_number: "",
    whatsapp_number: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (data?.is_complete) {
        nav({ to: "/dashboard", replace: true });
        return;
      }
      // Pre-fill from Google metadata if available
      const meta = (user.user_metadata ?? {}) as Record<string, string>;
      const fullName = meta.full_name || meta.name || "";
      const [first, ...rest] = fullName.split(" ");
      setForm((f) => ({
        ...f,
        surname: data?.surname || rest.join(" ") || "",
        othernames: data?.othernames || first || "",
        username: data?.username || (user.email?.split("@")[0] ?? ""),
        title: data?.title || "Mr",
        phone_number: data?.phone_number || "",
        whatsapp_number: data?.whatsapp_number || "",
      }));
      setLoading(false);
    })();
  }, [user, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.surname || !form.othernames || !form.username || !form.phone_number || !form.whatsapp_number) {
      return toast.error("Please fill in all fields");
    }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ ...form, is_complete: true }).eq("user_id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome to WeShare EduTech");
    nav({ to: "/dashboard" });
  };

  if (loading) return <div className="flex justify-center py-24"><div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" /></div>;

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Complete your profile</CardTitle>
          <CardDescription>One more step before you can publish and engage. We need a few details.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Select value={form.title} onValueChange={(v) => set("title", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Mr", "Mrs", "Ms", "Dr", "Prof"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Surname</Label>
                <Input required value={form.surname} onChange={(e) => set("surname", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Other names</Label>
              <Input required value={form.othernames} onChange={(e) => set("othernames", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input required value={form.username} onChange={(e) => set("username", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input required value={form.phone_number} onChange={(e) => set("phone_number", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>WhatsApp</Label>
                <Input required value={form.whatsapp_number} onChange={(e) => set("whatsapp_number", e.target.value)} />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>{saving ? "Saving…" : "Continue"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
