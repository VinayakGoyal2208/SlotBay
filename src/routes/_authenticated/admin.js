import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useDashboardFilter } from "@/lib/use-dashboard-filter";
import { SITE_URL } from "@/lib/site";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { SiteShell } from "@/components/SiteShell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { StatusPill } from "@/components/Form";
import { api, request } from "@/integrations/api/client";
import { useActionLock } from "@/lib/use-action-lock";
import { useMe } from "@/lib/auth";
import { AdminReports } from "@/components/AdminReports";
import { idNumberValid, namesMatch } from "@/lib/validation";
import {
  DashboardHeading,
  DashboardSections,
  DashboardToolbar,
  MetricCards,
  Timestamp,
  BookingSummary,
  EmptyState,
} from "@/components/DashboardKit";
import { FilePreview } from "@/components/UploadPicker";
import { ReasonDialog } from "@/components/ChangeRequests";
export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, follow" },
      { property: "og:url", content: SITE_URL + "/admin" },
      { title: "Admin — SlotBay" },
      {
        name: "description",
        content: "Verify owners, drivers and listings; monitor bookings and disputes.",
      },
      { property: "og:title", content: "Admin — SlotBay" },
      {
        property: "og:description",
        content: "Verify owners, drivers and listings; monitor bookings and disputes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: SITE_URL + "/admin" }],
  }),
  component: Admin,
});
function Admin() {
  const me = useMe();
  if (me.loading)
    return _jsx(SiteShell, {
      children: _jsx("p", { className: "p-10", children: "Loading administrator account\u2026" }),
    });
  if (!me.isAdmin)
    return _jsx(SiteShell, {
      children: _jsx("p", { className: "p-10", children: "Administrator access required." }),
    });
  return _jsx(AdminPanel, {});
}
function AdminPanel() {
  const [section, setSection] = useState("owners");
  const action = useActionLock();
  const qc = useQueryClient();
  const controls = useDashboardFilter();
  const [decision, setDecision] = useState(null);
  const profiles = useQuery({
    queryKey: ["a-profiles"],
    queryFn: async () => (await api.from("profiles")).data,
  });
  const apps = useQuery({
    queryKey: ["a-apps"],
    queryFn: async () => (await api.from("owner_applications")).data,
  });
  const drivers = useQuery({
    queryKey: ["a-drivers"],
    queryFn: async () => (await api.from("driver_details")).data,
  });
  const listings = useQuery({
    queryKey: ["a-listings"],
    queryFn: async () => (await api.from("listings")).data,
  });
  const bookings = useQuery({
    queryKey: ["a-bookings"],
    queryFn: async () => (await api.from("bookings")).data,
  });
  const disputes = useQuery({
    queryKey: ["a-disputes"],
    queryFn: async () => (await api.from("disputes")).data,
  });
  const changes = useQuery({
    queryKey: ["a-changes"],
    queryFn: () => request("/change-requests"),
  });
  const byId = Object.fromEntries((profiles.data ?? []).map((p) => [p.id, p]));
  const person = (id) =>
    `${byId[id]?.full_name ?? "Account"} ${byId[id]?.email ?? ""} ${byId[id]?.phone ?? ""}`;
  const refresh = () =>
    Promise.all(
      [
        "a-apps",
        "a-drivers",
        "a-profiles",
        "a-listings",
        "a-changes",
        "a-disputes",
        "platform-report",
      ].map((key) => qc.invalidateQueries({ queryKey: [key] })),
    );
  const review = (kind, id, status, reason = null) =>
    action.run(async () => {
      const { error } = await api
        .from(kind === "owner" ? "owner_applications" : "driver_details")
        .update({ status, admin_note: reason })
        .eq("user_id", id);
      if (error) throw error;
      toast.success("Review saved");
      setDecision(null);
      await refresh();
    });
  const saveDecision = (reason) => {
    if (!decision) return;
    if (decision.kind === "request")
      void action.run(async () => {
        await request(`/change-requests/${decision.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: decision.status, admin_note: reason }),
        });
        toast.success("Change request resolved");
        setDecision(null);
        await refresh();
      });
    else void review(decision.kind, decision.id, decision.status, reason);
  };
  const owners = controls.filter(
    apps.data ?? [],
    (a) => `${person(a.user_id)} ${a.place_address} ${a.status}`,
  );
  const driverRows = controls.filter(
    drivers.data ?? [],
    (d) => `${person(d.user_id)} ${d.plate} ${d.licence_number} ${d.status}`,
  );
  const places = controls.filter(
    listings.data ?? [],
    (l) =>
      `${l.owner_name} ${l.title} ${l.address} ${l.id} ${l.verified ? "published" : "pending"} ${l.archived ? "archived" : ""}`,
  );
  const hosts = Array.from(new Set(places.map((l) => l.owner_id)));
  const stays = controls.filter(
    bookings.data ?? [],
    (b) =>
      `${b.code} ${b.plate} ${b.status} ${b.listings?.title} ${b.arrival?.full_name} ${person(b.user_id)}`,
  );
  const accounts = controls.filter(
    profiles.data ?? [],
    (p) => `${p.full_name} ${p.email} ${p.phone} ${p.account_type}`,
  );
  const reports = controls.filter(
    disputes.data ?? [],
    (d) => `${person(d.user_id)} ${d.message} ${d.status}`,
  );
  const requests = controls.filter(
    changes.data ?? [],
    (r) => `${person(r.user_id)} ${r.message} ${r.category} ${r.status}`,
  );
  const exportReport = () => {
    const rows = [
      [
        "Booking",
        "Location",
        "Driver",
        "Vehicle",
        "Arrival IST date",
        "Arrival IST time",
        "Created UTC",
        "Updated UTC",
        "Status",
        "Amount INR",
      ],
      ...stays.map((b) => [
        b.code,
        b.listings?.title ?? "",
        b.arrival?.full_name ?? "",
        b.plate,
        b.booking_date,
        b.start_time,
        b.created_at ?? "",
        b.updated_at ?? "",
        b.status,
        String(b.amount),
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map(
            (v) =>
              '"' +
              String(v)
                .replace(/^[=+@-]/, "'")
                .replaceAll('"', '""') +
              '"',
          )
          .join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "slotbay-bookings.csv";
    link.click();
    URL.revokeObjectURL(url);
  };
  return _jsx(SiteShell, {
    children: _jsxs("div", {
      className: "mx-auto max-w-7xl space-y-6 px-5 py-8",
      children: [
        _jsx(DashboardHeading, {
          eyebrow: "Platform administration",
          title: "Review, manage, resolve",
          description:
            "Start with owner reviews and change requests. Drivers are active at registration; reservations confirm immediately when bays are available.",
          actions: _jsx(Button, {
            variant: "outline",
            onClick: () => {
              void refresh();
              void bookings.refetch();
            },
            children: "Refresh records",
          }),
        }),
        _jsx(MetricCards, {
          items: [
            {
              label: "Owner reviews",
              value: apps.data?.filter((a) => a.status === "pending").length ?? 0,
              note: "Applications awaiting your decision",
            },
            {
              label: "Change requests",
              value: changes.data?.filter((r) => r.status === "Open").length ?? 0,
              note: "Locked profile corrections",
            },
            {
              label: "Published locations",
              value: listings.data?.filter((l) => l.verified && !l.archived).length ?? 0,
              note: `${listings.data?.length ?? 0} locations across all owners`,
            },
            {
              label: "Open disputes",
              value: disputes.data?.filter((d) => d.status === "Open").length ?? 0,
              note: "Booking issues to resolve",
            },
          ],
        }),
        _jsx(DashboardToolbar, {
          controls: controls,
          label: "Search names, emails, vehicles, addresses or references",
        }),
        [profiles, apps, drivers, listings, bookings, disputes, changes].some((q) => q.error) &&
          _jsx("p", {
            role: "alert",
            className: "rounded border border-destructive p-4",
            children: "Some records could not be loaded. Use Refresh records to try again.",
          }),
        _jsxs(Tabs, {
          value: section,
          onValueChange: setSection,
          children: [
            _jsx(DashboardSections, {
              value: section,
              onChange: setSection,
              options: [
                { value: "owners", label: "Owners" },
                { value: "changes", label: "Change requests" },
                { value: "drivers", label: "Drivers" },
                { value: "listings", label: "Parking locations" },
                { value: "users", label: "Accounts" },
                { value: "bookings", label: "Bookings" },
                { value: "disputes", label: "Disputes" },
                { value: "reports", label: "Reports & pricing" },
              ],
            }),
            _jsxs(TabsContent, {
              value: "owners",
              className: "mt-5 space-y-4",
              children: [
                owners.map((a) => {
                  const p = byId[a.user_id];
                  return _jsxs(
                    "article",
                    {
                      className: "rounded-2xl border bg-card p-5",
                      children: [
                        _jsxs("div", {
                          className: "flex flex-wrap items-start justify-between gap-3",
                          children: [
                            _jsxs("div", {
                              children: [
                                _jsx("h2", {
                                  className: "text-lg font-bold",
                                  children: p?.full_name ?? "Owner",
                                }),
                                _jsxs("p", {
                                  className: "mt-1 text-sm text-muted-foreground",
                                  children: [p?.email, " \u00B7 ", p?.phone],
                                }),
                                _jsx(Timestamp, { label: "Registered", value: p?.created_at }),
                                _jsx(Timestamp, { label: "Submitted", value: a.submitted_at }),
                              ],
                            }),
                            _jsx(StatusPill, { status: a.status }),
                          ],
                        }),
                        _jsxs("details", {
                          className: "mt-4 rounded-xl border p-4",
                          children: [
                            _jsx("summary", {
                              className: "font-semibold",
                              children: "View profile, property & ID documents",
                            }),
                            _jsxs("div", {
                              className: "mt-4 space-y-4 text-sm",
                              children: [
                                _jsx("p", { children: a.place_address }),
                                _jsxs("div", {
                                  className: "grid gap-3 sm:grid-cols-2",
                                  children: [
                                    _jsxs("p", {
                                      children: [
                                        "ID: ",
                                        a.id_type?.toUpperCase(),
                                        " \u00B7 ",
                                        a.id_number,
                                      ],
                                    }),
                                    _jsxs("p", {
                                      children: [
                                        "Property document:",
                                        " ",
                                        (a.property_doc_type ?? "Not supplied").replaceAll(
                                          "_",
                                          " ",
                                        ),
                                      ],
                                    }),
                                    _jsxs("p", {
                                      children: ["Account holder: ", a.account_holder],
                                    }),
                                    _jsxs("p", {
                                      children: [
                                        "Bank account: \u2022\u2022\u2022\u2022",
                                        a.account_number?.slice(-4),
                                        " \u00B7 ",
                                        a.ifsc,
                                      ],
                                    }),
                                  ],
                                }),
                                _jsxs("p", {
                                  className: "text-xs text-muted-foreground",
                                  children: [
                                    "Format check:",
                                    " ",
                                    idNumberValid(a.id_type, a.id_number)
                                      ? "Needs attention"
                                      : "Pass",
                                    " \u00B7 Bank name:",
                                    " ",
                                    p && namesMatch(a.account_holder, p.full_name)
                                      ? "Matches"
                                      : "Needs attention",
                                    ". These checks do not verify document authenticity.",
                                  ],
                                }),
                                _jsxs("div", {
                                  className: "flex flex-wrap gap-4",
                                  children: [
                                    a.id_doc_path &&
                                      _jsx(FilePreview, {
                                        path: a.id_doc_path,
                                        label: "ID document",
                                      }),
                                    a.property_doc_path &&
                                      _jsx(FilePreview, {
                                        path: a.property_doc_path,
                                        label: "Property proof",
                                      }),
                                    a.photo_paths.map((path, i) =>
                                      _jsx(
                                        FilePreview,
                                        { path: path, label: `Place photo ${i + 1}` },
                                        path,
                                      ),
                                    ),
                                  ],
                                }),
                                a.admin_note &&
                                  _jsxs("p", { children: ["Review reason: ", a.admin_note] }),
                                _jsx(Timestamp, { label: "Last review", value: a.reviewed_at }),
                              ],
                            }),
                          ],
                        }),
                        _jsxs("div", {
                          className: "mt-4 flex flex-wrap gap-2",
                          children: [
                            _jsx(Button, {
                              disabled: action.pending || a.status === "approved",
                              onClick: () => review("owner", a.user_id, "approved"),
                              children: "Approve owner",
                            }),
                            _jsx(Button, {
                              variant: "outline",
                              disabled: action.pending || a.status === "rejected",
                              onClick: () =>
                                setDecision({
                                  kind: "owner",
                                  id: a.user_id,
                                  name: p?.full_name ?? "owner",
                                  status: "rejected",
                                }),
                              children: "Reject with reason",
                            }),
                          ],
                        }),
                      ],
                    },
                    a.user_id,
                  );
                }),
                !owners.length && _jsx(EmptyState, { children: "No matching owner applications." }),
              ],
            }),
            _jsxs(TabsContent, {
              value: "drivers",
              className: "mt-5 space-y-4",
              children: [
                _jsx("p", {
                  className: "text-sm text-muted-foreground",
                  children:
                    "Drivers do not wait for approval. Use Restrict only when a record needs correction, and explain the reason.",
                }),
                driverRows.map((d) => {
                  const p = byId[d.user_id];
                  return _jsxs(
                    "article",
                    {
                      className: "rounded-xl border bg-card p-5",
                      children: [
                        _jsxs("div", {
                          className: "flex flex-wrap justify-between gap-3",
                          children: [
                            _jsxs("div", {
                              children: [
                                _jsx("h2", {
                                  className: "font-bold",
                                  children: p?.full_name ?? "Driver",
                                }),
                                _jsxs("p", {
                                  className: "mt-1 text-sm text-muted-foreground",
                                  children: [
                                    d.plate,
                                    " \u00B7 ",
                                    d.vehicle_type,
                                    " \u00B7 ",
                                    p?.phone,
                                  ],
                                }),
                                _jsx(Timestamp, { value: p?.created_at, label: "Registered" }),
                              ],
                            }),
                            _jsx(StatusPill, {
                              status: d.status === "rejected" ? "rejected" : "Active",
                            }),
                          ],
                        }),
                        _jsxs("details", {
                          className: "mt-4 rounded border p-4",
                          children: [
                            _jsx("summary", {
                              className: "text-sm font-semibold",
                              children: "View driver profile & documents",
                            }),
                            _jsxs("div", {
                              className: "mt-3 space-y-3 text-sm",
                              children: [
                                _jsxs("p", { children: [p?.email, " \u00B7 ", p?.phone] }),
                                _jsxs("p", { children: ["Driving licence: ", d.licence_number] }),
                                _jsxs("div", {
                                  className: "flex flex-wrap gap-4",
                                  children: [
                                    d.licence_path
                                      ? _jsx(FilePreview, {
                                          path: d.licence_path,
                                          label: "Driving licence",
                                        })
                                      : _jsx("p", { children: "Licence copy not uploaded yet" }),
                                    d.rc_path
                                      ? _jsx(FilePreview, { path: d.rc_path, label: "Vehicle RC" })
                                      : _jsx("p", { children: "RC copy not uploaded yet" }),
                                  ],
                                }),
                                d.admin_note &&
                                  _jsxs("p", { children: ["Review reason: ", d.admin_note] }),
                                _jsx(Timestamp, { value: d.updated_at, label: "Last updated" }),
                              ],
                            }),
                          ],
                        }),
                        _jsx("div", {
                          className: "mt-3 flex gap-2",
                          children:
                            d.status === "rejected"
                              ? _jsx(Button, {
                                  disabled: action.pending,
                                  onClick: () => review("driver", d.user_id, "approved"),
                                  children: "Restore driver",
                                })
                              : _jsx(Button, {
                                  variant: "outline",
                                  disabled: action.pending,
                                  onClick: () =>
                                    setDecision({
                                      kind: "driver",
                                      id: d.user_id,
                                      name: p?.full_name ?? "driver",
                                      status: "rejected",
                                    }),
                                  children: "Restrict with reason",
                                }),
                        }),
                      ],
                    },
                    d.user_id,
                  );
                }),
                !driverRows.length && _jsx(EmptyState, { children: "No matching drivers." }),
              ],
            }),
            _jsxs(TabsContent, {
              value: "listings",
              className: "mt-5 space-y-6",
              children: [
                hosts.map((host) =>
                  _jsxs(
                    "section",
                    {
                      className: "space-y-3",
                      children: [
                        _jsx("div", {
                          className:
                            "flex flex-wrap justify-between gap-2 border-l-4 border-primary pl-4",
                          children: _jsxs("div", {
                            children: [
                              _jsx("h2", {
                                className: "text-xl font-bold",
                                children:
                                  byId[host ?? ""]?.full_name ??
                                  places.find((l) => l.owner_id === host)?.owner_name ??
                                  "Owner",
                              }),
                              _jsxs("p", {
                                className: "text-xs text-muted-foreground",
                                children: [
                                  "Host ",
                                  host?.slice(-6).toUpperCase(),
                                  " \u00B7",
                                  " ",
                                  places.filter((l) => l.owner_id === host).length,
                                  " matching locations",
                                ],
                              }),
                            ],
                          }),
                        }),
                        _jsx("div", {
                          className: "grid gap-4 lg:grid-cols-2",
                          children: places
                            .filter((l) => l.owner_id === host)
                            .map((s) =>
                              _jsxs(
                                "article",
                                {
                                  className: "rounded-2xl border bg-card p-5",
                                  children: [
                                    _jsxs("div", {
                                      className: "flex flex-wrap justify-between gap-2",
                                      children: [
                                        _jsx("h3", {
                                          className: "text-lg font-bold",
                                          children: s.title,
                                        }),
                                        _jsx(StatusPill, {
                                          status: s.archived
                                            ? "Archived"
                                            : s.verified
                                              ? "Published"
                                              : "pending",
                                        }),
                                      ],
                                    }),
                                    _jsx("p", {
                                      className: "mt-2 text-sm leading-6 text-muted-foreground",
                                      children: s.address,
                                    }),
                                    _jsxs("p", {
                                      className: "mt-3 text-sm",
                                      children: [
                                        s.total,
                                        " bays \u00B7 \u20B9",
                                        s.hourly,
                                        "/hr \u00B7 \u20B9",
                                        s.daily,
                                        "/day \u00B7 \u20B9",
                                        s.monthly,
                                        "/month",
                                      ],
                                    }),
                                    _jsx(Timestamp, { value: s.created_at, label: "Listed" }),
                                    _jsx(Timestamp, { value: s.updated_at, label: "Updated" }),
                                    _jsxs("details", {
                                      className: "mt-4 rounded border p-3",
                                      children: [
                                        _jsx("summary", {
                                          className: "text-sm font-semibold",
                                          children: "Review location, rules & photos",
                                        }),
                                        _jsxs("div", {
                                          className: "mt-3 space-y-3 text-sm",
                                          children: [
                                            _jsxs("p", {
                                              children: [
                                                s.lat,
                                                ", ",
                                                s.lng,
                                                " \u00B7 ",
                                                s.vehicles.join(", "),
                                                " \u00B7 ",
                                                s.size,
                                                " \u00B7",
                                                " ",
                                                s.open_window,
                                              ],
                                            }),
                                            _jsx("p", {
                                              children: s.rental_rules || "No additional rules",
                                            }),
                                            _jsx("p", { children: s.amenities.join(", ") }),
                                            _jsx("div", {
                                              className: "flex flex-wrap gap-4",
                                              children: [s.photo_url, ...s.photo_paths]
                                                .filter((p) => !!p)
                                                .map((path, i) =>
                                                  _jsx(
                                                    FilePreview,
                                                    {
                                                      bucket: "listing-photos",
                                                      path: path,
                                                      label:
                                                        i === 0 ? "Cover photo" : `Gallery ${i}`,
                                                    },
                                                    path,
                                                  ),
                                                ),
                                            }),
                                          ],
                                        }),
                                      ],
                                    }),
                                    _jsxs("div", {
                                      className: "mt-4 flex flex-wrap gap-2",
                                      children: [
                                        _jsx(Button, {
                                          disabled: action.pending || s.archived,
                                          onClick: () =>
                                            action.run(async () => {
                                              const { error } = await api
                                                .from("listings")
                                                .update({ verified: !s.verified })
                                                .eq("id", s.id);
                                              if (error) throw error;
                                              await listings.refetch();
                                            }),
                                          children: s.verified ? "Unpublish" : "Verify & publish",
                                        }),
                                        _jsx(Button, {
                                          variant: "outline",
                                          disabled: action.pending,
                                          onClick: () =>
                                            action.run(async () => {
                                              const { error } = await api
                                                .from("listings")
                                                .update({ archived: !s.archived })
                                                .eq("id", s.id);
                                              if (error) throw error;
                                              await listings.refetch();
                                            }),
                                          children: s.archived ? "Restore location" : "Archive",
                                        }),
                                      ],
                                    }),
                                  ],
                                },
                                s.id,
                              ),
                            ),
                        }),
                      ],
                    },
                    host ?? "unknown",
                  ),
                ),
                !places.length && _jsx(EmptyState, { children: "No matching parking locations." }),
              ],
            }),
            _jsxs(TabsContent, {
              value: "users",
              className: "mt-5 space-y-3",
              children: [
                accounts.map((p) =>
                  _jsxs(
                    "article",
                    {
                      className:
                        "flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-5",
                      children: [
                        _jsxs("div", {
                          children: [
                            _jsxs("h2", {
                              className: "font-bold",
                              children: [
                                p.full_name || "Account",
                                " ",
                                _jsx("span", {
                                  className: "ml-2 text-xs font-normal capitalize text-primary",
                                  children: p.account_type === "user" ? "Driver" : p.account_type,
                                }),
                              ],
                            }),
                            _jsxs("p", {
                              className: "mt-1 text-sm text-muted-foreground",
                              children: [p.email, " \u00B7 ", p.phone],
                            }),
                            _jsx(Timestamp, { label: "Registered", value: p.created_at }),
                            _jsx(Timestamp, { label: "Updated", value: p.updated_at }),
                          ],
                        }),
                        p.account_type !== "admin" &&
                          _jsx(Button, {
                            variant: "outline",
                            disabled: action.pending,
                            onClick: () =>
                              action.run(async () => {
                                const { error } = await api
                                  .from("profiles")
                                  .update({ suspended: !p.suspended })
                                  .eq("id", p.id);
                                if (error) throw error;
                                await refresh();
                              }),
                            children: p.suspended ? "Restore account" : "Suspend account",
                          }),
                      ],
                    },
                    p.id,
                  ),
                ),
                !accounts.length && _jsx(EmptyState, { children: "No matching accounts." }),
              ],
            }),
            _jsxs(TabsContent, {
              value: "bookings",
              className: "mt-5 space-y-4",
              children: [
                stays.map((b) => _jsx(BookingSummary, { booking: b, showDriver: true }, b.id)),
                !stays.length && _jsx(EmptyState, { children: "No matching bookings." }),
              ],
            }),
            _jsxs(TabsContent, {
              value: "disputes",
              className: "mt-5 space-y-4",
              children: [
                reports.map((d) =>
                  _jsxs(
                    "article",
                    {
                      className: "rounded-xl border bg-card p-5",
                      children: [
                        _jsxs("div", {
                          className: "flex flex-wrap justify-between gap-3",
                          children: [
                            _jsx("h2", {
                              className: "font-bold",
                              children: byId[d.user_id]?.full_name ?? "Driver",
                            }),
                            _jsx(StatusPill, { status: d.status }),
                          ],
                        }),
                        _jsx("p", { className: "my-3 text-sm", children: d.message }),
                        _jsxs("p", {
                          className: "mb-2 text-xs text-muted-foreground",
                          children: [
                            "Booking reference:",
                            " ",
                            bookings.data?.find((b) => b.id === d.booking_id)?.code ?? d.booking_id,
                          ],
                        }),
                        _jsx(Timestamp, { value: d.created_at, label: "Reported" }),
                        _jsx(Timestamp, { value: d.updated_at, label: "Updated" }),
                        d.status === "Open" &&
                          _jsx(Button, {
                            className: "mt-3",
                            disabled: action.pending,
                            onClick: () =>
                              action.run(async () => {
                                const { error } = await api
                                  .from("disputes")
                                  .update({ status: "Resolved" })
                                  .eq("id", d.id);
                                if (error) throw error;
                                await disputes.refetch();
                              }),
                            children: "Mark resolved",
                          }),
                      ],
                    },
                    d.id,
                  ),
                ),
                !reports.length && _jsx(EmptyState, { children: "No matching disputes." }),
              ],
            }),
            _jsxs(TabsContent, {
              value: "changes",
              className: "mt-5 space-y-4",
              children: [
                requests.map((r) =>
                  _jsxs(
                    "article",
                    {
                      className: "rounded-xl border bg-card p-5",
                      children: [
                        _jsxs("div", {
                          className: "flex flex-wrap justify-between gap-3",
                          children: [
                            _jsxs("h2", {
                              className: "font-bold",
                              children: [
                                byId[r.user_id]?.full_name ?? "Account",
                                " \u00B7",
                                " ",
                                _jsxs("span", {
                                  className: "capitalize",
                                  children: [r.category, " correction"],
                                }),
                              ],
                            }),
                            _jsx(StatusPill, { status: r.status }),
                          ],
                        }),
                        _jsx("p", { className: "my-3 text-sm", children: r.message }),
                        _jsx(Timestamp, { value: r.created_at, label: "Submitted" }),
                        _jsxs("details", {
                          className: "mt-3 rounded border p-4",
                          children: [
                            _jsx("summary", {
                              className: "text-sm font-semibold",
                              children: "Review proposed changes & documents",
                            }),
                            _jsx("dl", {
                              className: "mt-3 grid gap-3 text-sm sm:grid-cols-2",
                              children: Object.entries(r.proposed)
                                .filter(
                                  ([key]) => !key.endsWith("_path") && !key.endsWith("_paths"),
                                )
                                .map(([key, value]) =>
                                  _jsxs(
                                    "div",
                                    {
                                      children: [
                                        _jsx("dt", {
                                          className: "capitalize text-muted-foreground",
                                          children: key.replaceAll("_", " "),
                                        }),
                                        _jsx("dd", {
                                          className: "break-words",
                                          children:
                                            key === "account_number"
                                              ? "••••" + String(value).slice(-4)
                                              : String(value),
                                        }),
                                      ],
                                    },
                                    key,
                                  ),
                                ),
                            }),
                            _jsx("div", {
                              className: "mt-4 flex flex-wrap gap-4",
                              children: Object.entries(r.proposed)
                                .filter(([key]) => key.endsWith("_path") || key.endsWith("_paths"))
                                .flatMap(([key, value]) =>
                                  (Array.isArray(value) ? value : [value])
                                    .filter((p) => typeof p === "string")
                                    .map((path, i) =>
                                      _jsx(
                                        FilePreview,
                                        {
                                          path: path,
                                          label: `${key.replaceAll("_", " ")} ${i + 1}`,
                                        },
                                        path,
                                      ),
                                    ),
                                ),
                            }),
                          ],
                        }),
                        r.admin_note &&
                          _jsxs("p", {
                            className: "mt-3 text-sm",
                            children: ["Response: ", r.admin_note],
                          }),
                        r.resolved_at &&
                          _jsx(Timestamp, { value: r.resolved_at, label: "Resolved" }),
                        r.status === "Open" &&
                          _jsxs("div", {
                            className: "mt-4 flex flex-wrap gap-2",
                            children: [
                              _jsx(Button, {
                                disabled: action.pending,
                                onClick: () =>
                                  setDecision({
                                    kind: "request",
                                    id: r.id,
                                    name: byId[r.user_id]?.full_name ?? "account",
                                    status: "Approved",
                                  }),
                                children: "Approve & apply correction",
                              }),
                              _jsx(Button, {
                                disabled: action.pending,
                                variant: "outline",
                                onClick: () =>
                                  setDecision({
                                    kind: "request",
                                    id: r.id,
                                    name: byId[r.user_id]?.full_name ?? "account",
                                    status: "Rejected",
                                  }),
                                children: "Reject with reason",
                              }),
                            ],
                          }),
                      ],
                    },
                    r.id,
                  ),
                ),
                !requests.length && _jsx(EmptyState, { children: "No matching change requests." }),
              ],
            }),
            _jsxs(TabsContent, {
              value: "reports",
              className: "mt-5 space-y-5",
              children: [
                _jsx(AdminReports, {}),
                _jsxs("section", {
                  className: "rounded-xl border bg-card p-5",
                  children: [
                    _jsx("h2", { className: "text-xl font-bold", children: "Booking export" }),
                    _jsxs("p", {
                      className: "my-3 text-sm text-muted-foreground",
                      children: [
                        "Exports ",
                        stays.length,
                        " bookings matching the search and sort above, including registration references and event timestamps.",
                      ],
                    }),
                    _jsx(Button, { onClick: exportReport, children: "Download booking CSV" }),
                  ],
                }),
              ],
            }),
          ],
        }),
        decision &&
          _jsx(
            ReasonDialog,
            {
              open: true,
              title:
                decision.status === "Approved"
                  ? "Apply requested correction"
                  : `Explain the decision for ${decision.name}`,
              description:
                decision.status === "Approved"
                  ? "Review the proposed details before applying them. Uniqueness and existing booking checks still apply."
                  : "The account holder will receive this reason privately in their notifications and profile.",
              pending: action.pending,
              confirmLabel:
                decision.status === "Approved" ? "Approve & apply" : "Save reason & reject",
              maxLength: decision.kind === "request" ? 500 : 300,
              onClose: () => setDecision(null),
              onConfirm: saveDecision,
            },
            `${decision.kind}-${decision.id}-${decision.status}`,
          ),
      ],
    }),
  });
}
