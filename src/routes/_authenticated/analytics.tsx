import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/analytics")({
  component: () => <div><h1 className="text-2xl font-bold">Analytics</h1><p className="mt-2 text-muted-foreground">Coming soon.</p></div>,
});
