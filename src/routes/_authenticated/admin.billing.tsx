import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminGetBilling } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, Database, HardDrive, Users, Eye, AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const Route = createFileRoute("/_authenticated/admin/billing")({
  component: BillingPage,
});

function fmtBytes(n: number) {
  if (!n) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0; let v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 ? 2 : 1)} ${u[i]}`;
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function BillingPage() {
  const fetchBilling = useServerFn(adminGetBilling);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-billing"],
    queryFn: () => fetchBilling(),
  });

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (error || !data) {
    return <div className="text-destructive">Failed to load billing data.</div>;
  }

  const totalBytes = data.storage.reduce((s, b) => s + b.bytes, 0);
  const totalFiles = data.storage.reduce((s, b) => s + b.files, 0);
  const totalRows = Object.values(data.database.rowCounts).reduce((s, n) => s + n, 0);

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>About this page</AlertTitle>
        <AlertDescription>
          This shows usage from <strong>your own database</strong> (emails sent, storage used, records, users, views).
          Lovable credit balance, Cloud $ balance, AI $ balance, and domain renewals are not exposed to apps — check{" "}
          <strong>Connectors → Lovable Cloud</strong> and the workspace menu for those.
        </AlertDescription>
      </Alert>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Generated {new Date(data.generatedAt).toLocaleString()}
        </p>
        <button
          onClick={() => refetch()}
          className="text-sm text-primary hover:underline"
          disabled={isFetching}
        >
          {isFetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Top-line stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Users" value={data.users.total} sub={`+${data.users.new7d} in last 7 days`} />
        <Stat label="Storage used" value={fmtBytes(totalBytes)} sub={`${totalFiles} files`} />
        <Stat label="DB records" value={totalRows.toLocaleString()} sub={`${Object.keys(data.database.rowCounts).length} tables`} />
        <Stat label="Emails sent (total)" value={data.emails.stats.total} sub={`${data.emails.stats.last24h} in last 24h`} />
      </div>

      {/* Emails */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Emails</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Sent" value={data.emails.stats.sent} />
            <Stat label="Failed" value={data.emails.stats.failed} />
            <Stat label="Suppressed" value={data.emails.stats.suppressed} />
            <Stat label="Pending" value={data.emails.stats.pending} />
            <Stat label="Last 7 days" value={data.emails.stats.last7d} />
            <Stat label="Last 30 days" value={data.emails.stats.last30d} />
          </div>

          <div>
            <div className="text-sm font-medium mb-2">By template</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.emails.byTemplate).sort((a, b) => b[1] - a[1]).map(([t, n]) => (
                <Badge key={t} variant="secondary">{t}: {n}</Badge>
              ))}
              {Object.keys(data.emails.byTemplate).length === 0 && (
                <span className="text-sm text-muted-foreground">No emails yet.</span>
              )}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Recent (latest 15)</div>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-3 py-2">When</th>
                    <th className="px-3 py-2">Template</th>
                    <th className="px-3 py-2">Recipient</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.emails.recent.map((e: any, i: number) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                        {new Date(e.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">{e.template_name}</td>
                      <td className="px-3 py-2 truncate max-w-[220px]">{e.recipient_email}</td>
                      <td className="px-3 py-2">
                        <Badge
                          variant="secondary"
                          className={
                            e.status === "sent" ? "bg-green-500/10 text-green-700 dark:text-green-400"
                              : e.status === "dlq" || e.status === "failed" ? "bg-red-500/10 text-red-700 dark:text-red-400"
                              : e.status === "suppressed" ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {e.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {data.emails.recent.length === 0 && (
                    <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">No emails logged yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Suppressed emails on file: {data.emails.suppressedCount}
          </div>
        </CardContent>
      </Card>

      {/* Storage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><HardDrive className="h-5 w-5" /> Storage buckets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2">Bucket</th>
                  <th className="px-3 py-2">Files</th>
                  <th className="px-3 py-2">Size</th>
                </tr>
              </thead>
              <tbody>
                {data.storage.map((b) => (
                  <tr key={b.bucket} className="border-t">
                    <td className="px-3 py-2 font-medium">{b.bucket}</td>
                    <td className="px-3 py-2">{b.files}</td>
                    <td className="px-3 py-2">{fmtBytes(b.bytes)}</td>
                  </tr>
                ))}
                {data.storage.length === 0 && (
                  <tr><td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">No buckets.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Database */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" /> Database tables</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(data.database.rowCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([t, n]) => (
                <div key={t} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="text-sm font-mono">{t}</span>
                  <span className="text-sm font-medium">{n.toLocaleString()}</span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Activity */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Eye className="h-5 w-5" /> Lesson views</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <Stat label="24h" value={data.activity.views24h} />
            <Stat label="7d" value={data.activity.views7d} />
            <Stat label="30d" value={data.activity.views30d} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Users</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Stat label="Total" value={data.users.total} />
            <Stat label="New (7d)" value={data.users.new7d} />
          </CardContent>
        </Card>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Things this page does NOT show (and where to find them)</AlertTitle>
        <AlertDescription>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
            <li><strong>Lovable message credits</strong> — top-left workspace menu → credit bar.</li>
            <li><strong>Lovable Cloud $ balance & AI $ balance</strong> — Settings → Cloud & AI balance.</li>
            <li><strong>Database / storage hard limits</strong> — Connectors → Lovable Cloud.</li>
            <li><strong>Custom domain renewal</strong> — Project Settings → Domains.</li>
            <li><strong>Auth MAU billing</strong> — managed at the Cloud level, not per-project API.</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
