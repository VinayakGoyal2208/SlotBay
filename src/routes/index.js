import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { SITE_URL } from "@/lib/site";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CarFront,
  Clock3,
  MapPin,
  ShieldCheck,
  Sparkles,
  LocateFixed,
  Map,
  List,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import { SiteShell, Badge } from "@/components/SiteShell";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { ParkingGuides } from "@/components/ParkingGuides";
import { ScrollJourney } from "@/components/ScrollJourney";
import { slotImage, toSlot } from "@/lib/parking";
import { listListings, searchListings, checkAvailability } from "@/lib/listings-api";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { ParkingMap } from "@/components/ParkingMap";
import { indiaDate, nextIndiaDate, availabilitySchema } from "@/lib/availability";
import { toast } from "sonner";
import { ParkingSearch } from "@/components/ParkingSearch";
import heroImage from "@/assets/slotbay-hero.webp";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SlotBay — Private parking near Bengaluru metro stations" },
      {
        name: "description",
        content:
          "Find and reserve verified private parking by the hour, day or month across Bengaluru.",
      },
      { property: "og:title", content: "SlotBay — Private parking, right where you need it" },
      {
        property: "og:description",
        content:
          "Find and reserve verified parking near metro stations, offices and neighbourhoods.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: SITE_URL + "/" },
    ],
    links: [{ rel: "canonical", href: SITE_URL + "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "SlotBay",
          url: SITE_URL + "/",
          description: "Find verified private parking across Bengaluru.",
        }),
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(listingsQuery),
  errorComponent: ({ error }) =>
    _jsx(SiteShell, {
      children: _jsxs("p", {
        className: "p-10",
        children: ["Could not load spaces: ", String(error?.message ?? error)],
      }),
    }),
  notFoundComponent: () =>
    _jsx(SiteShell, { children: _jsx("p", { className: "p-10", children: "Not found." }) }),
  component: Index,
});
const listingsQuery = queryOptions({
  queryKey: ["listings"],
  queryFn: () => listListings(),
});
function Index() {
  const [vehicle, setVehicle] = useState("all");
  const [date, setDate] = useState(nextIndiaDate());
  const [time, setTime] = useState("09:00");
  const [hours, setHours] = useState(1);
  const [mapView, setMapView] = useState(() => window.matchMedia("(min-width: 768px)").matches);
  const [tripOpen, setTripOpen] = useState(false);
  const [location, setLocation] = useState(null);
  const [page, setPage] = useState(1);
  const discovery = useQuery({
    queryKey: ["search", vehicle, location, page],
    queryFn: () =>
      searchListings({
        page: String(page),
        ...(vehicle === "all" ? {} : { vehicle }),
        ...(location ? { lat: String(location.lat), lng: String(location.lng) } : {}),
      }),
  });
  const visibleIds = discovery.data?.data.map((d) => d.row.id) ?? [];
  const validSearch = availabilitySchema.safeParse({ date, start: time, hours }).success;
  const [locating, setLocating] = useState(false);
  const availability = useQuery({
    enabled: validSearch && !!discovery.data,
    ...{
      queryKey: ["availability", date, time, hours, visibleIds],
      queryFn: () => checkAvailability({ data: { date, start: time, hours, ids: visibleIds } }),
      refetchInterval: 30000,
    },
  });
  const locate = () => {
    if (locating) return;
    if (!navigator.geolocation) {
      toast.error("Location is unavailable on this device");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false);
        setPage(1);
        setLocation({ lat: p.coords.latitude, lng: p.coords.longitude });
      },
      () => {
        setLocating(false);
        toast.error("Location permission denied. Search by area instead.");
      },
      { timeout: 10000 },
    );
  };
  const { data = [], error: listingsError } = useQuery(listingsQuery);
  const SLOTS = useMemo(
    () =>
      (discovery.data?.data ?? data).map((d) => ({
        ...toSlot(d.row, d.image),
        available: availability.data?.find((a) => a.id === d.row.id)?.available ?? 0,
      })),
    [data, discovery.data, availability.data],
  );
  const results = useMemo(
    () => (validSearch && !availability.error ? SLOTS.filter((s) => s.available > 0) : []),
    [SLOTS, validSearch, availability.error],
  );
  return _jsxs(SiteShell, {
    children: [
      listingsError
        ? _jsxs("p", {
            role: "alert",
            className: "p-5 text-center",
            children: ["Could not load spaces: ", listingsError.message],
          })
        : null,
      _jsxs("section", {
        className: "website-hero",
        children: [
          _jsxs("div", {
            className: "website-hero-copy",
            children: [
              _jsxs("p", {
                className: "website-eyebrow",
                children: [_jsx("span", {}), " A better way to park in Bengaluru"],
              }),
              _jsxs("h1", {
                children: [
                  "Less circling.",
                  _jsx("br", {}),
                  _jsx("em", { children: "More living." }),
                ],
              }),
              _jsx("p", {
                className: "website-hero-description",
                children:
                  "A spot near your next stop. Discover verified private parking and reserve before you leave.",
              }),
              _jsxs("div", {
                className: "home-search-panel",
                children: [
                  _jsx(ParkingSearch, { date: date, start: time, hours: hours, vehicle: vehicle }),
                  _jsxs("button", {
                    type: "button",
                    className: "trip-toggle",
                    "aria-expanded": tripOpen,
                    "aria-controls": "trip-filters",
                    onClick: () => setTripOpen(!tripOpen),
                    children: [
                      _jsx(SlidersHorizontal, { className: "size-4" }),
                      _jsxs("span", {
                        children: [
                          date,
                          " \u00B7 ",
                          time,
                          " \u00B7 ",
                          hours,
                          " hr \u00B7 ",
                          vehicle === "all" ? "Any vehicle" : vehicle,
                        ],
                      }),
                      _jsx(ChevronDown, { className: `size-4 ${tripOpen ? "rotate-180" : ""}` }),
                    ],
                  }),
                  _jsxs("div", {
                    id: "trip-filters",
                    className: `trip-filters ${tripOpen ? "is-open" : ""}`,
                    children: [
                      _jsx(Field, {
                        icon: _jsx(CalendarDays, {}),
                        label: "Date",
                        children: _jsx("input", {
                          "aria-label": "Date",
                          type: "date",
                          min: indiaDate(),
                          value: date,
                          onChange: (e) => setDate(e.target.value),
                          className: "field-control",
                        }),
                      }),
                      _jsx(Field, {
                        icon: _jsx(Clock3, {}),
                        label: "Arrival",
                        children: _jsx("input", {
                          "aria-label": "Arrival",
                          type: "time",
                          value: time,
                          onChange: (e) => setTime(e.target.value),
                          className: "field-control",
                        }),
                      }),
                      _jsx(Field, {
                        icon: _jsx(Clock3, {}),
                        label: "Duration (hours)",
                        children: _jsx("input", {
                          "aria-label": "Duration (hours)",
                          type: "number",
                          min: 1,
                          max: 720,
                          value: hours,
                          onChange: (e) => setHours(Number(e.target.value)),
                          className: "field-control",
                        }),
                      }),
                      _jsx(Field, {
                        icon: _jsx(CarFront, {}),
                        label: "Vehicle",
                        children: _jsxs("select", {
                          "aria-label": "Vehicle",
                          value: vehicle,
                          onChange: (e) => {
                            setPage(1);
                            setVehicle(e.target.value);
                          },
                          className: "field-control",
                          children: [
                            _jsx("option", { value: "all", children: "Any vehicle" }),
                            _jsx("option", { value: "4W", children: "Car / 4-wheeler" }),
                            _jsx("option", { value: "2W", children: "2-wheeler" }),
                          ],
                        }),
                      }),
                    ],
                  }),
                  !validSearch &&
                    _jsx("p", {
                      role: "alert",
                      className: "px-3 pb-3 text-sm text-destructive",
                      children: "Choose a valid date, time and duration of 1\u2013720 hours.",
                    }),
                ],
              }),
              _jsxs("div", {
                className: "website-hero-links",
                children: [
                  _jsxs("a", {
                    href: "#spaces",
                    children: ["Explore parking ", _jsx(ArrowRight, { className: "size-4" })],
                  }),
                  _jsx(Link, { to: "/how-it-works", children: "How it works" }),
                ],
              }),
            ],
          }),
          _jsxs("div", {
            className: "website-hero-photo",
            children: [
              _jsx("img", {
                src: heroImage,
                fetchPriority: "high",
                decoding: "async",
                width: 1920,
                height: 1080,
                alt: "A parking space beside a Bengaluru metro station at dusk",
                className: "hero-drift",
              }),
              _jsxs("span", {
                className: "hero-photo-label",
                children: [_jsx(MapPin, { className: "size-4" }), " Bengaluru, at your pace"],
              }),
              _jsxs("div", {
                className: "hero-photo-caption",
                children: [
                  _jsx("span", { children: "A place for your car." }),
                  _jsx("strong", { children: "More time for you." }),
                ],
              }),
            ],
          }),
        ],
      }),
      _jsxs("section", {
        className: "website-promises",
        "aria-label": "Why park with SlotBay",
        children: [
          _jsxs("div", {
            children: [
              _jsx(ShieldCheck, {}),
              _jsxs("span", {
                children: [
                  _jsx("strong", { children: "Verified spaces" }),
                  _jsx("small", { children: "Real locations. Reviewed owners." }),
                ],
              }),
            ],
          }),
          _jsxs("div", {
            children: [
              _jsx(Sparkles, {}),
              _jsxs("span", {
                children: [
                  _jsx("strong", { children: "Yours in a moment" }),
                  _jsx("small", { children: "Instant confirmation when a bay is free." }),
                ],
              }),
            ],
          }),
          _jsxs("div", {
            children: [
              _jsx(Clock3, {}),
              _jsxs("span", {
                children: [
                  _jsx("strong", { children: "Stay on your terms" }),
                  _jsx("small", { children: "By the hour, day or month." }),
                ],
              }),
            ],
          }),
        ],
      }),
      _jsxs("section", {
        id: "spaces",
        className: "parking-catalog mx-auto max-w-7xl px-5 py-20",
        children: [
          _jsxs(Reveal, {
            className: "mb-8 flex flex-wrap items-end justify-between gap-4",
            children: [
              _jsxs("div", {
                children: [
                  _jsxs("p", {
                    className: "text-xs font-bold uppercase text-primary",
                    children: [results.length, " spaces available"],
                  }),
                  _jsx("h2", {
                    className: "mt-2 text-3xl font-bold sm:text-5xl",
                    children: "Find your place in the city.",
                  }),
                ],
              }),
              _jsx("p", {
                className: "max-w-sm text-sm leading-6 text-muted-foreground",
                children:
                  "Real spaces from verified owners, with clear prices and availability before you arrive.",
              }),
            ],
          }),
          _jsxs("div", {
            className: "mb-6 flex flex-wrap items-center gap-3",
            children: [
              _jsxs(Button, {
                disabled: locating,
                variant: "outline",
                onClick: locate,
                children: [_jsx(LocateFixed, {}), " ", locating ? "Locating…" : "Near me"],
              }),
              location &&
                _jsx(Button, {
                  variant: "ghost",
                  onClick: () => {
                    setPage(1);
                    setLocation(null);
                  },
                  children: "Clear location",
                }),
              _jsxs(Button, {
                variant: "outline",
                onClick: () => setMapView(!mapView),
                children: [
                  mapView ? _jsx(List, {}) : _jsx(Map, {}),
                  mapView ? "List only" : "Show map",
                ],
              }),
              availability.isFetching &&
                _jsx("span", {
                  className: "text-sm text-muted-foreground",
                  children: "Checking availability\u2026",
                }),
              !validSearch &&
                _jsx("span", {
                  role: "alert",
                  className: "text-destructive",
                  children: "Enter a valid date, time and duration of 1\u2013720 hours.",
                }),
              availability.error &&
                _jsx("span", {
                  role: "alert",
                  className: "text-destructive",
                  children: "Could not check availability. Please retry.",
                }),
            ],
          }),
          mapView &&
            _jsx("div", {
              className: "mb-8",
              children: _jsx(ParkingMap, {
                slots: results,
                location: location,
                search: { date, start: time, hours, ...(vehicle === "all" ? {} : { vehicle }) },
              }),
            }),
          _jsx("div", {
            className: "space-y-8",
            children: Array.from(new Set(results.map((s) => s.hostId ?? s.owner))).map((host) =>
              _jsxs(
                "section",
                {
                  className: "space-y-4",
                  children: [
                    _jsx("div", {
                      className:
                        "flex flex-wrap items-center justify-between gap-3 border-l-4 border-primary pl-4",
                      children: _jsxs("div", {
                        children: [
                          _jsxs("h3", {
                            className: "text-xl font-bold",
                            children: [
                              "Hosted by ",
                              results.find((s) => (s.hostId ?? s.owner) === host)?.owner,
                            ],
                          }),
                          _jsxs("p", {
                            className: "mt-1 text-xs text-muted-foreground",
                            children: [
                              results.filter((s) => (s.hostId ?? s.owner) === host).length,
                              " available locations \u00B7 host ",
                              host.slice(-6).toUpperCase(),
                            ],
                          }),
                        ],
                      }),
                    }),
                    _jsx("div", {
                      className: "grid gap-5 md:grid-cols-2 lg:grid-cols-3",
                      children: results
                        .filter((s) => (s.hostId ?? s.owner) === host)
                        .map((s, i) =>
                          _jsx(
                            Reveal,
                            {
                              delay: i * 80,
                              children: _jsxs("article", {
                                className:
                                  "parking-card group overflow-hidden rounded-lg border bg-card transition-transform duration-300 hover:-translate-y-1",
                                children: [
                                  _jsxs(Link, {
                                    to: "/slot/$id",
                                    params: { id: s.id },
                                    search: {
                                      date,
                                      start: time,
                                      hours,
                                      ...(vehicle === "all" ? {} : { vehicle }),
                                    },
                                    className:
                                      "parking-card-image relative block aspect-[4/3] overflow-hidden",
                                    children: [
                                      _jsx("img", {
                                        src: slotImage(s),
                                        width: 1200,
                                        height: 800,
                                        loading: "lazy",
                                        alt: `${s.title} parking space`,
                                        className:
                                          "size-full object-cover transition-transform duration-700 group-hover:scale-105",
                                      }),
                                      _jsx("div", {
                                        className:
                                          "absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent",
                                      }),
                                      _jsxs("div", {
                                        className:
                                          "parking-badges absolute left-4 top-4 flex gap-2",
                                        children: [
                                          s.verified &&
                                            _jsx(Badge, { tone: "primary", children: "Verified" }),
                                          s.autoApprove &&
                                            _jsx(Badge, { tone: "accent", children: "Instant" }),
                                        ],
                                      }),
                                      _jsxs("div", {
                                        className:
                                          "parking-image-price absolute bottom-4 right-4 rounded-md bg-background/90 px-3 py-2 backdrop-blur",
                                        children: [
                                          _jsxs("span", {
                                            className: "font-display text-xl font-bold",
                                            children: ["\u20B9", s.hourly],
                                          }),
                                          _jsx("span", {
                                            className: "text-xs text-muted-foreground",
                                            children: " / hour",
                                          }),
                                          _jsxs("span", {
                                            className:
                                              "mt-1 block text-[11px] text-muted-foreground",
                                            children: [
                                              "\u20B9",
                                              s.daily,
                                              "/day \u00B7 \u20B9",
                                              s.monthly,
                                              "/month",
                                            ],
                                          }),
                                        ],
                                      }),
                                    ],
                                  }),
                                  _jsxs("div", {
                                    className: "parking-card-body p-5",
                                    children: [
                                      _jsxs("div", {
                                        className: "flex items-start justify-between gap-3",
                                        children: [
                                          _jsxs("div", {
                                            children: [
                                              _jsx("h3", {
                                                className: "text-lg font-semibold",
                                                children: s.title,
                                              }),
                                              _jsxs("p", {
                                                className:
                                                  "mt-1 flex items-start gap-1 text-sm leading-6 text-muted-foreground",
                                                children: [
                                                  _jsx(MapPin, {
                                                    className: "mt-0.5 size-3.5 shrink-0",
                                                  }),
                                                  " ",
                                                  s.address,
                                                ],
                                              }),
                                            ],
                                          }),
                                          _jsx("span", {
                                            className: `mt-1 size-2 rounded-full ${s.available ? "bg-primary" : "bg-destructive"}`,
                                          }),
                                        ],
                                      }),
                                      _jsxs("p", {
                                        className: "parking-mobile-price",
                                        children: [
                                          "\u20B9",
                                          s.hourly,
                                          _jsxs("span", {
                                            children: [
                                              " ",
                                              "/ hour \u00B7 \u20B9",
                                              s.daily,
                                              "/day \u00B7 \u20B9",
                                              s.monthly,
                                              "/month",
                                            ],
                                          }),
                                        ],
                                      }),
                                      _jsxs("div", {
                                        className:
                                          "parking-card-footer mt-5 flex items-center justify-between border-t pt-4",
                                        children: [
                                          _jsx("span", {
                                            className: "text-xs text-muted-foreground",
                                            children: s.available
                                              ? `${s.available} bays free · ${s.window}`
                                              : "Fully booked",
                                          }),
                                          _jsxs(Link, {
                                            to: "/slot/$id",
                                            params: { id: s.id },
                                            search: {
                                              date,
                                              start: time,
                                              hours,
                                              ...(vehicle === "all" ? {} : { vehicle }),
                                            },
                                            className: "text-sm font-bold text-primary",
                                            children: [
                                              "Explore ",
                                              _jsx(ArrowRight, { className: "ml-1 inline size-4" }),
                                            ],
                                          }),
                                        ],
                                      }),
                                    ],
                                  }),
                                ],
                              }),
                            },
                            s.id,
                          ),
                        ),
                    }),
                  ],
                },
                host,
              ),
            ),
          }),
          discovery.error &&
            _jsxs("p", {
              role: "alert",
              className: "py-5 text-destructive",
              children: [
                "Search could not be loaded.",
                " ",
                _jsx(Button, {
                  variant: "outline",
                  onClick: () => discovery.refetch(),
                  children: "Retry",
                }),
              ],
            }),
          !results.length &&
            !discovery.error &&
            _jsx("p", {
              role: "status",
              className: "border-y py-16 text-center text-muted-foreground",
              children:
                discovery.isFetching || availability.isFetching
                  ? "Checking spaces for your search…"
                  : SLOTS.length
                    ? "No available spaces match on this page. Try another time, area or the next page."
                    : "No owner spaces have been published yet. Create an owner account to submit your first listing.",
            }),
          _jsxs("nav", {
            "aria-label": "Search result pages",
            className: "mt-6 flex items-center justify-center gap-4",
            children: [
              _jsx(Button, {
                variant: "outline",
                disabled: page === 1 || discovery.isFetching,
                onClick: () => setPage(page - 1),
                children: "Previous",
              }),
              _jsxs("span", { children: ["Page ", page] }),
              _jsx(Button, {
                variant: "outline",
                disabled: !discovery.data?.hasMore || discovery.isFetching,
                onClick: () => setPage(page + 1),
                children: "Next",
              }),
            ],
          }),
        ],
      }),
      _jsx(ScrollJourney, { slots: SLOTS }),
      _jsx("div", { className: "home-guides", children: _jsx(ParkingGuides, {}) }),
    ],
  });
}
function Field({ icon, label, children }) {
  return _jsxs("div", {
    className: "flex min-h-14 gap-3 rounded-md bg-background/70 px-3 py-2",
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
