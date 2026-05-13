import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { GraduationCap, Mic, BookOpen, BarChart3, MessageSquare, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EduTeach — Learn deeper by teaching back" },
      { name: "description", content: "A teaching platform where lecturers post structured lessons and students record themselves teaching them back." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <GraduationCap className="h-6 w-6 text-primary" />
            EduTeach
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/login"><Button variant="ghost">Sign in</Button></Link>
            <Link to="/signup"><Button>Get started</Button></Link>
          </nav>
        </div>
      </header>

      <section className="container mx-auto px-4 py-24 text-center">
        <h1 className="mx-auto max-w-3xl text-5xl font-bold tracking-tight">
          Learn deeper by <span className="text-primary">teaching it back</span>.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Lecturers post structured lessons. Students teach them back via voice, get instant feedback, and master what they've learned.
        </p>
        <div className="mt-10 flex justify-center gap-3">
          <Link to="/signup"><Button size="lg">Create your account</Button></Link>
          <Link to="/login"><Button size="lg" variant="outline">I already have one</Button></Link>
        </div>
      </section>

      <section className="container mx-auto grid grid-cols-1 gap-6 px-4 pb-24 md:grid-cols-3">
        {[
          { icon: BookOpen, title: "Structured lessons", body: "Goal, intro, body, conclusion, reflection — every lesson follows the same proven shape." },
          { icon: Mic, title: "Teach-back recording", body: "Students record themselves teaching the lesson and submit it directly from the browser." },
          { icon: Sparkles, title: "AI grading", body: "Automatic feedback on transcript length and goal coverage — lecturers can override." },
          { icon: MessageSquare, title: "Discussion & quizzes", body: "Comments, announcements, MCQ + open-ended quizzes per lesson." },
          { icon: BarChart3, title: "Score dashboard", body: "Students and lecturers track progress over time across every course." },
          { icon: GraduationCap, title: "Course management", body: "Invite students by email, manage enrollments, and run multiple cohorts." },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-lg border p-6">
            <Icon className="h-8 w-8 text-primary" />
            <h3 className="mt-4 font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} EduTeach
      </footer>
    </div>
  );
}
