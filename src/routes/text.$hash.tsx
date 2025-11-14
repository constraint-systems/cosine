import { Section } from "@/components/Section";
import { TextItem } from "@/components/TextItem";
import { TextItemSkeletonList } from "@/components/TextItemSkeleton";
import { getNeighborsByHash, getTextByHash } from "@/data/db-actions";
import { createFileRoute } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { baseUrl } from "@/utils/consts";

export const Route = createFileRoute("/text/$hash")({
  component: TextComponent,
  loader: async ({ params: { hash } }) => {
    const source = await getTextByHash({ data: { hash } });
    const neighborsData = await getNeighborsByHash({ data: { hash } });
    return { source, neighborsData };
  },
  pendingComponent: () => (
    <>
      <Section title="Text">
        <TextItemSkeletonList count={1} />
      </Section>
      <Section title="Neighbors">
        <TextItemSkeletonList count={5} />
      </Section>
    </>
  ),
  head: ({ loaderData, params }) => {
    const textSnippet = loaderData?.source?.text
      ? loaderData.source.text.slice(0, 60) +
        (loaderData.source.text.length > 60 ? "..." : "")
      : "Text";

    const description = loaderData?.source?.text
      ? loaderData.source.text.slice(0, 200) +
        (loaderData.source.text.length > 200 ? "..." : "")
      : "View this text on Cosine";

    const ogImageUrl = baseUrl + `/api/og/${params.hash}`;

    return {
      meta: [
        {
          title: `${textSnippet} - Cosine`,
        },
        {
          name: "description",
          content: description,
        },
        // Open Graph meta tags
        {
          property: "og:title",
          content: `${textSnippet} - Cosine`,
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
          content: `${textSnippet} - Cosine`,
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

function TextComponent() {
  const { source: initialSource, neighborsData } = Route.useLoaderData();
  const { session } = Route.useRouteContext();
  const { hash } = Route.useParams();

  // Use query for source text so it can be refetched when pinned/unpinned
  const { data: source } = useQuery({
    queryKey: ["text", hash],
    queryFn: async () => {
      console.log("Fetching text by hash:", hash);
      return await getTextByHash({ data: { hash } });
    },
    initialData: initialSource,
  });

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["neighbors", hash],
      queryFn: async ({ pageParam }) => {
        return await getNeighborsByHash({
          data: { hash, offset: pageParam },
        });
      },
      initialPageParam: 0,
      getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
      initialData: {
        pages: [neighborsData],
        pageParams: [0],
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

  // Flatten all pages and calculate cumulative ranks
  const allNeighbors = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <>
      <Section title="Text">
        <TextItem
          focused
          text={source.text}
          hash={source.hash}
          metadata={source.metadata}
          isClickable={false}
          currentUserId={session?.user?.id}
        />
      </Section>
      <Section title="Neighbors">
        <div>
          {allNeighbors.map((entry, index) => (
            <TextItem
              key={entry.hash}
              rank={index + 1}
              text={entry.text}
              hash={entry.hash}
              metadata={entry.metadata}
              distance={entry.distance}
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
          {!hasNextPage && allNeighbors.length > 0 && (
            <div className="pt-3 pb-6 px-4 text-muted text-sm">
              <span className="text-muted">The end</span> &middot;{" "}
              {allNeighbors.length + 1} texts embedded so far
            </div>
          )}
        </div>
      </Section>
    </>
  );
}
