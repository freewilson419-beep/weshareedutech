import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

export function GoogleSignInButton({ label = "Continue with Google" }: { label?: string }) {
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setLoading(false);
      toast.error(result.error.message || "Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    // Tokens were set; the auth listener will navigate.
    window.location.href = "/dashboard";
  };
  return (
    <Button type="button" variant="outline" className="w-full" onClick={handle} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.74-6-6.1S8.7 6 12 6c1.88 0 3.14.8 3.86 1.49l2.64-2.55C16.86 3.42 14.6 2.4 12 2.4 6.86 2.4 2.7 6.55 2.7 11.7s4.16 9.3 9.3 9.3c5.36 0 8.92-3.77 8.92-9.07 0-.61-.07-1.07-.16-1.53H12z"/>
        </svg>
      )}
      {label}
    </Button>
  );
}
