export function TextItemSkeleton() {
  return (
    <div className="flex flex-col gap-3 border-b px-4 py-3 border-faint">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2 w-full">
          <div className="relative">
            {/* Skeleton text lines */}
            <div className="font-serif space-y-2">
              <div className="h-5 bg-faint rounded animate-pulse w-full" />
              <div className="h-5 bg-faint rounded animate-pulse w-[95%]" />
              <div className="h-5 bg-faint rounded animate-pulse w-[90%]" />
              <div className="h-5 bg-faint rounded animate-pulse w-[85%]" />
            </div>
          </div>
        </div>
      </div>
      <div className="text-muted flex flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <div className="text-sm flex items-center gap-2">
            {/* Skeleton username and timestamp */}
            <div className="h-4 bg-faint rounded animate-pulse w-24" />
            <div className="h-4 bg-faint rounded animate-pulse w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function TextItemSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <TextItemSkeleton key={i} />
      ))}
    </>
  );
}
