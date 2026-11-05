/** Keeps the research frame visible before a query, without fabricated results. */
export function ResearchEmptyPanels({
  metrics = [],
  title,
  columns = [],
  chart = false,
  models = false,
  sideTitle,
}: {
  metrics?: string[];
  title: string;
  columns?: string[];
  chart?: boolean;
  models?: boolean;
  sideTitle?: string;
}) {
  return (
    <div className="space-y-6">
      {metrics.length ? (
        <div className="toba-dashboard-stats">
          {metrics.map((label) => (
            <section className="toba-stat" key={label}>
              <p>{label}</p>
              <strong>—</strong>
              <small>Run a search to see results</small>
            </section>
          ))}
        </div>
      ) : null}
      {models ? (
        <div className="grid gap-4 md:grid-cols-2">
          {["ChatGPT", "Claude", "Gemini", "Perplexity"].map((model) => (
            <section className="toba-panel min-h-44" key={model}>
              <h2>{model}</h2>
              <p className="mt-6">No answer collected yet.</p>
            </section>
          ))}
        </div>
      ) : (
        <>
          {chart ? (
            <div className="toba-dashboard-grid">
              <section className="toba-panel">
                <h2>{title}</h2>
                <div className="toba-empty-chart">
                  <p>No data to chart yet.</p>
                </div>
              </section>
              <section className="toba-panel">
                <h2>Top pages</h2>
                <p className="py-12 text-center">No pages to show yet.</p>
              </section>
            </div>
          ) : null}
          <div className={sideTitle ? "toba-dashboard-grid" : undefined}>
            <section className="toba-panel">
              <h2>{chart ? "Top organic keywords" : title}</h2>
              {columns.length ? (
                <div className="mt-4 overflow-auto rounded-xl border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted text-xs text-muted-foreground">
                      <tr>
                        {columns.map((column) => (
                          <th className="p-4 font-medium" key={column}>
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td
                          colSpan={columns.length}
                          className="p-12 text-center text-muted-foreground"
                        >
                          Run a search to see results here.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : null}
            </section>
            {sideTitle ? (
              <section className="toba-panel">
                <h2>{sideTitle}</h2>
                {["Dofollow", "Nofollow", "UGC / Sponsored"].map((label) => (
                  <div className="toba-model" key={label}>
                    {label}
                    <span>—</span>
                    <i />
                  </div>
                ))}
                <h2>Top anchors</h2>
                <p className="py-6">No anchor data yet.</p>
              </section>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
