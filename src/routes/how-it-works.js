import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { SITE_URL } from "@/lib/site";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, CarFront, CalendarCheck, Navigation } from "lucide-react";
export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How parking reservations work — SlotBay" },
      {
        name: "description",
        content:
          "Search the map, add your vehicle, reserve a verified space and manage your arrival with SlotBay.",
      },
      { property: "og:title", content: "How parking reservations work — SlotBay" },
      {
        property: "og:description",
        content: "From finding a space to arriving: your SlotBay parking journey.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: SITE_URL + "/how-it-works" },
    ],
    links: [{ rel: "canonical", href: SITE_URL + "/how-it-works" }],
  }),
  component: Page,
});
function Page() {
  return _jsx(SiteShell, {
    children: _jsxs("section", {
      className: "info-page journey-guide mx-auto max-w-7xl px-5 py-20",
      children: [
        _jsx("p", {
          className: "text-xs font-bold uppercase text-primary",
          children: "The parking journey",
        }),
        _jsxs("h1", {
          className: "mt-4 max-w-3xl text-5xl font-bold sm:text-6xl",
          children: ["Less searching.", _jsx("br", {}), "More arriving."],
        }),
        _jsx("div", {
          className: "mt-16 divide-y",
          children: [
            [
              MapPin,
              "01",
              "Start with your destination",
              "Choose an area, arrival date, time, duration and vehicle. The map shows published spaces with availability for that interval. Nearby search uses your location only with permission; it does not track your trip.",
            ],
            [
              CarFront,
              "02",
              "Create your driver account",
              "Register your name, mobile, vehicle and driving licence numbers. Add licence and vehicle RC copies once. Registered details are locked; request corrections through the administrator.",
            ],
            [
              CalendarCheck,
              "03",
              "Choose and reserve",
              "Check the owner’s photos, bay size, access hours, prices and rental rules. Every valid reservation confirms immediately while a bay is available. No online payment is collected.",
            ],
            [
              Navigation,
              "04",
              "Stay in control",
              "Review your booking status and notifications under My bookings. Cancel upcoming reservations, open directions and report booking issues. Carry your driving licence and vehicle RC on arrival.",
            ],
          ].map(([Icon, n, title, copy]) => {
            const I = Icon;
            return _jsxs(
              "article",
              {
                className: "grid gap-5 py-10 sm:grid-cols-[80px_minmax(0,1fr)] lg:grid-cols-[80px_minmax(0,1fr)_minmax(0,1fr)]",
                children: [
                  _jsxs("div", {
                    className: "flex items-center gap-3 text-primary",
                    children: [
                      _jsx(I, { className: "size-6" }),
                      _jsx("span", { children: String(n) }),
                    ],
                  }),
                  _jsx("h2", { className: "text-2xl font-bold", children: String(title) }),
                  _jsx("p", {
                    className: "text-sm leading-7 text-muted-foreground sm:col-start-2 lg:col-start-3",
                    children: String(copy),
                  }),
                ],
              },
              String(n),
            );
          }),
        }),
        _jsx(Button, {
          asChild: true,
          className: "mt-10",
          children: _jsxs(Link, { to: "/", children: ["Find parking ", _jsx(ArrowRight, {})] }),
        }),
      ],
    }),
  });
}
