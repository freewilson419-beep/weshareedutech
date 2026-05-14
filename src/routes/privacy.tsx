import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";
import { getLegalDocument } from "@/lib/legal.functions";

export const Route = createFileRoute("/privacy")({
  loader: () => getLegalDocument({ data: { slug: "privacy" } }),
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Privacy Policy"} — WeShare EduTech` },
      { name: "description", content: "How WeShare EduTech collects, uses, and protects your personal data, in line with NDPR and GDPR." },
      { property: "og:title", content: `${loaderData?.title ?? "Privacy Policy"} — WeShare EduTech` },
      { property: "og:description", content: "How WeShare EduTech collects, uses, and protects your personal data." },
      { property: "og:url", content: "https://weshareeduteach.name.ng/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://weshareeduteach.name.ng/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const data = Route.useLoaderData();
  return <LegalPage title={data?.title ?? "Privacy Policy"} body={data?.body ?? ""} updatedAt={data?.updated_at} />;
}
