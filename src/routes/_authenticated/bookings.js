import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useDashboardFilter } from "@/lib/use-dashboard-filter";
import { SITE_URL } from "@/lib/site";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { SiteShell } from "@/components/SiteShell";
import { Button } from "@/components/ui/button";
import { api } from "@/integrations/api/client";
import { useActionLock } from "@/lib/use-action-lock";
import { useMe } from "@/lib/auth";
import {
  DashboardHeading,
  DashboardToolbar,
  BookingSummary,
  EmptyState,
} from "@/components/DashboardKit";
import { ReasonDialog } from "@/components/ChangeRequests";
import { NotificationCenter } from "@/components/NotificationCenter";
export const Route = createFileRoute("/_authenticated/bookings")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, follow" },
      { property: "og:url", content: SITE_URL + "/bookings" },
      { title: "My bookings — SlotBay" },
      { name: "description", content: "Track your parking reservations." },
      { property: "og:title", content: "My bookings — SlotBay" },
      { property: "og:description", content: "Track your parking reservations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: SITE_URL + "/bookings" }],
  }),
  component: Bookings,
});
function Bookings() {
  const me = useMe();
  const action = useActionLock();
  const qc = useQueryClient();
  const controls = useDashboardFilter();
  const [issue, setIssue] = useState(null);
  const q = useQuery({
    queryKey: ["my-bookings", me.user?.id],
    enabled: !!me.user,
    queryFn: async () => (await api.from("bookings").eq("user_id", me.user?.id ?? "")).data,
    refetchInterval: 30000,
  });
  const rows = controls.filter(
    q.data ?? [],
    (b) =>
      `${b.code} ${b.status} ${b.plate} ${b.listings?.title} ${b.listings?.address} ${b.booking_date}`,
  );
  return _jsx(SiteShell, {
    children: _jsxs("div", {
      className: "mx-auto max-w-6xl space-y-6 px-5 py-8",
      children: [
        _jsx(DashboardHeading, {
          eyebrow: "Your journeys",
          title: "Bookings & history",
          description:
            "See arrival details, cancel upcoming reservations or report an issue. Bring your driving licence and vehicle RC to every booking.",
          actions: _jsx(Button, {
            asChild: true,
            children: _jsx(Link, { to: "/", children: "Find parking" }),
          }),
        }),
        _jsxs("details", {
          className: "rounded-xl border bg-card p-4",
          children: [
            _jsx("summary", { className: "font-semibold", children: "Booking notifications" }),
            _jsx("div", { className: "mt-3", children: _jsx(NotificationCenter, {}) }),
          ],
        }),
        _jsx(DashboardToolbar, {
          controls: controls,
          label: "Search booking ID, parking, vehicle, date or status",
        }),
        q.error &&
          _jsxs("p", {
            role: "alert",
            children: [
              "Could not load bookings. ",
              _jsx(Button, { onClick: () => q.refetch(), children: "Retry" }),
            ],
          }),
        rows.map((b) =>
          _jsx(
            BookingSummary,
            {
              booking: b,
              actions: _jsxs("div", {
                className: "flex flex-wrap gap-2",
                children: [
                  ["Confirmed", "Pending"].includes(b.status) &&
                    +new Date(b.starts_at ?? `${b.booking_date}T${b.start_time}:00+05:30`) >
                      q.dataUpdatedAt &&
                    _jsx(Button, {
                      variant: "outline",
                      disabled: action.pending,
                      onClick: () =>
                        action.run(async () => {
                          const { error } = await api
                            .from("bookings")
                            .update({ status: "Cancelled" })
                            .eq("id", b.id);
                          if (error) throw error;
                          toast.success("Booking cancelled");
                          await q.refetch();
                          await qc.invalidateQueries({ queryKey: ["notifications"] });
                        }),
                      children: "Cancel booking",
                    }),
                  _jsx(Button, {
                    variant: "outline",
                    onClick: () => setIssue({ id: b.id, code: b.code }),
                    children: "Report an issue",
                  }),
                ],
              }),
            },
            b.id,
          ),
        ),
        !rows.length && !q.isLoading && _jsx(EmptyState, { children: "No matching bookings." }),
        issue &&
          _jsx(
            ReasonDialog,
            {
              open: true,
              title: `Report an issue · ${issue.code}`,
              description:
                "Describe the booking problem in at least 10 characters so the administrator can help.",
              confirmLabel: "Send report",
              maxLength: 1000,
              pending: action.pending,
              onClose: () => setIssue(null),
              onConfirm: (message) =>
                action.run(async () => {
                  if (message.length < 10)
                    throw new Error("Describe the issue in at least 10 characters");
                  const { error } = await api
                    .from("disputes")
                    .insert({ user_id: me.user?.id ?? "", booking_id: issue.id, message });
                  if (error) throw error;
                  toast.success("Issue reported");
                  setIssue(null);
                }),
            },
            issue.id,
          ),
      ],
    }),
  });
}
