import { createAuthClient } from "better-auth/react";

// Use import.meta.env for client-side, process.env for SSR
const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    // Client-side: use the current origin
    return window.location.origin;
  }
  // Server-side: use APP_URL env var
  return process.env.APP_URL || "http://localhost:3000";
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
});

export const { signIn, signOut, useSession } = authClient;
