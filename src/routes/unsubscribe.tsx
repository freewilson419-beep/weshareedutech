import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MailX, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/unsubscribe")({
  component: UnsubscribePage,
  validateSearch: (s: Record<string, unknown>) => ({ token: (s.token as string) || "" }),
});

function UnsubscribePage() {
  const { token } = Route.useSearch();
  const [state, setState] = useState<"checking" | "ready" | "already" | "invalid" | "done" | "error">("checking");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (r.ok && j.valid === true) setState("ready");
        else if (r.ok && j.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      })
      .catch(() => setState("error"));
  }, [token]);

  const confirm = async () => {
    setBusy(true);
    try {
      const r = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      setState(r.ok ? "done" : "error");
    } finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 p-8 text-center">
          {state === "checking" && <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />}
          {state === "ready" && (<>
            <MailX className="mx-auto h-10 w-10 text-primary" />
            <h1 className="text-xl font-semibold">Unsubscribe from emails?</h1>
            <p className="text-sm text-muted-foreground">You'll stop receiving announcements and notifications from us.</p>
            <Button onClick={confirm} disabled={busy} className="w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm unsubscribe"}
            </Button>
          </>)}
          {state === "already" && <p className="text-sm text-muted-foreground">You're already unsubscribed.</p>}
          {state === "done" && (<>
            <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
            <h1 className="text-xl font-semibold">Unsubscribed</h1>
            <p className="text-sm text-muted-foreground">You won't receive further emails.</p>
          </>)}
          {state === "invalid" && <p className="text-sm text-muted-foreground">This unsubscribe link is invalid or expired.</p>}
          {state === "error" && <p className="text-sm text-destructive">Something went wrong. Please try again.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
