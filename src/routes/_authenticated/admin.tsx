import { createFileRoute, Outlet, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Shield, BarChart3, Users, BookOpen, Megaphone, Settings as SettingsIcon, FileText, Flag, LineChart, HelpCircle, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

const tabs = [
  { to: "/admin", label: "Overview", icon: BarChart3, exact: true },
  { to: "/admin/analytics", label: "Analytics", icon: LineChart, exact: false },
  { to: "/admin/users", label: "Users", icon: Users, exact: false },
  { to: "/admin/lessons", label: "Lessons", icon: BookOpen, exact: false },
  { to: "/admin/reports", label: "Reports", icon: Flag, exact: false },
  { to: "/admin/announcements", label: "Announcements", icon: Megaphone, exact: false },
  { to: "/admin/legal", label: "Legal", icon: FileText, exact: false },
  { to: "/admin/faqs", label: "FAQs", icon: HelpCircle, exact: false },
  { to: "/admin/billing", label: "Billing", icon: CreditCard, exact: false },
  { to: "/admin/settings", label: "Settings", icon: SettingsIcon, exact: false },
] as const;

function AdminLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!data) navigate({ to: "/dashboard" });
      else setChecked(true);
    })();
  }, [user, navigate]);

  if (!checked) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-serif text-3xl">
            <Shield className="h-7 w-7 text-primary" /> Admin Panel
          </h1>
          <p className="text-muted-foreground">Full control over users, lessons, and platform settings.</p>
        </div>
        <Badge variant="secondary" className="bg-primary/10 text-primary">Super Admin</Badge>
      </div>

      <div className="-mx-1 flex gap-1 overflow-x-auto border-b">
        {tabs.map((t) => {
          const active = t.exact ? path === t.to : path.startsWith(t.to);
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition ${
                active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </Link>
          );
        })}
      </div>

      <Outlet />
    </div>
  );
}
