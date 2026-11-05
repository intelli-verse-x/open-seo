import {
  Table,
  TableBody,
  TableCard,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { Link } from "@tanstack/react-router";
import { Globe, Search } from "lucide-react";
import { EmptyState } from "@/client/components/EmptyState";
import { RecentSearches } from "@/client/components/RecentSearches";
import { LOCATIONS } from "@/client/features/keywords/utils";
import type { KeywordResearchControllerState } from "./types";

type Props = {
  controller: KeywordResearchControllerState;
  projectId: string;
};

export function KeywordResearchEmptyState({ controller, projectId }: Props) {
  // The page renders loading and error states before this component.
  if (controller.hasSearched) {
    return <NoResultsState controller={controller} />;
  }

  return <SearchHistoryState controller={controller} projectId={projectId} />;
}

function NoResultsState({
  controller,
}: {
  controller: KeywordResearchControllerState;
}) {
  const { lastSearchKeyword, lastSearchLocationCode } = controller;

  return (
    <TableCard>
      <h2 className="mb-3 text-base font-semibold">Keyword ideas</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Keyword</TableHead>
            <TableHead>Intent</TableHead>
            <TableHead>Volume</TableHead>
            <TableHead>KD</TableHead>
            <TableHead>CPC</TableHead>
            <TableHead>Trend</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={6}>
              <EmptyState
                variant="plain"
                icon={Globe}
                title="Not enough keyword data for this query yet"
                description={
                  <>
                    We could not find keyword opportunities for
                    <span className="font-medium text-foreground">
                      {` "${lastSearchKeyword}" `}
                    </span>
                    in
                    <span className="font-medium text-foreground">
                      {` ${LOCATIONS[lastSearchLocationCode] || "this location"}`}
                    </span>
                    .
                  </>
                }
              />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableCard>
  );
}

function SearchHistoryState({
  controller,
  projectId,
}: {
  controller: KeywordResearchControllerState;
  projectId: string;
}) {
  return (
    <div className="pt-1">
      <RecentSearches
        items={controller.history}
        loaded={controller.historyLoaded}
        onRemove={controller.removeHistoryItem}
        emptyIcon={Search}
        emptyTitle="Enter a keyword to get started"
        emptyDescription="Search for any keyword to see volume, difficulty, CPC, and related keyword ideas."
        getTitle={(item) => item.keyword}
        getSubtitle={(item) => item.locationName}
        renderLink={(item, props) => (
          <Link
            from="/p/$projectId/keywords"
            to="/p/$projectId/keywords"
            params={{ projectId }}
            search={{
              q: item.keyword,
              loc: item.locationCode,
              locName: item.localLocationName,
              grp: controller.preferredGroupKeywords ? true : undefined,
            }}
            replace
            {...props}
          />
        )}
      />
    </div>
  );
}
