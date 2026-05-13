import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GraduationCap, LayoutDashboard, PenLine, FileText, Bookmark, Shield, LogOut, Menu, Settings } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NotificationsBell } from "@/components/notifications-bell";
import { authorName, initialsFor } from "@/lib/author-display";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { session, user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profileChecked, setProfileChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<{ username: string; surname: string; title: string; avatar_url: string } | null>(null);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: roles }, { data: prof }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("profiles").select("username,surname,title,avatar_url").eq("user_id", user.id).maybeSingle(),
      ]);
      setIsAdmin(!!roles?.some((r) => r.role === "admin"));
      setProfile(prof as typeof profile);
      setProfileChecked(true);
    })();
  }, [user]);

  if (loading || !session || !profileChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/compose", label: "Write", icon: PenLine },
    { to: "/my-lessons", label: "My lessons", icon: FileText },
    { to: "/bookmarks", label: "Saved", icon: Bookmark },
    { to: "/settings/profile", label: "Settings", icon: Settings },
    ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: Shield }] : []),
  ] as const;

  const displayName = authorName(profile, false);

  const Sidebar = () => (
    <div className="flex h-full flex-col">
      <Link to="/dashboard" className="flex h-16 items-center gap-2 border-b px-6 font-serif text-lg font-semibold">
        <GraduationCap className="h-6 w-6 text-primary" /> WeShare EduTech
      </Link>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent"
            activeProps={{ className: "bg-accent text-accent-foreground font-medium" }}
          >
            <Icon className="h-4 w-4" /> {label}
          </Link>
        ))}
      </nav>
      <div className="space-y-2 border-t p-3">
        <Link to="/settings/profile" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-md p-2 hover:bg-accent">
          <Avatar className="h-9 w-9">
            <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
            <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">{initialsFor(displayName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </Link>
        <Button variant="ghost" className="w-full justify-start" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 border-r bg-card md:block">
        <Sidebar />
      </aside>
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden"><Menu /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0"><Sidebar /></SheetContent>
          </Sheet>
          <div className="flex flex-1 items-center justify-end gap-2">
            <NotificationsBell />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-muted/20 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
