import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";
import { getLegalDocument } from "@/lib/legal.functions";

export const Route = createFileRoute("/aup")({
  loader: () => getLegalDocument({ data: { slug: "aup" } }),
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Acceptable Use Policy"} — WeShare EduTech` },
      { name: "description", content: "Rules for acceptable use of the WeShare EduTech platform." },
      { property: "og:title", content: `${loaderData?.title ?? "Acceptable Use Policy"} — WeShare EduTech` },
      { property: "og:description", content: "Rules for acceptable use of the WeShare EduTech platform." },
      { property: "og:url", content: "https://weshareeduteach.name.ng/aup" },
    ],
    links: [{ rel: "canonical", href: "https://weshareeduteach.name.ng/aup" }],
  }),
  component: AupPage,
});

function AupPage() {
  const data = Route.useLoaderData();
  return <LegalPage title={data?.title ?? "Acceptable Use Policy"} body={data?.body ?? ""} updatedAt={data?.updated_at} />;
}
