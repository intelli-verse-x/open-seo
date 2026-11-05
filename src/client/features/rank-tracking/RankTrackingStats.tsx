import type { getRankTrackingConfigSummaries } from "@/serverFunctions/rank-tracking";

export function RankTrackingStats({
  summaries,
  pending,
}: {
  summaries:
    | Awaited<ReturnType<typeof getRankTrackingConfigSummaries>>
    | undefined;
  pending: boolean;
}) {
  const metrics = [
    ["Domains tracked", summaries?.length],
    [
      "Keywords tracked",
      summaries?.reduce((sum, row) => sum + row.keywordCount, 0),
    ],
    ["Avg. position", undefined],
    ["In top 10", undefined],
  ] as const;
  return (
    <div className="toba-dashboard-stats mb-6">
      {metrics.map(([label, value]) => (
        <section className="toba-stat" key={label}>
          <p>{label}</p>
          <strong>{value ?? "—"}</strong>
          <small>
            {pending
              ? "Loading…"
              : value === undefined
                ? "Not available"
                : "Across tracked domains"}
          </small>
        </section>
      ))}
    </div>
  );
}
