import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, CalendarCheck, ShieldCheck, Camera, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/Reveal";
import cityImage from "@/assets/story-panorama.webp";
export function ParkingGuides() {
  return _jsxs(_Fragment, {
    children: [
      _jsx("section", {
        className: "bg-secondary/45 px-5 py-20",
        children: _jsxs("div", {
          className: "mx-auto max-w-7xl",
          children: [
            _jsxs(Reveal, {
              children: [
                _jsx("p", {
                  className: "text-xs font-bold uppercase text-primary",
                  children: "A better arrival",
                }),
                _jsxs("h2", {
                  className: "mt-3 max-w-2xl text-4xl font-bold sm:text-5xl",
                  children: ["Your day has a destination.", _jsx("br", {}), "Your car should too."],
                }),
              ],
            }),
            _jsx("div", {
              className: "mt-12 grid gap-10 md:grid-cols-3",
              children: [
                [
                  MapPin,
                  "Find your neighbourhood",
                  "Search around a metro station, office or landmark. Use the map or your current location to narrow down your next stop.",
                ],
                [
                  CalendarCheck,
                  "Reserve your time",
                  "Choose your arrival and how long you need. Availability is checked against reservations and the owner’s access hours.",
                ],
                [
                  ShieldCheck,
                  "Arrive with the details",
                  "See the address, vehicle fit and booking status in one place. Open directions when you’re ready to leave.",
                ],
              ].map(([Icon, title, copy]) => {
                const I = Icon;
                return _jsxs(
                  Reveal,
                  {
                    children: [
                      _jsx(I, { className: "size-9 text-primary" }),
                      _jsx("h3", { className: "mt-5 text-xl font-bold", children: String(title) }),
                      _jsx("p", {
                        className: "mt-3 text-sm leading-7 text-muted-foreground",
                        children: String(copy),
                      }),
                    ],
                  },
                  String(title),
                );
              }),
            }),
            _jsx(Button, {
              asChild: true,
              variant: "outline",
              className: "mt-10",
              children: _jsxs(Link, {
                to: "/how-it-works",
                children: ["Explore the parking journey ", _jsx(ArrowRight, {})],
              }),
            }),
          ],
        }),
      }),
      _jsxs("section", {
        className: "cinematic relative overflow-hidden px-5 py-20 sm:py-28",
        children: [
          _jsx("img", {
            src: cityImage,
            alt: "City streets at blue hour",
            loading: "lazy",
            className: "absolute inset-0 size-full object-cover",
          }),
          _jsx("div", { className: "absolute inset-0 bg-background/80" }),
          _jsxs("div", {
            className: "relative mx-auto max-w-7xl",
            children: [
              _jsx("p", {
                className: "text-xs font-bold uppercase text-accent",
                children: "For parking owners",
              }),
              _jsxs("h2", {
                className: "mt-4 max-w-2xl text-4xl font-bold sm:text-5xl",
                children: ["An empty bay.", _jsx("br", {}), "A new possibility."],
              }),
              _jsx("p", {
                className: "mt-6 max-w-xl text-base leading-7 text-foreground/80",
                children:
                  "Create your owner account, submit your documents and share real photos of your space. Your listing goes live only after review.",
              }),
              _jsxs("div", {
                className: "mt-8 flex flex-wrap gap-6 text-sm",
                children: [
                  _jsxs("span", {
                    className: "flex items-center gap-2",
                    children: [_jsx(Camera, { className: "size-5 text-accent" }), "Your photos"],
                  }),
                  _jsxs("span", {
                    className: "flex items-center gap-2",
                    children: [_jsx(Building2, { className: "size-5 text-accent" }), "Your space"],
                  }),
                  _jsxs("span", {
                    className: "flex items-center gap-2",
                    children: [
                      _jsx(CalendarCheck, { className: "size-5 text-accent" }),
                      "Your schedule",
                    ],
                  }),
                ],
              }),
              _jsx(Button, {
                asChild: true,
                className: "mt-9",
                children: _jsxs(Link, {
                  to: "/for-owners",
                  children: ["List your parking ", _jsx(ArrowRight, {})],
                }),
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
