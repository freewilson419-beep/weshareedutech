import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { listPublishedFaqs } from "@/lib/faq.functions";
import { Logo } from "@/components/logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/site-footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, HelpCircle, Mail, MessageCircle, Search } from "lucide-react";

export const Route = createFileRoute("/help")({
  loader: () => listPublishedFaqs(),
  head: ({ loaderData }) => {
    const faqs = (loaderData ?? []) as Array<{ question: string; answer: string }>;
    return {
      meta: [
        { title: "Help Center & FAQ — WeShare EduTech" },
        { name: "description", content: "Frequently asked questions about WeShare EduTech: getting started, writing lessons, account & profile, notifications, troubleshooting, and contact." },
        { property: "og:title", content: "Help Center & FAQ — WeShare EduTech" },
        { property: "og:description", content: "Answers to common questions about WeShare EduTech." },
        { property: "og:url", content: "https://weshareeduteach.name.ng/help" },
      ],
      links: [{ rel: "canonical", href: "https://weshareeduteach.name.ng/help" }],
      scripts: faqs.length
        ? [{
            type: "application/ld+json",
            children: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faqs.slice(0, 30).map((f) => ({
                "@type": "Question",
                name: f.question,
                acceptedAnswer: { "@type": "Answer", text: f.answer },
              })),
            }),
          }]
        : [],
    };
  },
  component: HelpPage,
});

function HelpPage() {
  const faqs = Route.useLoaderData() ?? [];
  const [q, setQ] = useState("");

  const grouped = useMemo(() => {
    const filter = q.trim().toLowerCase();
    const out = new Map<string, typeof faqs>();
    for (const f of faqs) {
      if (filter && !`${f.question} ${f.answer}`.toLowerCase().includes(filter)) continue;
      const arr = out.get(f.category) ?? [];
      arr.push(f);
      out.set(f.category, arr);
    }
    return [...out.entries()];
  }, [faqs, q]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="transition-opacity hover:opacity-80"><Logo className="h-7 w-auto text-primary" /></Link>
          <Link to="/"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /> Home</Button></Link>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-12">
        <div className="text-center">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <HelpCircle className="h-6 w-6" />
          </div>
          <h1 className="mt-4 font-serif text-4xl">Help Center</h1>
          <p className="mt-2 text-muted-foreground">Find answers, or reach out to our team.</p>
        </div>

        <div className="relative mt-8">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search FAQs…"
            className="pl-9"
          />
        </div>

        <div className="mt-10 space-y-10">
          {grouped.length === 0 ? (
            <p className="rounded-md border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              No matching FAQs. Try a different search or {" "}
              <a href="mailto:support@weshareeduteach.name.ng" className="text-primary underline">contact support</a>.
            </p>
          ) : (
            grouped.map(([cat, items]) => (
              <section key={cat}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{cat}</h2>
                <Accordion type="multiple" className="rounded-lg border bg-card">
                  {items.map((f) => (
                    <AccordionItem key={f.id} value={f.id} className="px-4">
                      <AccordionTrigger className="text-left text-sm font-medium">{f.question}</AccordionTrigger>
                      <AccordionContent className="whitespace-pre-wrap text-sm text-muted-foreground">{f.answer}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            ))
          )}
        </div>

        <div className="mt-14 rounded-2xl border bg-card p-6 text-center sm:p-8">
          <h3 className="font-serif text-2xl">Still need help?</h3>
          <p className="mt-2 text-sm text-muted-foreground">Our team is here for you.</p>
          <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <a href="mailto:support@weshareeduteach.name.ng">
              <Button variant="outline"><Mail className="h-4 w-4" /> Email support</Button>
            </a>
            <a href="https://wa.me/2348000000000" target="_blank" rel="noreferrer">
              <Button><MessageCircle className="h-4 w-4" /> WhatsApp</Button>
            </a>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
