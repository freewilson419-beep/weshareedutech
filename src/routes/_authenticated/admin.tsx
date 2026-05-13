import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/admin")({
  component: () => <div><h1 className="text-2xl font-bold">Admin</h1><p className="mt-2 text-muted-foreground">Admin panel coming soon.</p></div>,
});
