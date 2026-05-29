import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";

export function LessonSparkline({ postId, days = 14 }: { postId: string; days?: number }) {
  const [data, setData] = useState<{ d: string; v: number }[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      // Accurate total (not capped by the 1000-row default)
      const { count } = await supabase
        .from("lesson_views")
        .select("id", { count: "exact", head: true })
        .eq("post_id", postId)
        .gte("created_at", since);
      setTotal(count ?? 0);

      // For the spark, fetch up to 10k recent timestamps (more than enough for 14d window)
      const { data: views } = await supabase
        .from("lesson_views")
        .select("created_at")
        .eq("post_id", postId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(10000);

      const buckets = new Map<string, number>();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().slice(0, 10);
        buckets.set(key, 0);
      }
      (views ?? []).forEach((v) => {
        const key = (v.created_at as string).slice(0, 10);
        if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
      });
      setData(Array.from(buckets.entries()).map(([d, v]) => ({ d, v })));
    })();
  }, [postId, days]);

  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <p className="font-serif text-xl leading-none">{total}</p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{days}d views</p>
      </div>
      <div className="h-10 w-24">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`spark-${postId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip
              cursor={false}
              contentStyle={{ fontSize: 11, padding: "2px 6px", borderRadius: 6 }}
              formatter={(v: number) => [`${v} views`, ""]}
              labelFormatter={(l) => l}
            />
            <Area type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={1.5} fill={`url(#spark-${postId})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
