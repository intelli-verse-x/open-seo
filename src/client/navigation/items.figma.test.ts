import { describe, expect, it } from "vitest";
import { connectNavGroup, getProjectNavGroups } from "./items";

describe("ToBa navigation", () => {
  it("keeps existing tools reachable after the Figma regrouping", () => {
    const paths = getProjectNavGroups("project").flatMap((group) =>
      group.items.map((item) => item.to),
    );
    expect(paths).toEqual(
      expect.arrayContaining([
        "/p/$projectId",
        "/p/$projectId/keywords",
        "/p/$projectId/saved",
        "/p/$projectId/rank-tracking",
        "/p/$projectId/local-seo",
        "/p/$projectId/domain",
        "/p/$projectId/backlinks",
        "/p/$projectId/audit",
        "/p/$projectId/prompt-explorer",
        "/ai",
        "/p/$projectId/search-performance",
        "/p/$projectId/ai-visibility",
        "/p/$projectId/ai-visibility/research",
        "/p/$projectId/reports",
        "/p/$projectId/context",
        "/p/$projectId/brand-lookup",
      ]),
    );
    expect(connectNavGroup.items.map((item) => item.to)).toContain("/ai");
  });
});
