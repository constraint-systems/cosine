import { useEffect, useRef } from "react";

interface UseInfiniteScrollOptions {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  rootMargin?: string;
  threshold?: number;
}

export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading,
  rootMargin = "100px",
  threshold = 0.1,
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (firstEntry.isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      {
        rootMargin,
        threshold,
      }
    );

    observer.observe(sentinel);

    return () => {
      if (sentinel) {
        observer.unobserve(sentinel);
      }
    };
  }, [onLoadMore, hasMore, isLoading, rootMargin, threshold]);

  return { sentinelRef };
}
