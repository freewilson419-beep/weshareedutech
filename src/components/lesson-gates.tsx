import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Plus, Trash2, CheckCircle2 } from "lucide-react";

export type GateQ = { type: "mcq" | "blank"; q: string; options: string[]; answer: string };
export type GateKey = "intro" | "body" | "conclusion";
export type GateQuestions = Partial<Record<GateKey, GateQ[]>>;

export const MAX_BANK = 10;
export const PER_GATE = 3;
export const FAIL_MSG = "You are yet to read the content properly. Please read again.";

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export function isValidQ(q: GateQ) {
  if (!q.q.trim() || !q.answer.trim()) return false;
  if (q.type === "mcq") {
    const opts = q.options.map((o) => o.trim()).filter(Boolean);
    return opts.length >= 2 && opts.some((o) => norm(o) === norm(q.answer));
  }
  return true;
}

function isCorrect(q: GateQ, given: string) {
  if (q.type === "mcq") return norm(given) === norm(q.answer);
  return q.answer.split("|").map(norm).filter(Boolean).includes(norm(given));
}

function pick(bank: GateQ[], avoid: Set<number>): number[] {
  const idx = bank.map((_, i) => i);
  const fresh = idx.filter((i) => !avoid.has(i));
  const pool = fresh.length >= Math.min(PER_GATE, bank.length) ? fresh : idx;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(PER_GATE, bank.length));
}

/* ---------------- Student-facing gate ---------------- */
export function QuestionGate({ title, bank, onPass }: { title: string; bank: GateQ[]; onPass: () => void }) {
  const [seen, setSeen] = useState<Set<number>>(new Set());
  const [shown, setShown] = useState<number[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [failed, setFailed] = useState(false);

  useEffect(() => { setShown(pick(bank, new Set())); }, [bank]);
  const shuffledOpts = useMemo(
    () => Object.fromEntries(shown.map((i) => [i, [...bank[i].options.filter((o) => o.trim())].sort(() => Math.random() - 0.5)])),
    [shown, bank],
  );

  const submit = () => {
    const ok = shown.every((i) => isCorrect(bank[i], answers[i] ?? ""));
    if (ok) return onPass();
    setFailed(true);
    const nextSeen = new Set([...seen, ...shown]);
    setSeen(nextSeen);
    setShown(pick(bank, nextSeen));
    setAnswers({});
  };

  return (
    <div className="not-prose rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 p-5">
      <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground"><Lock className="h-3.5 w-3.5" /> Checkpoint</p>
      <h3 className="mt-1 font-serif text-xl">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">Answer correctly to continue.</p>
      {failed && <p className="mt-3 rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive">{FAIL_MSG}</p>}
      <ol className="mt-4 space-y-5">
        {shown.map((i, n) => {
          const q = bank[i];
          return (
            <li key={`${i}-${seen.size}`} className="space-y-2">
              <p className="text-sm font-medium">{n + 1}. {q.q}</p>
              {q.type === "mcq" ? (
                <div className="space-y-1.5">
                  {(shuffledOpts[i] ?? []).map((o) => (
                    <label key={o} className="flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
                      <input type="radio" name={`gq-${i}`} checked={answers[i] === o} onChange={() => setAnswers((a) => ({ ...a, [i]: o }))} />
                      {o}
                    </label>
                  ))}
                </div>
              ) : (
                <Input value={answers[i] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))} placeholder="Type the missing word(s)" />
              )}
            </li>
          );
        })}
      </ol>
      <Button className="mt-5" onClick={submit} disabled={shown.some((i) => !(answers[i] ?? "").trim())}>Check answers</Button>
    </div>
  );
}

export function PassedNote({ text }: { text: string }) {
  return <p className="not-prose flex items-center gap-2 text-sm text-primary"><CheckCircle2 className="h-4 w-4" /> {text}</p>;
}

/* ---------------- Publisher editor ---------------- */
export function QuestionBankEditor({ label, hint, value, onChange }: { label: string; hint: string; value: GateQ[]; onChange: (v: GateQ[]) => void }) {
  const set = (i: number, patch: Partial<GateQ>) => onChange(value.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div>
        <Label className="font-serif text-base">{label} <span className="text-xs font-normal text-muted-foreground">({value.length}/{MAX_BANK})</span></Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      {value.map((q, i) => (
        <div key={i} className="space-y-2 rounded-md bg-muted/40 p-3">
          <div className="flex items-center gap-2">
            <select className="h-9 rounded-md border bg-background px-2 text-sm" value={q.type} onChange={(e) => set(i, { type: e.target.value as GateQ["type"] })}>
              <option value="mcq">Multiple choice</option>
              <option value="blank">Fill in the blank</option>
            </select>
            <Button type="button" size="icon" variant="ghost" className="ml-auto" onClick={() => onChange(value.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
          </div>
          <Input value={q.q} onChange={(e) => set(i, { q: e.target.value })} placeholder={q.type === "blank" ? "e.g. The powerhouse of the cell is the ____." : "Question"} />
          {q.type === "mcq" ? (
            <>
              {q.options.map((o, k) => (
                <div key={k} className="flex items-center gap-2">
                  <input type="radio" name={`ans-${label}-${i}`} checked={!!o.trim() && o === q.answer} onChange={() => set(i, { answer: o })} title="Mark as correct" />
                  <Input value={o} onChange={(e) => {
                    const opts = q.options.map((x, m) => (m === k ? e.target.value : x));
                    set(i, { options: opts, answer: q.answer === o ? e.target.value : q.answer });
                  }} placeholder={`Option ${k + 1}`} />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">Tick the circle next to the correct option.</p>
            </>
          ) : (
            <>
              <Input value={q.answer} onChange={(e) => set(i, { answer: e.target.value })} placeholder="Missing word(s). Separate alternatives with | e.g. mitochondria|mitochondrion" />
              <p className="text-xs text-muted-foreground">Capital or small letters are both accepted.</p>
            </>
          )}
        </div>
      ))}
      {value.length < MAX_BANK && (
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, { type: "mcq", q: "", options: ["", "", "", ""], answer: "" }])}>
          <Plus className="h-4 w-4" /> Add question
        </Button>
      )}
    </div>
  );
}

/* ---------------- Progress persistence ---------------- */
export function useGateProgress(postId: string | undefined, userId: string | undefined) {
  const key = postId ? `gates:${postId}:${userId ?? "anon"}` : "";
  const [passed, setPassed] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!key) return;
    try { setPassed(JSON.parse(localStorage.getItem(key) || "{}")); } catch { setPassed({}); }
  }, [key]);
  const pass = (g: GateKey) => setPassed((p) => {
    const n = { ...p, [g]: true };
    try { localStorage.setItem(key, JSON.stringify(n)); } catch { /* ignore */ }
    return n;
  });
  return { passed, pass };
}
