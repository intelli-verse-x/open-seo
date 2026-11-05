import { useSession } from "@/lib/auth-client";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/client/components/ui/button";
import { QueryError } from "@/client/components/QueryState";
import {
  getDashboardActivation,
  getDashboardOverview,
} from "@/serverFunctions/dashboard";
import { getRankTrackingConfigSummaries } from "@/serverFunctions/rank-tracking";
import { DashboardKeywords } from "./DashboardKeywords";
import { DashboardBacklinks } from "./DashboardBacklinks";
import type { dashboardSiteTabSchema } from "@/types/schemas/dashboard";
import type { z } from "zod";

export function DashboardPage({
  projectId,
  tab = "overview",
}: {
  projectId: string;
  tab?: z.infer<typeof dashboardSiteTabSchema>;
  onTabChange: (tab: z.infer<typeof dashboardSiteTabSchema>) => void;
}) {
  const { data: session } = useSession();
  const activationQuery = useQuery({
    queryKey: ["dashboardActivation", projectId],
    queryFn: () => getDashboardActivation({ data: { projectId } }),
    refetchOnMount: "always",
  });
  const overviewQuery = useQuery({
    queryKey: ["dashboardOverview", projectId],
    queryFn: () => getDashboardOverview({ data: { projectId } }),
    refetchInterval: (query) =>
      query.state.data?.audit?.status === "running" ? 3000 : false,
  });
  const ranks = useQuery({
    queryKey: ["rankTrackingConfigSummaries", projectId],
    queryFn: () => getRankTrackingConfigSummaries({ data: { projectId } }),
  });
  const activation = activationQuery.data;
  const audit = overviewQuery.data?.audit;
  const pending = activationQuery.isPending || overviewQuery.isPending;
  return (
    <div className="px-4 py-7 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1>
              Welcome back{session?.user.name ? `, ${session.user.name}` : ""}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Here's how your sites are performing across Google and AI search.
            </p>
          </div>
          <Button
            nativeButton={false}
            render={<Link to="/p/$projectId/settings" params={{ projectId }} />}
          >
            + Add domain
          </Button>
        </div>
        {activationQuery.isError ? (
          <QueryError
            error={activationQuery.error}
            fallback="Failed to load dashboard"
            onRetry={() => void activationQuery.refetch()}
          />
        ) : null}
        {overviewQuery.isError ? (
          <QueryError
            error={overviewQuery.error}
            fallback="Failed to load site health"
            onRetry={() => void overviewQuery.refetch()}
          />
        ) : null}
        <div className="toba-dashboard-stats">
          {[
            "Tracked keywords",
            "Avg. position",
            "Top 10 rankings",
            "AI brand mentions",
          ].map((label) => (
            <section key={label} className="toba-stat">
              <p>{label}</p>
              <strong>
                {label === "Tracked keywords" && ranks.data
                  ? ranks.data.reduce((sum, row) => sum + row.keywordCount, 0)
                  : "—"}
              </strong>
              <small>
                {pending
                  ? "Loading…"
                  : label === "Tracked keywords" && ranks.data
                    ? "Across tracked domains"
                    : "Not available yet"}
              </small>
            </section>
          ))}
        </div>
        <div className="toba-dashboard-grid">
          <section className="toba-panel">
            <h2>Search visibility</h2>
            <p>Share of clicks across tracked keywords</p>
            <div className="toba-empty-chart">
              <p>
                {pending
                  ? "Loading…"
                  : "Search visibility data is not available yet."}
              </p>
            </div>
          </section>
          <section className="toba-panel">
            <h2>AI visibility</h2>
            <p>Brand mentions by model</p>
            {["ChatGPT", "Claude", "Gemini", "Perplexity"].map((model) => (
              <div key={model} className="toba-model">
                {model}
                <span>Not available</span>
                <i />
              </div>
            ))}
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <Link
                  to="/p/$projectId/prompt-explorer"
                  params={{ projectId }}
                />
              }
            >
              Open Prompt Explorer
            </Button>
          </section>
          <section className="toba-panel">
            <h2>Tracked domains</h2>
            <p>Weekly · Desktop + Mobile</p>
            <div className="mt-4 overflow-hidden rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted text-xs text-muted-foreground">
                  <tr>
                    {[
                      "Domain",
                      "Market",
                      "Keywords",
                      "Avg. pos.",
                      "Change",
                    ].map((label) => (
                      <th key={label} className="p-4 font-medium">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ranks.data?.length ? (
                    ranks.data.map((row) => (
                      <tr key={row.id}>
                        <td className="p-4">
                          <Link
                            to="/p/$projectId/rank-tracking/$configId"
                            params={{ projectId, configId: row.id }}
                          >
                            {row.domain}
                          </Link>
                        </td>
                        <td className="p-4">{row.locationCode}</td>
                        <td className="p-4">{row.keywordCount}</td>
                        <td className="p-4">—</td>
                        <td className="p-4">—</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-8 text-center text-muted-foreground"
                      >
                        {pending
                          ? "Loading…"
                          : ranks.isError
                            ? "Tracked domains are unavailable."
                            : "No tracked domains yet."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Link
              className="mt-4 inline-block text-sm font-medium text-primary"
              to="/p/$projectId/rank-tracking"
              params={{ projectId }}
            >
              View all →
            </Link>
          </section>
          <section className="toba-panel">
            <div className="flex justify-between">
              <h2>Recent audits</h2>
              <Link
                to="/p/$projectId/audit"
                params={{ projectId }}
                className="text-sm text-primary"
              >
                + New
              </Link>
            </div>
            {audit ? (
              <Link
                to="/p/$projectId/audit"
                params={{ projectId }}
                className="mt-6 block rounded-xl bg-muted p-4"
              >
                <strong className="text-sm">{activation?.domain}</strong>
                <p>
                  {audit.pagesCrawled} pages · {audit.status}
                </p>
              </Link>
            ) : (
              <p className="py-12 text-center">
                {pending
                  ? "Loading…"
                  : overviewQuery.isError
                    ? "Audits are unavailable."
                    : "No audits yet."}
              </p>
            )}
          </section>
        </div>
        {tab === "keywords" && activation ? (
          <DashboardKeywords
            projectId={projectId}
            connected={activation.gsc.connected}
            siteUrl={activation.gsc.siteUrl}
          />
        ) : null}
        {tab === "backlinks" && activation?.domain ? (
          <DashboardBacklinks
            projectId={projectId}
            domain={activation.domain}
          />
        ) : null}
      </div>
    </div>
  );
}
