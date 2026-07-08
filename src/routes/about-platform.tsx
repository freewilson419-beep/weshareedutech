import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { SiteFooter } from "@/components/site-footer";
import { BookOpen, PenLine, Users, Heart, Bookmark, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/about-platform")({
  head: () => ({
    meta: [
      { title: "About this Platform — WeShare EduTech" },
      { name: "description", content: "Learn what WeShare EduTech is about — a community publication where participants share structured lessons everyone can read freely." },
      { property: "og:title", content: "About this Platform — WeShare EduTech" },
      { property: "og:description", content: "Learn what WeShare EduTech is about — a community publication where participants share structured lessons everyone can read freely." },
      { property: "og:url", content: "https://weshareeduteach.name.ng/about-platform" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://weshareeduteach.name.ng/about-platform" }],
  }),
  component: AboutPlatformPage,
});

function AboutPlatformPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <header className="container mx-auto flex h-20 items-center justify-between px-4 sm:px-8">
        <Link to="/" className="transition-opacity hover:opacity-80">
          <Logo className="h-8 w-auto text-primary" />
        </Link>
        <Link to="/login">
          <Button variant="ghost" className="font-medium">Sign In</Button>
        </Link>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-12 sm:px-8 sm:py-16">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">About this Platform</h1>
        <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
          <strong className="text-foreground">WeShare EduTech</strong> is a community-driven learning publication. It is built on a simple idea: the best way to learn is to share what you know, and the best way to teach is to make your lessons easy for anyone to read.
        </p>

        <section className="mt-12">
          <h2 className="text-2xl font-bold">What you can do here</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Feature icon={<BookOpen className="h-5 w-5" />} title="Read freely" body="Every published lesson is open. No paywall, no login required to read." />
            <Feature icon={<PenLine className="h-5 w-5" />} title="Publish lessons" body="Sign in and share structured lessons with goals, explanations, and resources." />
            <Feature icon={<Heart className="h-5 w-5" />} title="Like & bookmark" body="Show appreciation and save lessons you want to come back to." />
            <Feature icon={<MessageSquare className="h-5 w-5" />} title="Discuss" body="Leave comments, ask questions, and help others learn deeper." />
            <Feature icon={<Bookmark className="h-5 w-5" />} title="Track your reading" body="Your bookmarks and reading progress stay with your account." />
            <Feature icon={<Users className="h-5 w-5" />} title="Community first" body="Built by participants, for participants. Everyone can contribute." />
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold">Our mission</h2>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            We want learning to feel like a shared journey. When one participant publishes a clear lesson, dozens — sometimes hundreds — of others learn from it. Multiply that across a community and you get a living library that grows every week.
          </p>
        </section>

        <section className="mt-12 rounded-2xl border bg-card p-8 text-center">
          <h2 className="text-2xl font-bold">Ready to join?</h2>
          <p className="mt-2 text-muted-foreground">Create a free account and publish your first lesson today.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/signup"><Button size="lg">Create Free Account</Button></Link>
            <Link to="/"><Button variant="outline" size="lg">Browse Lessons</Button></Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
