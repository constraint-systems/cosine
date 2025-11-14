import {
  Link,
  useNavigate,
  useLocation,
  useRouteContext,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getRandomHash } from "../data/db-actions";
import { authClient } from "../lib/auth-client";

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [randomHash, setRandomHash] = useState<string | null>(null);
  const { session } = useRouteContext({ from: "__root__" });

  const handleRandomClick = () => {
    navigate({ to: `/text/${randomHash}` });
    // Refetch a new random hash for the next click
    getRandomHash().then((hash) => {
      setRandomHash(hash);
    });
  };

  const handleGoogleSignIn = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
    });
  };

  const handleGitHubSignIn = async () => {
    await authClient.signIn.social({
      provider: "github",
      callbackURL: "/",
    });
  };

  useEffect(() => {
    // Fetch a random hash on mount
    getRandomHash().then((hash) => {
      setRandomHash(hash);
    });
  }, []);

  return (
    <div className="sticky top-0 z-10 select-none">
      <div className="px-3 py-2 bg-bg relative z-1 border-b border-faint flex justify-between items-center">
        <div className="">
          {location.pathname === "/" ? (
            <div className="inline">Cosine</div>
          ) : (
            <Link to="/" className="">
              Cosine
            </Link>
          )}
        </div>
        <div className="flex font-mono gap-4 items-center text-neutral-500">
          <Link
            to={"/text/$hash"}
            params={{
              hash: "fa71bb4fb9103331d5a694de519187385bf2a85e1cceeda314b5c5f8bf3723b7",
            }}
            className={
              location.pathname ===
              "/text/fa71bb4fb9103331d5a694de519187385bf2a85e1cceeda314b5c5f8bf3723b7"
                ? "text-fg"
                : "hover:text-fg text-muted"
            }
          >
            About
          </Link>
          <button
            onClick={handleRandomClick}
            className="text-muted hover:text-fg"
            disabled={!randomHash}
          >
            Random
          </button>
          {session ? (
            <>
              <Link to="/add" className="group">
                <span
                  className={
                    location.pathname === "/add"
                      ? "text-fg"
                      : "text-muted hover:text-fg"
                  }
                >
                  Add
                </span>
              </Link>
              <Link
                to={"/profile/$username"}
                params={{ username: (session.user as any).username }}
                className={
                  location.pathname ===
                  `/profile/${(session.user as any).username}`
                    ? "text-fg"
                    : "text-muted hover:text-fg"
                }
              >
                You
              </Link>
            </>
          ) : null}
        </div>
      </div>
      {!session && location.pathname !== "/setup-username" ? (
        <div className="px-3 py-2 text-muted text-sm border-faint border-b bg-extra-faint">
          Sign in to add your own, with{" "}
          <button
            onClick={handleGoogleSignIn}
            className="hover:text-fg transition-all"
          >
            @Google
          </button>{" "}
          or{" "}
          <button
            onClick={handleGitHubSignIn}
            className="hover:text-fg transition-all"
          >
            @GitHub
          </button>
        </div>
      ) : null}
    </div>
  );
}
