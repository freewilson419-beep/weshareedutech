import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "Mr", surname: "", othernames: "", username: "",
    phone_number: "", whatsapp_number: "", department: "", affiliation: "", control_number: "",
  });
  const [role, setRole] = useState<"student" | "lecturer">("student");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) setForm((f) => ({ ...f, ...Object.fromEntries(Object.entries(data).filter(([k]) => k in f)) as any }));
    });
  }, [user]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").update({ ...form, is_complete: true }).eq("user_id", user.id);
    if (!error && role === "lecturer") {
      await supabase.from("user_roles").insert({ user_id: user.id, role: "lecturer" });
    }
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Profile saved"); navigate({ to: "/dashboard" }); }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader><CardTitle>Complete your profile</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Title</Label>
              <Select value={form.title} onValueChange={(v) => set("title", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Mr","Mrs","Ms","Dr","Prof"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>I am a</Label>
              <Select value={role} onValueChange={(v) => setRole(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="student">Student</SelectItem><SelectItem value="lecturer">Lecturer</SelectItem></SelectContent>
              </Select>
            </div>
            {[
              ["surname","Surname"],["othernames","Other names"],["username","Username"],
              ["phone_number","Phone"],["whatsapp_number","WhatsApp"],["department","Department"],
              ["affiliation","Affiliation"],["control_number","Control number"],
            ].map(([k,l]) => (
              <div key={k} className="space-y-2"><Label>{l}</Label>
                <Input required value={(form as any)[k]} onChange={(e) => set(k, e.target.value)} />
              </div>
            ))}
            <div className="col-span-2"><Button type="submit" className="w-full" disabled={loading}>{loading ? "Saving…" : "Continue"}</Button></div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
