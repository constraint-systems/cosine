import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Section } from "../components/Section";
import { TextItem } from "../components/TextItem";
import { TextItemSkeletonList } from "../components/TextItemSkeleton";
import {
  getUserByUsername,
  getUserTexts,
  getPinnedTexts,
} from "@/data/username-actions";
import { authClient } from "../lib/auth-client";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import { ThemeToggle } from "@/components/ThemeToggle";
import { baseUrl } from "@/utils/consts";

export const Route = createFileRoute("/profile/$username")({
  loader: async ({ params }) => {
    const user = await getUserByUsername({
      data: { username: params.username },
    });
    const textsData = await getUserTexts({ data: { userId: user.id } });
    const pinnedTextsData = await getPinnedTexts({ data: { userId: user.id } });
    return { user, textsData, pinnedTextsData };
  },
  head: ({ loaderData }) => {
    const username = loaderData?.user?.username || "User";
    const title = username + " - Cosine";
    const description = "Texts embedded by " + username + " on Cosine.";
    const ogImageUrl = baseUrl +
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
  component: ProfilePage,
  pendingComponent: () => (
    <div>
      <Section title="User">
        <div className="flex px-3 py-1 w-full justify-between items-center border-b border-faint">
          <div className="h-5 bg-faint rounded animate-pulse w-32" />
        </div>
      </Section>
      <Section title="Texts">
        <TextItemSkeletonList count={5} />
      </Section>
    </div>
  ),
  errorComponent: ({}) => {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-neutral-900 mb-4">404</h1>
          <p className="text-neutral-600">User not found</p>
        </div>
      </div>
    );
  },
});

function ProfilePage() {
  const { user, textsData, pinnedTextsData } = Route.useLoaderData();
  const { session } = Route.useRouteContext();
  const navigate = useNavigate();

  // Check if this is the current user's profile
  const isOwnProfile = session?.user?.id === user.id;

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["userTexts", user.id],
      queryFn: async ({ pageParam }) => {
        return await getUserTexts({
          data: { userId: user.id, cursor: pageParam },
        });
      },
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      initialData: {
        pages: [textsData],
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

  const handleSignOut = async () => {
    await authClient.signOut();
    navigate({ to: "/" });
  };

  // Flatten all pages into a single array of texts
  const allTexts = data?.pages.flatMap((page) => page.items) ?? [];

  // Fetch pinned texts
  const { data: pinnedTexts } = useQuery({
    queryKey: ["pinnedTexts", user.id],
    queryFn: async () => {
      return await getPinnedTexts({ data: { userId: user.id } });
    },
    initialData: pinnedTextsData,
  });

  // Create a set of pinned text hashes for efficient lookup
  const pinnedHashes = new Set(pinnedTexts?.map((text) => text.hash) ?? []);

  // Filter out pinned texts from the main list
  const texts = allTexts.filter((text) => !pinnedHashes.has(text.hash));

  return (
    <div>
      <Section title="User">
        <div className="flex px-3 py-2 w-full justify-between items-center border-b border-faint">
          <div>@{user.username}</div>
          {isOwnProfile && (
            <div className="flex gap-4 items-center text-sm font-mono">
              <ThemeToggle />
              <button
                onClick={handleSignOut}
                className="text-muted hover:text-fg"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </Section>
      {pinnedTexts && pinnedTexts.length > 0 && (
        <Section title="Pinned">
          <div>
            {pinnedTexts.map((entry) => (
              <TextItem
                key={entry.hash}
                hash={entry.hash}
                text={entry.text}
                metadata={entry.metadata}
                isClickable={true}
                currentUserId={session?.user?.id}
              />
            ))}
          </div>
        </Section>
      )}
      <Section title="Texts">
        {texts.length === 0 ? (
          <div className="text-neutral-500 px-2">No texts added yet</div>
        ) : (
          <div>
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
              <div className="pt-3 pb-6 px-4 text-sm text-muted">
                <span className="text-muted">The end</span> &middot;{" "}
                {pinnedHashes.size + texts.length} texts embedded so far
              </div>
            )}
          </div>
        )}
      </Section>
    </div>
  );
}
