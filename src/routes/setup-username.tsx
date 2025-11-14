import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { authClient } from "../lib/auth-client";
import { useState } from "react";
import {
  checkUsernameAvailability,
  setUsername as setUsernameAction,
} from "@/data/username-actions";
import { Section } from "@/components/Section";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";

// Server function to fetch session with proper SSR support
const getSession = createServerFn({ method: "GET" }).handler(async () => {
  const { headers } = getRequest();
  const session = await auth.api.getSession({
    headers,
  });
  return session;
});

export const Route = createFileRoute("/setup-username")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session?.user) {
      throw redirect({ to: "/" });
    }
    // // If user already has a username, redirect to home
    // if ((session.user as any).username) {
    //   throw redirect({ to: '/' })
    // }
  },
  component: SetupUsernamePage,
});

function SetupUsernamePage() {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const checkAvailability = async (value: string) => {
    if (value.length < 3) {
      setIsAvailable(null);
      return;
    }

    setIsChecking(true);
    setError("");

    try {
      const result = await checkUsernameAvailability({
        data: { username: value },
      });
      setIsAvailable(result.available);
      if (!result.available && result.error) {
        setError(result.error);
      } else if (!result.available) {
        setError("Username is already taken");
      }
    } catch (err) {
      setError("Failed to check username availability");
      setIsAvailable(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "");
    setUsername(value);
    setError("");
    setIsAvailable(null);

    // Debounce the availability check
    if (value.length >= 3) {
      const timeoutId = setTimeout(() => checkAvailability(value), 500);
      return () => clearTimeout(timeoutId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    if (isAvailable === false) {
      setError("Please choose an available username");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await setUsernameAction({
        data: { username },
      });

      // Redirect to home page
      navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set username");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <Section title="Set Username">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col py-1 border-b border-faint px-3 gap-2"
        >
          <div className="text-sm text-muted pt-2 pb-1">
            Pick a unique username for your profile. This will be used in your
            profile URL.
          </div>

          <div>
            <div className="relative">
              <input
                id="username"
                type="text"
                value={username}
                onChange={handleUsernameChange}
                placeholder="username"
                className="bg-extra-faint border border-faint text-fg block w-full px-2 py-1 focus:outline-none"
                required
                minLength={3}
                maxLength={20}
                pattern="[a-z0-9_-]+"
                autoFocus
              />
              {isChecking && (
                <div className="absolute right-2 top-1.5 text-muted">
                  <div className="animate-spin h-4 w-4 border-2 border-muted border-t-transparent rounded-full"></div>
                </div>
              )}
              {!isChecking && isAvailable === true && username.length >= 3 && (
                <div className="absolute right-2 top-1.5 text-muted">✓</div>
              )}
            </div>
            <div className="mt-2 text-xs text-extra-muted">
              3-20 characters, letters, numbers, underscores, or hyphens only
            </div>
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
          </div>

          <div className="flex py-1 justify-end">
            <button
              type="submit"
              disabled={
                isSubmitting ||
                !username ||
                username.length < 3 ||
                isAvailable === false
              }
              className={`text-muted font-mono text-sm ${
                isSubmitting ||
                !username ||
                username.length < 3 ||
                isAvailable === false
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:text-fg cursor-pointer"
              }`}
            >
              {isSubmitting ? "Setting..." : "Continue"}
            </button>
          </div>
        </form>
      </Section>
    </div>
  );
}
