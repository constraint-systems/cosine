import { AutosizeTextarea } from "@/components/AutosizeTextarea";
import { Section } from "@/components/Section";
import { addText } from "@/data/db-actions";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/add")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/" });
    }
  },
  head: () => ({
    meta: [
      {
        title: "Add - Cosine",
      },
    ],
  }),
  component: Add,
});

function Add() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newText, setNewText] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const addTextMutation = useMutation({
    mutationFn: async (data: { text: string; notes?: string }) => {
      return await addText({ data });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries();
      navigate({ to: `/text/${data.hash}` });
    },
  });

  const handleCreateText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newText.trim()) {
      addTextMutation.mutate({
        text: newText,
        notes: newNotes || undefined,
      });
    }
  };

  return (
    <div>
      <Section title="Add Text">
        <form
          onSubmit={handleCreateText}
          className="flex flex-col py-1 border-b border-faint px-3 gap-2"
        >
          <div>
            <label htmlFor="text" className="text-sm text-muted">
              Text
            </label>
            <AutosizeTextarea
              className="bg-extra-faint border font-serif border-faint text-fg block w-full px-2 py-1 focus:outline-none"
              id="text"
              autoFocus
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              minRows={2}
              required
              placeholder="Enter your text, this will be hashed and embedded"
            />
          </div>

          <div>
            <label htmlFor="notes" className="text-sm text-muted">
              Notes
            </label>
            <AutosizeTextarea
              className="bg-extra-faint border border-faint text-fg block w-full px-2 py-1 focus:outline-none"
              id="notes"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              minRows={1}
              placeholder="Any additional notes"
            />
          </div>
          <div className="flex py-1 justify-end">
            <button
              type="submit"
              className={`text-muted font-mono cursor-pointer ${addTextMutation.isPending ? "text-fg" : "hover:text-fg"} `}
              disabled={addTextMutation.isPending}
            >
              {addTextMutation.isPending ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
      </Section>
    </div>
  );
}

export default Add;
