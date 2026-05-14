import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { SiteFooter } from "@/components/site-footer";

export function LegalPage({
  title,
  body,
  updatedAt,
}: {
  title: string;
  body: string;
  updatedAt?: string | null;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="transition-opacity hover:opacity-80">
            <Logo className="h-7 w-auto text-primary" />
          </Link>
          <Link to="/"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /> Home</Button></Link>
        </div>
      </header>
      <main className="container mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-serif text-4xl">{title}</h1>
        {updatedAt && (
          <p className="mt-2 text-xs text-muted-foreground">
            Last updated: {new Date(updatedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
          </p>
        )}
        <article className="prose prose-slate mt-8 max-w-none dark:prose-invert prose-headings:font-serif prose-h1:hidden prose-h2:mt-8 prose-h2:text-2xl prose-h3:text-xl prose-a:text-primary">
          <ReactMarkdown>{body}</ReactMarkdown>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
