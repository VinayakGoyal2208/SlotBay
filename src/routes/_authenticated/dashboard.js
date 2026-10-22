import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useDashboardFilter } from "@/lib/use-dashboard-filter";
import {
  DashboardHeading,
  DashboardToolbar,
  MetricCards,
  BookingSummary,
  Timestamp,
  EmptyState,
} from "@/components/DashboardKit";
import { SITE_URL } from "@/lib/site";
import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/integrations/api/client";
import { NotificationCenter } from "@/components/NotificationCenter";
import { Button } from "@/components/ui/button";
import { SiteShell } from "@/components/SiteShell";
import { useMe } from "@/lib/auth";
export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, follow" },
      { property: "og:url", content: SITE_URL + "/dashboard" },
      { title: "Dashboard — SlotBay" },
      { name: "description", content: "Your SlotBay dashboard." },
      { property: "og:title", content: "Dashboard — SlotBay" },
      { property: "og:description", content: "Your SlotBay dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: SITE_URL + "/dashboard" }],
  }),
  component: Dashboard,
});
function Dashboard() {
  const me = useMe();
  const controls = useDashboardFilter();
  const bookings = useQuery({
    queryKey: ["my-bookings", me.user?.id],
    enabled: !!me.user && me.profile?.account_type === "user",
    queryFn: async () => (await api.from("bookings").eq("user_id", me.user?.id ?? "")).data,
    refetchInterval: 30000,
  });
  const driver = useQuery({
    queryKey: ["driver", me.user?.id],
    enabled: !!me.user && me.profile?.account_type === "user",
    queryFn: async () =>
      (
        await api
          .from("driver_details")
          .eq("user_id", me.user?.id ?? "")
          .maybeSingle()
      ).data,
  });
  if (me.error)
    return _jsx(SiteShell, {
      children: _jsxs("p", {
        role: "alert",
        className: "p-10",
        children: [
          "Could not load your account. ",
          _jsx(Button, { onClick: () => me.refetch(), children: "Retry" }),
        ],
      }),
    });
  if (me.loading || !me.profile)
    return _jsx(SiteShell, {
      children: _jsx("p", { className: "p-10", children: "Loading your dashboard\u2026" }),
    });
  if (me.isAdmin) return _jsx(Navigate, { to: "/admin" });
  if (me.profile.account_type === "owner") return _jsx(Navigate, { to: "/owner" });
  const rows = bookings.data ?? [];
  const visible = controls.filter(
    rows,
    (b) =>
      `${b.code} ${b.listings?.title} ${b.listings?.address} ${b.plate} ${b.status} ${b.booking_date}`,
  );
  const ready =
    driver.data?.status !== "rejected" && !!driver.data?.licence_path && !!driver.data?.rc_path;
  return _jsx(SiteShell, {
    children: _jsxs("div", {
      className: "mx-auto max-w-6xl space-y-6 px-5 py-8",
      children: [
        _jsx(DashboardHeading, {
          eyebrow: `Welcome, ${me.profile.full_name}`,
          title: "Your next arrival, sorted.",
          description:
            "Find parking, track your reservations and keep your arrival documents ready. Bookings confirm as soon as an available bay is reserved.",
          actions: _jsxs(_Fragment, {
            children: [
              _jsx(Button, {
                asChild: true,
                children: _jsx(Link, { to: "/", children: "Find parking" }),
              }),
              _jsx(Button, {
                asChild: true,
                variant: "outline",
                children: _jsx(Link, { to: "/account", children: "My profile" }),
              }),
            ],
          }),
        }),
        _jsx(MetricCards, {
          items: [
            {
              label: "Upcoming & active",
              value: rows.filter((b) => b.status === "Confirmed").length,
              note: "Your confirmed reservations",
            },
            {
              label: "Completed stays",
              value: rows.filter((b) => b.status === "Completed").length,
            },
            { label: "All reservations", value: rows.length },
            {
              label: "Registered vehicle",
              value: driver.data?.plate ?? "Add vehicle",
              note: ready ? "Carry driving licence + RC" : "Complete your documents in My profile",
            },
          ],
        }),
        !ready &&
          _jsxs("div", {
            className:
              "flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/30 bg-primary/5 p-5",
            children: [
              _jsx("p", {
                className: "text-sm",
                children:
                  driver.data?.status === "rejected"
                    ? "Your driver record needs a correction. View the reason in your profile."
                    : "Add your driving licence and RC copies once to start booking. No approval wait.",
              }),
              _jsx(Button, {
                asChild: true,
                children: _jsx(Link, { to: "/account", children: "Complete profile" }),
              }),
            ],
          }),
        _jsxs("details", {
          className: "rounded-xl border bg-card p-4",
          children: [
            _jsx("summary", { className: "font-semibold", children: "Notifications & updates" }),
            _jsx("div", { className: "mt-3", children: _jsx(NotificationCenter, {}) }),
          ],
        }),
        _jsxs("div", {
          className: "flex flex-wrap items-center justify-between gap-3",
          children: [
            _jsx("h2", { className: "text-2xl font-bold", children: "Your reservations" }),
            _jsx(Button, {
              asChild: true,
              variant: "outline",
              children: _jsx(Link, { to: "/bookings", children: "Manage bookings & issues" }),
            }),
          ],
        }),
        _jsx(DashboardToolbar, {
          controls: controls,
          label: "Search parking, address, booking or status",
        }),
        bookings.error &&
          _jsxs("p", {
            role: "alert",
            children: [
              "Unable to load bookings. ",
              _jsx(Button, { onClick: () => bookings.refetch(), children: "Retry" }),
            ],
          }),
        _jsxs("div", {
          className: "space-y-4",
          children: [
            visible.map((b) => _jsx(BookingSummary, { booking: b }, b.id)),
            !visible.length &&
              !bookings.isLoading &&
              _jsx(EmptyState, {
                children:
                  "No matching reservations. Find a parking space to plan your next journey.",
              }),
          ],
        }),
        _jsx(Timestamp, { label: "Account registered", value: me.profile.created_at }),
      ],
    }),
  });
}
