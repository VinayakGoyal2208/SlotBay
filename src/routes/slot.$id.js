import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { SITE_URL } from "@/lib/site";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarDays,
  CarFront,
  Check,
  Clock3,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { SiteShell, Badge } from "@/components/SiteShell";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { priceFor, slotImage, toSlot, vehicleLabel } from "@/lib/parking";
import { getListing, checkAvailability } from "@/lib/listings-api";
import { api } from "@/integrations/api/client";
import { useQuery } from "@tanstack/react-query";
import { availabilitySchema, indiaDate, nextIndiaDate } from "@/lib/availability";
import { useActionLock } from "@/lib/use-action-lock";
import { useMe } from "@/lib/auth";
export const Route = createFileRoute("/slot/$id")({
  validateSearch: (input) =>
    z
      .object({
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .catch(undefined),
        start: z
          .string()
          .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
          .optional()
          .catch(undefined),
        hours: z.coerce.number().int().min(1).max(720).optional().catch(undefined),
        vehicle: z.enum(["2W", "4W"]).optional().catch(undefined),
      })
      .parse(input),
  loader: async ({ params }) => {
    const r = await getListing({ data: { id: params.id } });
    if (!r) throw notFound();
    return toSlot(r.row, r.image, r.images);
  },
  head: ({ loaderData, params }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Parking space"} — SlotBay` },
      {
        name: "description",
        content: `Reserve verified parking at ${loaderData?.address ?? "SlotBay"}.`,
      },
      { property: "og:title", content: `${loaderData?.title ?? "Parking space"} — SlotBay` },
      {
        property: "og:description",
        content: `Reserve parking near ${loaderData?.landmark ?? "the metro"}.`,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: `${SITE_URL}/slot/${encodeURIComponent(params.id)}` },
      ...(!loaderData ? [{ name: "robots", content: "noindex, follow" }] : []),
      ...(loaderData?.image?.startsWith("https://")
        ? [
            { property: "og:image", content: loaderData.image },
            { name: "twitter:image", content: loaderData.image },
          ]
        : []),
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/slot/${encodeURIComponent(params.id)}` }],
    scripts: loaderData
      ? [
          {
            type: "application/ld+json",
            children: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ParkingFacility",
              name: loaderData.title,
              address: loaderData.address,
              geo: {
                "@type": "GeoCoordinates",
                latitude: loaderData.lat,
                longitude: loaderData.lng,
              },
              url: `${SITE_URL}/slot/${encodeURIComponent(params.id)}`,
            }),
          },
        ]
      : [],
  }),
  notFoundComponent: () =>
    _jsx(SiteShell, {
      children: _jsxs("p", {
        className: "mx-auto max-w-7xl p-10",
        children: [
          "Space not found.",
          " ",
          _jsx(Link, { to: "/", className: "text-primary", children: "Back to search" }),
        ],
      }),
    }),
  errorComponent: ({ error }) =>
    _jsx(SiteShell, {
      children: _jsx("p", { className: "p-10", children: String(error?.message ?? error) }),
    }),
  component: SlotPage,
});
function SlotPage() {
  const s = Route.useLoaderData();
  const search = Route.useSearch();
  const nav = useNavigate();
  const me = useMe();
  const action = useActionLock();
  const busy = action.pending;
  const [date, setDate] = useState(search.date ?? nextIndiaDate());
  const [start, setStart] = useState(search.start ?? "09:00");
  const [hours, setHours] = useState(search.hours ?? 4);
  const [selectedVehicle, setVehicle] = useState(search.vehicle);
  const registeredVehicle = useQuery({
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
  const registeredType = registeredVehicle.data?.vehicle_type;
  const vehicle =
    selectedVehicle ??
    (registeredType && s.vehicles.includes(registeredType)
      ? registeredType
      : (s.vehicles[0] ?? "4W"));
  const validSearch = availabilitySchema.safeParse({ date, start, hours }).success;
  const availability = useQuery({
    enabled: validSearch,
    queryKey: ["availability", date, start, hours, s.id],
    queryFn: () => checkAvailability({ data: { date, start, hours, ids: [s.id] } }),
    refetchInterval: 30000,
  });
  const available = availability.data?.find((a) => a.id === s.id)?.available ?? 0;
  const amount = priceFor(s, hours);
  const reserve = () =>
    action.run(async () => {
      if (!validSearch) {
        toast.error("Choose a valid date, arrival time and duration");
        return;
      }
      if (!me.user) {
        toast.error("Please sign in to reserve");
        nav({ to: "/auth" });
        return;
      }
      if (me.profile?.account_type !== "user") {
        toast.error("Use a driver account to reserve parking");
        return;
      }
      if (date < indiaDate()) {
        toast.error("Choose today or a future date");
        return;
      }
      const { data: d } = await api
        .from("driver_details")
        .select("plate,vehicle_type,status")
        .eq("user_id", me.user.id)
        .maybeSingle();
      if (!d) {
        toast.error("Add your vehicle and licence details first");
        nav({ to: "/account" });
        return;
      }
      if (d.status === "rejected") {
        toast.error("Your driver details were rejected — please correct them");
        nav({ to: "/account" });
        return;
      }
      if (!d.licence_path || !d.rc_path) {
        toast.error("Add your driving licence and vehicle RC copies first");
        nav({ to: "/account" });
        return;
      }
      if (d.vehicle_type !== vehicle) {
        toast.error(`Your registered vehicle is a ${vehicleLabel(d.vehicle_type)}`);
        return;
      }
      const { data: b, error } = await api
        .from("bookings")
        .insert({
          user_id: me.user.id,
          listing_id: s.id,
          booking_date: date,
          start_time: start,
          hours,
          vehicle,
          plate: d.plate,
        })
        .select("code,status")
        .single();
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(`Booking ${b.code} confirmed. Carry your driving licence and vehicle RC.`);
      nav({ to: "/bookings" });
    });
  return _jsxs(SiteShell, {
    children: [
      _jsxs("section", {
        className: "slot-hero cinematic relative h-[52vh] min-h-96 overflow-hidden",
        children: [
          _jsx("img", {
            src: slotImage(s),
            width: 1200,
            height: 800,
            alt: `${s.title} parking area`,
            className: "size-full object-cover",
          }),
          _jsx("div", {
            className:
              "absolute inset-0 bg-gradient-to-t from-background via-background/15 to-background/20",
          }),
          _jsxs("div", {
            className: "absolute inset-x-0 bottom-0 mx-auto max-w-7xl px-5 pb-8",
            children: [
              _jsxs(Link, {
                to: "/",
                className: "mb-6 inline-flex items-center gap-2 text-sm text-foreground/80",
                children: [_jsx(ArrowLeft, { className: "size-4" }), " Back to spaces"],
              }),
              _jsxs("div", {
                className: "flex flex-wrap gap-2",
                children: [
                  s.verified && _jsx(Badge, { tone: "primary", children: "Verified owner" }),
                  s.autoApprove && _jsx(Badge, { tone: "accent", children: "Instant booking" }),
                ],
              }),
              _jsx("h1", {
                className: "mt-3 max-w-3xl text-4xl font-bold sm:text-6xl",
                children: s.title,
              }),
              _jsxs("p", {
                className: "mt-2 flex items-center gap-2 text-foreground/75",
                children: [_jsx(MapPin, { className: "size-4" }), s.address],
              }),
            ],
          }),
        ],
      }),
      _jsxs("a", {
        href: "#reserve-space",
        className: "slot-mobile-cta",
        children: [
          _jsxs("span", {
            children: ["From ", _jsxs("strong", { children: ["\u20B9", s.hourly, "/hr"] })],
          }),
          _jsxs("span", {
            children: [
              "Check times & reserve ",
              _jsx(ArrowLeft, { className: "size-4 rotate-180" }),
            ],
          }),
        ],
      }),
      _jsxs("div", {
        className: "slot-layout mx-auto grid max-w-7xl gap-10 px-5 py-12 lg:grid-cols-[1.4fr_.8fr]",
        children: [
          _jsxs("div", {
            children: [
              s.images.length > 0 &&
                _jsxs("section", {
                  className: "mb-10",
                  children: [
                    _jsx("h2", {
                      className: "mb-4 text-2xl font-bold",
                      children: "Photos from the owner",
                    }),
                    _jsx("div", {
                      className: "grid grid-cols-2 gap-3",
                      children: s.images.map((image, i) =>
                        _jsx(
                          "a",
                          {
                            href: image,
                            target: "_blank",
                            rel: "noopener noreferrer",
                            children: _jsx("img", {
                              src: image,
                              alt: `${s.title}, owner photo ${i + 1}`,
                              loading: "lazy",
                              className: "aspect-[4/3] w-full rounded-md object-cover",
                            }),
                          },
                          image,
                        ),
                      ),
                    }),
                  ],
                }),
              _jsxs(Reveal, {
                children: [
                  _jsx("p", {
                    className: "text-xs font-bold uppercase text-primary",
                    children: "The space",
                  }),
                  _jsx("h2", {
                    className: "mt-2 text-3xl font-bold",
                    children: "Everything you need, before arrival.",
                  }),
                  _jsx("div", {
                    className:
                      "mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3",
                    children: [
                      ["Space", s.size],
                      ["Vehicles", s.vehicles.map(vehicleLabel).join(", ")],
                      ["Access", s.window],
                      ["Available", `${available} of ${s.total}`],
                      ["Landmark", `${s.landmark} · ${s.distance}`],
                      ["Host", s.owner],
                    ].map(([k, v]) =>
                      _jsxs(
                        "div",
                        {
                          className: "bg-card p-5",
                          children: [
                            _jsx("p", {
                              className: "text-[10px] font-bold uppercase text-muted-foreground",
                              children: k,
                            }),
                            _jsx("p", { className: "mt-1 font-semibold", children: v }),
                          ],
                        },
                        k,
                      ),
                    ),
                  }),
                ],
              }),
              _jsxs(Reveal, {
                className: "mt-12",
                children: [
                  _jsx("h2", {
                    className: "text-2xl font-bold",
                    children: "Included with your stay",
                  }),
                  _jsx("div", {
                    className: "mt-4 grid gap-3 sm:grid-cols-2",
                    children: s.amenities.map((a) =>
                      _jsxs(
                        "div",
                        {
                          className: "flex items-center gap-3 border-b py-3",
                          children: [
                            _jsx("span", {
                              className:
                                "grid size-7 place-items-center rounded-full bg-primary/15 text-primary",
                              children: _jsx(Check, { className: "size-4" }),
                            }),
                            a,
                          ],
                        },
                        a,
                      ),
                    ),
                  }),
                ],
              }),
              _jsxs(Reveal, {
                className: "mt-12",
                children: [
                  _jsx("h2", {
                    className: "text-2xl font-bold",
                    children: "Know exactly where to go",
                  }),
                  _jsx(Button, {
                    asChild: true,
                    variant: "outline",
                    className: "mt-3",
                    children: _jsx("a", {
                      href: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${s.lat},${s.lng}`)}`,
                      target: "_blank",
                      rel: "noopener noreferrer",
                      children: "Open directions",
                    }),
                  }),
                  _jsx("iframe", {
                    loading: "lazy",
                    title: "Map of this parking location",
                    className: "mt-5 h-80 w-full rounded-lg border grayscale-[.5]",
                    src: `https://www.openstreetmap.org/export/embed.html?bbox=${s.lng - 0.008},${s.lat - 0.005},${s.lng + 0.008},${s.lat + 0.005}&marker=${s.lat},${s.lng}`,
                  }),
                ],
              }),
            ],
          }),
          _jsxs("aside", {
            id: "reserve-space",
            className: "slot-reservation glass-panel h-fit rounded-lg p-6 lg:sticky lg:top-24",
            children: [
              _jsxs("div", {
                className: "flex items-end justify-between border-b pb-5",
                children: [
                  _jsxs("div", {
                    children: [
                      _jsx("p", { className: "text-xs text-muted-foreground", children: "From" }),
                      _jsxs("p", {
                        className: "font-display text-3xl font-bold",
                        children: [
                          "\u20B9",
                          s.hourly,
                          _jsx("span", {
                            className: "text-sm font-normal text-muted-foreground",
                            children: " / hour",
                          }),
                        ],
                      }),
                    ],
                  }),
                  _jsxs("span", {
                    className: "flex items-center gap-1 text-xs text-primary",
                    children: [_jsx(ShieldCheck, { className: "size-4" }), " Verified listing"],
                  }),
                ],
              }),
              _jsxs("div", {
                className: "mt-5 space-y-3",
                children: [
                  _jsx(Input, {
                    label: "Date",
                    icon: _jsx(CalendarDays, {}),
                    children: _jsx("input", {
                      type: "date",
                      min: indiaDate(),
                      value: date,
                      onChange: (e) => setDate(e.target.value),
                      className: "field-control",
                    }),
                  }),
                  _jsxs("div", {
                    className: "grid grid-cols-2 gap-3",
                    children: [
                      _jsx(Input, {
                        label: "Arrival",
                        icon: _jsx(Clock3, {}),
                        children: _jsx("input", {
                          type: "time",
                          value: start,
                          onChange: (e) => setStart(e.target.value),
                          className: "field-control",
                        }),
                      }),
                      _jsx(Input, {
                        label: "Duration",
                        children: _jsx("input", {
                          type: "number",
                          min: 1,
                          max: 720,
                          value: hours,
                          onChange: (e) => setHours(Number(e.target.value)),
                          className: "field-control",
                        }),
                      }),
                    ],
                  }),
                  _jsx(Input, {
                    label: "Vehicle",
                    icon: _jsx(CarFront, {}),
                    children: _jsx("select", {
                      value: vehicle,
                      onChange: (e) => setVehicle(e.target.value),
                      className: "field-control",
                      children: s.vehicles.map((v) =>
                        _jsx("option", { value: v, children: vehicleLabel(v) }, v),
                      ),
                    }),
                  }),
                ],
              }),
              _jsxs("p", {
                className: "mt-4 text-sm text-muted-foreground",
                children: [
                  "\u20B9",
                  s.daily,
                  "/day \u00B7 \u20B9",
                  s.monthly,
                  "/month \u00B7 ",
                  available,
                  " bays for selected time",
                ],
              }),
              s.rules && _jsx("p", { className: "mt-3 text-sm", children: s.rules }),
              _jsxs("div", {
                className: "mt-6 flex items-end justify-between border-t pt-5",
                children: [
                  _jsx("span", { className: "text-sm text-muted-foreground", children: "Total" }),
                  _jsxs("span", {
                    className: "font-display text-3xl font-bold",
                    children: ["\u20B9", amount.toLocaleString("en-IN")],
                  }),
                ],
              }),
              availability.error &&
                _jsx("p", {
                  role: "alert",
                  className: "mt-3 text-sm text-destructive",
                  children: "Availability could not be checked. Please retry.",
                }),
              _jsx(Button, {
                disabled:
                  me.loading ||
                  registeredVehicle.isLoading ||
                  !validSearch ||
                  !available ||
                  busy ||
                  availability.isFetching ||
                  !!availability.error,
                onClick: reserve,
                size: "lg",
                className: "mt-5 w-full",
                children: !available ? "Unavailable for selected time" : "Reserve this space",
              }),
              _jsx("p", {
                className: "mt-3 text-center text-[11px] text-muted-foreground",
                children:
                  "Instant confirmation when a bay is available. Carry your driving licence and vehicle RC. Uses your registered vehicle. Payment is not collected online.",
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
function Input({ label, icon, children }) {
  return _jsxs("label", {
    className: "flex min-h-16 gap-3 rounded-md border bg-background/70 px-3 py-2",
    children: [
      _jsx("span", { className: "mt-1 text-primary [&_svg]:size-4", children: icon }),
      _jsxs("span", {
        className: "min-w-0 flex-1",
        children: [
          _jsx("span", {
            className: "block text-[10px] font-bold uppercase text-muted-foreground",
            children: label,
          }),
          children,
        ],
      }),
    ],
  });
}
