import { useNavigate, useRouter } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteText } from "../data/db-actions";
import { type Metadata } from "../db/schema";

interface DeleteButtonProps {
  hash: string;
  focused?: boolean;
  metadata: Metadata[];
  currentUserId?: string;
}

export function DeleteButton({
  hash,
  focused,
  metadata,
  currentUserId,
}: DeleteButtonProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const router = useRouter();

  const deleteMutation = useMutation({
    mutationFn: () => deleteText({ data: { textHash: hash } }),
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["text", hash] });
      await queryClient.cancelQueries({ queryKey: ["userTexts"] });
      await queryClient.cancelQueries({ queryKey: ["pinnedTexts"] });

      // Snapshot previous values
      const previousText = queryClient.getQueryData(["text", hash]);
      const previousUserTexts = queryClient.getQueryData(["userTexts"]);
      const previousPinnedTexts = queryClient.getQueryData(["pinnedTexts"]);

      // Optimistically update by marking metadata as deleted
      queryClient.setQueryData(["text", hash], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          metadata: old.metadata.map((m: Metadata) =>
            m.createdBy === currentUserId
              ? {
                  ...m,
                  deletedAt: new Date(),
                }
              : m,
          ),
        };
      });

      return { previousText, previousUserTexts, previousPinnedTexts };
    },
    onSuccess: () => {
      // If we're on the focused text page and this was the only/last metadata, navigate away
      if (focused) {
        // Check if there are other users with metadata for this text
        const otherUsersMetadata = metadata.filter(
          (m) => m.createdBy !== currentUserId,
        );

        // Only navigate away if there's no other metadata
        if (otherUsersMetadata.length === 0) {
          // Try to go back, or go to home if no history
          if (router.history.length > 1) {
            router.history.back();
          } else {
            navigate({ to: "/" });
          }
        }
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries();
    },
  });

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteMutation.mutate();
  };

  return (
    <button
      onClick={handleDeleteClick}
      className="text-muted text-sm hover:text-fg transition-all"
    >
      delete
    </button>
  );
}
