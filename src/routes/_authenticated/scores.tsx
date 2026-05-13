import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/scores")({
  component: () => <div><h1 className="text-2xl font-bold">Scores</h1><p className="mt-2 text-muted-foreground">Your scores will show here.</p></div>,
});
