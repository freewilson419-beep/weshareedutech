import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";
import { getLegalDocument } from "@/lib/legal.functions";

export const Route = createFileRoute("/terms")({
  loader: () => getLegalDocument({ data: { slug: "terms" } }),
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Terms of Service"} — WeShare EduTech` },
      { name: "description", content: "Terms of service governing the use of WeShare EduTech." },
      { property: "og:title", content: `${loaderData?.title ?? "Terms of Service"} — WeShare EduTech` },
      { property: "og:description", content: "Terms of service governing the use of WeShare EduTech." },
      { property: "og:url", content: "https://weshareeduteach.name.ng/terms" },
    ],
    links: [{ rel: "canonical", href: "https://weshareeduteach.name.ng/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  const data = Route.useLoaderData();
  return <LegalPage title={data?.title ?? "Terms of Service"} body={data?.body ?? ""} updatedAt={data?.updated_at} />;
}
