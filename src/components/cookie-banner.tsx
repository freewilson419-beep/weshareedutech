import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Cookie, X } from "lucide-react";

const KEY = "ws_cookie_consent_v1";

export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(KEY)) setShow(true);
  }, []);

  if (!show) return null;

  const accept = (val: "accept" | "dismiss") => {
    localStorage.setItem(KEY, val);
    setShow(false);
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-lg border bg-card p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <Cookie className="h-5 w-5 shrink-0 text-primary" />
        <div className="flex-1 text-sm">
          <p className="font-medium">We use cookies</p>
          <p className="mt-0.5 text-muted-foreground">
            We use essential cookies to keep you signed in and remember preferences.{" "}
            <Link to="/cookies" className="underline">Learn more</Link>.
          </p>
        </div>
        <button onClick={() => accept("dismiss")} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => accept("dismiss")}>Dismiss</Button>
        <Button size="sm" onClick={() => accept("accept")}>Accept</Button>
      </div>
    </div>
  );
}
