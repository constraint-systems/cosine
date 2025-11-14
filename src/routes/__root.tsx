import {
  HeadContent,
  Scripts,
  createRootRoute,
  redirect,
  useRouterState,
} from "@tanstack/react-router";
// import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
// import { TanStackDevtools } from "@tanstack/react-devtools";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import appCss from "../styles.css?url";
import { Header } from "../components/Header";
import { auth } from "../lib/auth";
import { makeQueryClient } from "../lib/query-client";
import { useEffect, useState } from "react";
import { ThemeProvider } from "../lib/theme-context";

// Create a client that will be reused for the entire app lifecycle
let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

// Server function to fetch session with proper SSR support
const getSession = createServerFn({ method: "GET" }).handler(async () => {
  const { headers } = getRequest();
  const session = await auth.api.getSession({
    headers,
  });
  return session;
});

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    // Skip check for these routes
    const skipRoutes = ["/api", "/setup-username"];
    if (skipRoutes.some((route) => location.pathname.startsWith(route))) {
      return { session: null };
    }

    const session = await getSession();

    // If user is logged in but doesn't have a username, redirect to setup
    if (session?.user && !(session.user as any).username) {
      throw redirect({ to: "/setup-username" });
    }

    // Return session so it's available in context without flash
    return { session };
  },
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Cosine",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "512x512",
        href: "/icon512.png",
      },
      {
        rel: "manifest",
        href: "/manifest.json",
      },
    ],
  }),

  shellComponent: RootDocument,
});

function LoadingIndicator() {
  const isLoading = useRouterState({ select: (s) => s.status === "pending" });
  const [isComplete, setIsComplete] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setIsVisible(true);
      setIsComplete(false);
    } else if (isVisible) {
      setIsComplete(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-px">
      <div
        className={`h-full bg-extra-muted ${isComplete ? "animate-progress-complete" : "animate-progress"}`}
      />
    </div>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <html lang="en">
        <head>
          <HeadContent />
        </head>
        <body>
          <ThemeProvider>
            <LoadingIndicator />
            <div className="mx-auto max-w-xl [@media(min-width:576px)]:border-r [@media(min-width:576px)]:border-l border-faint min-h-screen">
              <Header />
              {children}
            </div>
          </ThemeProvider>
          <Scripts />
        </body>
      </html>
    </QueryClientProvider>
  );
}
