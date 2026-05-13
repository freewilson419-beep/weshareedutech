import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/courses")({
  component: () => <div><h1 className="text-2xl font-bold">Courses</h1><p className="mt-2 text-muted-foreground">Course list coming next.</p></div>,
});
