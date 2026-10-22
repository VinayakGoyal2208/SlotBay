import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { SITE_URL } from "@/lib/site";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
} from "@tanstack/react-router";
import "../styles.css";
import { Button } from "@/components/ui/button";
import { Toaster } from "sonner";
function NotFoundComponent() {
  return _jsx("div", {
    className: "flex min-h-screen items-center justify-center bg-background px-4",
    children: _jsxs("div", {
      className: "max-w-md text-center",
      children: [
        _jsx("title", { children: "Page not found \u2014 SlotBay" }),
        _jsx("meta", { name: "robots", content: "noindex, follow" }),
        _jsx("h1", { className: "text-7xl font-bold text-foreground", children: "404" }),
        _jsx("h2", {
          className: "mt-4 text-xl font-semibold text-foreground",
          children: "Page not found",
        }),
        _jsx("p", {
          className: "mt-2 text-sm text-muted-foreground",
          children: "The page you're looking for doesn't exist or has been moved.",
        }),
        _jsx("div", {
          className: "mt-6",
          children: _jsx(Link, {
            to: "/",
            className:
              "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
            children: "Go home",
          }),
        }),
      ],
    }),
  });
}
function ErrorComponent({ error, reset }) {
  console.error(error);
  const router = useRouter();
  return _jsx("div", {
    className: "flex min-h-screen items-center justify-center bg-background px-4",
    children: _jsxs("div", {
      className: "max-w-md text-center",
      children: [
        _jsx("h1", {
          className: "text-xl font-semibold tracking-tight text-foreground",
          children: "This page didn't load",
        }),
        _jsx("p", {
          className: "mt-2 text-sm text-muted-foreground",
          children: "Something went wrong on our end. You can try refreshing or head back home.",
        }),
        _jsxs("div", {
          className: "mt-6 flex flex-wrap justify-center gap-2",
          children: [
            _jsx(Button, {
              onClick: () => {
                router.invalidate();
                reset();
              },
              className:
                "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
              children: "Try again",
            }),
            _jsx(Link, {
              to: "/",
              className:
                "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent",
              children: "Go home",
            }),
          ],
        }),
      ],
    }),
  });
}
export const Route = createRootRouteWithContext()({
  head: () => ({
    meta: [
      { title: "SlotBay" },
      { name: "description", content: "Rent private parking slots near metro stations." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "SlotBay" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: SITE_URL + "/og-cover.jpg" },
      { name: "twitter:image", content: SITE_URL + "/og-cover.jpg" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});
function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return _jsxs(QueryClientProvider, {
    client: queryClient,
    children: [
      _jsx(HeadContent, {}),
      _jsx(Outlet, {}),
      _jsx(Toaster, { richColors: true, position: "top-center" }),
    ],
  });
}
