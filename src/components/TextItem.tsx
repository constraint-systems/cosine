import { Link, useNavigate } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { type Metadata } from "../db/schema";
import { PinButton } from "./PinButton";
import { DeleteButton } from "./DeleteButton";
import { useState, useRef, useEffect } from "react";

interface TextItemProps {
  focused?: boolean;
  text: string;
  hash: string;
  metadata: Metadata[];
  rank?: number;
  distance?: number;
  isClickable?: boolean;
  currentUserId?: string;
}

export function TextItem({
  focused,
  text,
  hash,
  metadata,
  rank,
  distance,
  isClickable = true,
  currentUserId,
}: TextItemProps) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  const containerClasses = `flex relative flex-col gap-3 border-b px-4 py-3 border-faint ${isClickable ? "cursor-pointer hover:bg-extra-faint transition-all" : ""}`;

  // Check if text is actually truncated
  useEffect(() => {
    if (!textRef.current || focused) {
      setIsTruncated(false);
      return;
    }

    // Check if the content is overflowing
    const element = textRef.current;
    setIsTruncated(element.scrollHeight > element.clientHeight);
  }, [text, focused]);

  // Sort metadata by creation date, most recent first
  const sortedMetadata = [...metadata].sort((a, b) => {
    if (!a.createdAt || !b.createdAt) return 0;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Check if current user has metadata for this text
  const userMetadata = currentUserId
    ? metadata.find((m) => m.createdBy === currentUserId)
    : null;

  const isPinned =
    userMetadata?.pinnedAt !== null && userMetadata?.pinnedAt !== undefined;

  const similarity = distance !== undefined ? 1 - distance : undefined;

  return (
    <div
      className={`${containerClasses}`}
      tabIndex={isClickable ? 0 : -1}
      onClick={() => {
        if (!isClickable) return;
        navigate({ to: "/text/$hash", params: { hash } });
      }}
    >
      {similarity ? (
        <div
          className="absolute left-0 -top-px bg-faint h-[3px]"
          style={{ width: `${similarity * 100}%` }}
        ></div>
      ) : null}
      <div className="flex justify-between items-start relative">
        <div className="flex flex-col gap-2">
          {rank && similarity ? (
            <div className="flex font-mono gap-[0.65ch] text-xs text-muted">
              <div className="">
                <div>{rank}</div>
              </div>
              <div>&middot;</div>
              <div>{similarity.toFixed(3)}</div>
              <div className="flex items-center tabular-nums relative border border-muted/50 px-[1ch] text-xs hidden">
                <div
                  className="absolute left-0 top-0 h-full bg-muted/20"
                  style={{ width: `${similarity * 100}%` }}
                ></div>
                <div className="relative">{similarity.toFixed(3)}</div>
              </div>
            </div>
          ) : null}
          <div className="relative">
            <div
              ref={textRef}
              className={`font-serif whitespace-pre-wrap ${focused || isExpanded ? "" : "line-clamp-16"}`}
            >
              {text}
            </div>
          </div>
          {!focused && isTruncated && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="text-muted text-sm border-t w-full text-left border-faint hover:text-fg"
            >
              show more
            </button>
          )}
        </div>
      </div>
      <div className={`text-muted flex flex-col gap-2`}>
        {sortedMetadata.map((meta) => (
          <div key={meta.id} className="flex flex-col gap-0.5">
            <div className="text-sm flex">
              <div>
                <Link
                  to="/profile/$username"
                  params={{ username: (meta as any).username }}
                  className="hover:text-fg transition-all text-muted"
                  onClick={(e) => e.stopPropagation()}
                >
                  @{(meta as any).username}
                </Link>{" "}
                &middot;{" "}
                <span className="text-extra-muted">
                  {meta.createdAt &&
                    formatDistanceToNow(new Date(meta.createdAt), {
                      addSuffix: true,
                      includeSeconds: true,
                    })
                      .replace(/^about /, "")
                      .replace(/^over /, "")
                      .replace(/^almost /, "")}{" "}
                </span>
              </div>
              {meta.createdBy === currentUserId && (
                <>
                  <div className="grow"></div>
                  <div className="flex gap-[0.45ch]">
                    <PinButton
                      hash={hash}
                      isPinned={isPinned}
                      currentUserId={currentUserId}
                    />
                    <span className="text-extra-muted">&middot;</span>
                    <DeleteButton
                      hash={hash}
                      focused={focused}
                      metadata={metadata}
                      currentUserId={currentUserId}
                    />
                  </div>
                </>
              )}
            </div>

            {meta.notes && (
              <div className="text-sm pl-0.5 whitespace-pre-wrap">
                {meta.notes}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
