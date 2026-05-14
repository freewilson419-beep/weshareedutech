import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";
import { getLegalDocument } from "@/lib/legal.functions";

export const Route = createFileRoute("/cookies")({
  loader: () => getLegalDocument({ data: { slug: "cookies" } }),
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Cookie Policy"} — WeShare EduTech` },
      { name: "description", content: "How WeShare EduTech uses cookies and similar technologies." },
      { property: "og:title", content: `${loaderData?.title ?? "Cookie Policy"} — WeShare EduTech` },
      { property: "og:description", content: "How WeShare EduTech uses cookies." },
      { property: "og:url", content: "https://weshareeduteach.name.ng/cookies" },
    ],
    links: [{ rel: "canonical", href: "https://weshareeduteach.name.ng/cookies" }],
  }),
  component: CookiesPage,
});

function CookiesPage() {
  const data = Route.useLoaderData();
  return <LegalPage title={data?.title ?? "Cookie Policy"} body={data?.body ?? ""} updatedAt={data?.updated_at} />;
}
