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
        <article className="legal-doc mt-8 leading-relaxed text-foreground">
          <ReactMarkdown
            components={{
              h1: () => null,
              h2: ({ children }) => <h2 className="mt-10 mb-3 font-serif text-2xl text-primary">{children}</h2>,
              h3: ({ children }) => <h3 className="mt-6 mb-2 font-serif text-xl">{children}</h3>,
              p: ({ children }) => <p className="my-3 text-[1.025rem]">{children}</p>,
              ul: ({ children }) => <ul className="my-3 list-disc space-y-1 pl-6">{children}</ul>,
              ol: ({ children }) => <ol className="my-3 list-decimal space-y-1 pl-6">{children}</ol>,
              a: ({ href, children }) => <a href={href} className="text-primary underline-offset-4 hover:underline">{children}</a>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              em: ({ children }) => <em className="italic text-muted-foreground">{children}</em>,
              hr: () => <hr className="my-8 border-border" />,
            }}
          >{body}</ReactMarkdown>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
