import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { SITE_URL } from "@/lib/site";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import cityImage from "@/assets/story-panorama.webp";
export const Route = createFileRoute("/for-owners")({
  head: () => ({
    meta: [
      { title: "List your private parking — SlotBay owners" },
      {
        name: "description",
        content:
          "Create your owner account, submit verification documents and publish your own parking photos, prices and schedule.",
      },
      { property: "og:title", content: "List your private parking — SlotBay" },
      {
        property: "og:description",
        content: "Real owner spaces, reviewed documents and flexible parking schedules.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: SITE_URL + "/for-owners" },
    ],
    links: [{ rel: "canonical", href: SITE_URL + "/for-owners" }],
  }),
  component: Page,
});
function Page() {
  return _jsxs(SiteShell, {
    children: [
      _jsxs("section", {
        className: "info-hero cinematic relative overflow-hidden px-5 py-20",
        children: [
          _jsx("img", {
            src: cityImage,
            alt: "Bengaluru streets at dusk",
            className: "absolute inset-0 size-full object-cover",
          }),
          _jsx("div", { className: "absolute inset-0 bg-background/80" }),
          _jsxs("div", {
            className: "relative mx-auto max-w-7xl",
            children: [
              _jsx("p", {
                className: "text-xs font-bold uppercase text-accent",
                children: "Your space. Your schedule.",
              }),
              _jsxs("h1", {
                className: "mt-5 max-w-3xl text-5xl font-bold sm:text-6xl",
                children: ["List your parking", _jsx("br", {}), "with SlotBay."],
              }),
              _jsx("p", {
                className: "mt-6 max-w-xl text-base leading-7 text-foreground/80",
                children:
                  "Give commuters a reliable place to arrive. You create the account and the listing; nothing is added on your behalf.",
              }),
              _jsx(Button, {
                asChild: true,
                className: "mt-8",
                children: _jsxs(Link, {
                  to: "/auth",
                  children: ["Create your owner account ", _jsx(ArrowRight, {})],
                }),
              }),
            ],
          }),
        ],
      }),
      _jsxs("section", {
        className: "info-page owner-guide mx-auto max-w-7xl px-5 py-20",
        children: [
          _jsx("h2", {
            className: "text-3xl font-bold sm:text-4xl",
            children: "From application to your first booking.",
          }),
          _jsx("div", {
            className: "mt-12 grid gap-10 md:grid-cols-2",
            children: [
              [
                "01 / Verify your ownership",
                "Submit a government ID, property proof, bank details and two to six real parking photos. The administrator reviews your documents and sends a reason if corrections are needed.",
              ],
              [
                "02 / Show your space",
                "After approval, add the address, coordinates, vehicle types and bay count. Upload a cover and additional photos, with up to six images per listing. New listings and photo changes need review.",
              ],
              [
                "03 / Set your rental details",
                "Set hourly, daily and monthly prices, opening hours and rental rules. Reservations confirm immediately when a bay is available. View the arriving driver and vehicle in your dashboard.",
              ],
              [
                "04 / Manage your availability",
                "Increase or reduce bays without invalidating reservations, block unused dates or time intervals, and archive a location when needed. Historical bookings remain available.",
              ],
            ].map(([title, copy]) =>
              _jsxs(
                "article",
                {
                  className: "border-t pt-6",
                  children: [
                    _jsx("h3", { className: "text-xl font-bold", children: title }),
                    _jsx("p", {
                      className: "mt-4 text-sm leading-7 text-muted-foreground",
                      children: copy,
                    }),
                  ],
                },
                title,
              ),
            ),
          }),
          _jsxs("div", {
            className: "mt-16 border-y py-8",
            children: [
              _jsx("h3", {
                className: "text-xl font-bold",
                children: "Clear records, not collected payments.",
              }),
              _jsx("p", {
                className: "mt-3 max-w-3xl text-sm leading-7 text-muted-foreground",
                children:
                  "Your workspace shows reservation values, booking history and status. SlotBay does not process online payments or guarantee earnings. Document format checks support manual review; they do not prove authenticity.",
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
