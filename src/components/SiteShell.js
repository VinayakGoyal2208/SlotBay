import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/integrations/api/client";
import { useActionLock } from "@/lib/use-action-lock";
import { useMe } from "@/lib/auth";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Brand } from "./Brand";
import { useLocation } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
export function SiteShell({ children }) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const isWorkspace = ["/dashboard", "/owner", "/admin", "/account", "/bookings"].includes(
    pathname,
  );
  const isAuth = pathname === "/auth";
  const action = useActionLock();
  const [open, setOpen] = useState(false);
  const me = useMe();
  const qc = useQueryClient();
  const go = useNavigate();
  const nav = [{ to: "/", label: me.user ? "Home" : "Find parking" }];
  if (me.user) {
    if (me.profile?.account_type === "admin")
      nav.push({ to: "/admin", label: "Admin dashboard" }, { to: "/account", label: "Profile" });
    else if (me.profile?.account_type === "owner")
      nav.push(
        { to: "/owner", label: "Owner dashboard" },
        { to: "/account", label: "Profile & support" },
      );
    else if (me.profile)
      nav.push(
        { to: "/dashboard", label: "My dashboard" },
        { to: "/bookings", label: "My bookings" },
        { to: "/account", label: "My profile" },
      );
  } else if (me.ready)
    nav.push(
      { to: "/how-it-works", label: "How it works" },
      { to: "/for-owners", label: "For owners" },
      { to: "/auth", label: "Sign in" },
    );
  const signOut = () =>
    action.run(async () => {
      await qc.cancelQueries();
      qc.clear();
      const { error } = await api.auth.signOut();
      if (error) throw error;
      setOpen(false);
      await go({ to: "/auth", replace: true });
    });
  return _jsxs("div", {
    className: `site-shell min-h-screen flex flex-col ${isWorkspace ? "workspace-shell" : ""} ${isAuth ? "auth-shell" : ""}`,
    children: [
      _jsx("a", {
        href: "#main-content",
        className:
          "sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded focus:bg-background focus:p-3",
        children: "Skip to content",
      }),
      _jsxs("header", {
        className:
          "site-header sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl",
        children: [
          _jsxs("div", {
            className:
              "site-header-inner mx-auto max-w-7xl px-5 h-18 flex items-center justify-between gap-4",
            children: [
              _jsx(Link, {
                to: "/",
                className: "flex min-w-0 shrink-0 items-center gap-3",
                children: _jsx(Brand, {}),
              }),
              _jsxs("nav", {
                "aria-label": "Main navigation",
                className: "hidden lg:flex items-center gap-1 text-sm font-medium",
                children: [
                  nav.map((n) =>
                    _jsx(
                      Link,
                      {
                        to: n.to,
                        activeOptions: { exact: true },
                        className:
                          "rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                        activeProps: { className: "rounded-md px-3 py-2 bg-muted text-primary" },
                        children: n.label,
                      },
                      n.to,
                    ),
                  ),
                  me.user &&
                    _jsx(Button, {
                      variant: "ghost",
                      disabled: action.pending,
                      onClick: signOut,
                      className:
                        "rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground",
                      children: action.pending ? "Signing out…" : "Sign out",
                    }),
                ],
              }),
              _jsxs("div", {
                className: "mobile-header-actions lg:hidden",
                children: [
                  !me.user &&
                    pathname !== "/auth" &&
                    _jsx(Link, { to: "/auth", className: "mobile-signin", children: "Sign in" }),
                  me.user &&
                    _jsx(Link, {
                      to: "/account",
                      className: "mobile-avatar",
                      "aria-label": "Open my profile",
                      children: me.profile?.full_name?.slice(0, 1).toUpperCase() ?? "S",
                    }),
                  _jsx(Button, {
                    variant: "ghost",
                    size: "icon",
                    className: "lg:hidden",
                    "aria-expanded": open,
                    "aria-controls": "mobile-navigation",
                    "aria-label": open ? "Close navigation" : "Open navigation",
                    onClick: () => setOpen(!open),
                    children: open ? _jsx(X, {}) : _jsx(Menu, {}),
                  }),
                ],
              }),
            ],
          }),
          open &&
            _jsxs("nav", {
              id: "mobile-navigation",
              "aria-label": "Mobile navigation",
              className: "mobile-menu border-t border-border bg-background px-5 py-3 lg:hidden",
              onKeyDown: (event) => {
                if (event.key === "Escape") setOpen(false);
              },
              children: [
                nav.map((n) =>
                  _jsx(
                    Link,
                    {
                      to: n.to,
                      onClick: () => setOpen(false),
                      className:
                        "block rounded-md px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                      children: n.label,
                    },
                    n.to,
                  ),
                ),
                me.user &&
                  _jsx(Button, {
                    variant: "ghost",
                    disabled: action.pending,
                    onClick: signOut,
                    className:
                      "block w-full rounded-md px-3 py-3 text-left text-sm font-medium text-muted-foreground hover:bg-muted",
                    children: action.pending ? "Signing out…" : "Sign out",
                  }),
              ],
            }),
        ],
      }),
      _jsx("main", {
        id: "main-content",
        tabIndex: -1,
        className: `flex-1 ${isWorkspace ? "workspace-main" : ""}`,
        children: children,
      }),
      !isAuth &&
        _jsx("footer", {
          className: "site-footer border-t border-border bg-card",
          children: _jsxs("div", {
            className:
              "mx-auto max-w-7xl px-5 py-10 flex flex-wrap justify-between gap-4 text-sm text-muted-foreground",
            children: [
              _jsx(Brand, { compact: true }),
              _jsx("span", { children: "Park closer. Arrive calmer. Bengaluru, India." }),
            ],
          }),
        }),
    ],
  });
}
export function Badge({ children, tone = "muted" }) {
  const t = {
    muted: "bg-muted text-muted-foreground",
    primary: "bg-primary text-primary-foreground",
    accent: "bg-accent text-accent-foreground",
    signal: "bg-signal text-signal-foreground",
  }[tone];
  return _jsx("span", {
    className: `inline-flex rounded-sm px-2 py-1 text-[10px] uppercase font-bold ${t}`,
    children: children,
  });
}
