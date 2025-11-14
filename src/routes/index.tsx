import { Section } from "../components/Section";
import { TextItem } from "../components/TextItem";
import { TextItemSkeletonList } from "../components/TextItemSkeleton";
import { getRecentTexts } from "../data/db-actions";
import { createFileRoute } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import * as React from "react";
import { baseUrl } from "@/utils/consts";

export const Route = createFileRoute("/")({
  component: App,
  loader: async () => await getRecentTexts({ data: {} }),
  pendingComponent: () => (
    <div>
      <Section title="Most recent">
        <TextItemSkeletonList count={5} />
      </Section>
    </div>
  ),
  head: () => {
    const title = "Cosine";
    const description = "Embed any text and see its nearest neighbors.";
    const ogImageUrl =
      baseUrl +
      "/api/og/fa71bb4fb9103331d5a694de519187385bf2a85e1cceeda314b5c5f8bf3723b7";
    return {
      meta: [
        {
          title: title,
        },
        {
          name: "description",
          content: description,
        },
        // Open Graph meta tags
        {
          property: "og:title",
          content: title,
        },
        {
          property: "og:description",
          content: description,
        },
        {
          property: "og:image",
          content: ogImageUrl,
        },
        {
          property: "og:type",
          content: "article",
        },
        // Twitter Card meta tags
        {
          name: "twitter:card",
          content: "summary_large_image",
        },
        {
          name: "twitter:title",
          content: title,
        },
        {
          name: "twitter:description",
          content: description,
        },
        {
          name: "twitter:image",
          content: ogImageUrl,
        },
      ],
    };
  },
});

function App() {
  const initialData = Route.useLoaderData();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["recentTexts"],
      queryFn: async ({ pageParam }) => {
        return await getRecentTexts({ data: { cursor: pageParam } });
      },
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      initialData: {
        pages: [initialData],
        pageParams: [undefined],
      },
    });

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: () => {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    hasMore: !!hasNextPage,
    isLoading: isFetchingNextPage,
  });

  // Flatten all pages into a single array of texts and deduplicate by hash
  const texts = React.useMemo(() => {
    const allTexts = data?.pages.flatMap((page) => page.items) ?? [];
    const seen = new Set<string>();
    return allTexts.filter((text) => {
      if (seen.has(text.hash)) {
        return false;
      }
      seen.add(text.hash);
      return true;
    });
  }, [data?.pages]);

  return (
    <div>
      <Section title="Most recent">
        <div className="">
          {texts.map((entry) => (
            <TextItem
              key={entry.hash}
              hash={entry.hash}
              text={entry.text}
              metadata={entry.metadata}
              isClickable={true}
            />
          ))}
          {hasNextPage && (
            <div ref={sentinelRef} className="py-2 px-4 text-muted">
              {isFetchingNextPage ? (
                <div className="text-muted">Loading more...</div>
              ) : (
                <div className="h-4" />
              )}
            </div>
          )}
          {!hasNextPage && texts.length > 0 && (
            <div className="pt-3 pb-6 px-4 text-muted text-sm">
              <span className="text-muted">The end</span> &middot;{" "}
              {texts.length} texts embedded so far
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}
