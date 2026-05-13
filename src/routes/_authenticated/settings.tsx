import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsLayout,
});

const tabs = [
  { to: "/settings/profile", label: "Profile" },
  { to: "/settings/account", label: "Account" },
  { to: "/settings/preferences", label: "Preferences" },
] as const;

function SettingsLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-serif text-3xl">Settings</h1>
        <p className="text-muted-foreground">Manage how you appear and how you publish.</p>
      </div>
      <div className="flex gap-1 border-b">
        {tabs.map((t) => {
          const active = path === t.to || (path === "/settings" && t.to === "/settings/profile");
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
                active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}
