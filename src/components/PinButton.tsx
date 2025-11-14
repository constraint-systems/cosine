import { useMutation, useQueryClient } from "@tanstack/react-query";
import { togglePinText } from "../data/db-actions";
import { type Metadata } from "../db/schema";

interface PinButtonProps {
  hash: string;
  isPinned: boolean;
  currentUserId?: string;
}

export function PinButton({ hash, isPinned, currentUserId }: PinButtonProps) {
  const queryClient = useQueryClient();

  const pinMutation = useMutation({
    mutationFn: () => togglePinText({ data: { textHash: hash } }),
    onMutate: async () => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ["text", hash] });
      await queryClient.cancelQueries({ queryKey: ["userTexts"] });
      await queryClient.cancelQueries({ queryKey: ["pinnedTexts"] });

      // Snapshot previous values for rollback
      const previousText = queryClient.getQueryData(["text", hash]);
      const previousUserTexts = queryClient.getQueryData(["userTexts"]);
      const previousPinnedTexts = queryClient.getQueryData(["pinnedTexts"]);

      // Optimistically update the text detail page
      queryClient.setQueryData(["text", hash], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          metadata: old.metadata.map((m: Metadata) =>
            m.createdBy === currentUserId
              ? {
                  ...m,
                  pinnedAt: m.pinnedAt ? null : new Date(),
                }
              : m,
          ),
        };
      });

      return { previousText, previousUserTexts, previousPinnedTexts };
    },
    onSettled: () => {
      // Refetch to ensure consistency with server
      queryClient.invalidateQueries();
    },
  });

  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    pinMutation.mutate();
  };

  return (
    <button
      onClick={handlePinClick}
      className="text-muted text-sm hover:text-fg transition-all"
    >
      {isPinned ? "unpin" : "pin"}
    </button>
  );
}
