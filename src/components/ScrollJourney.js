import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  CarFront,
  Check,
  CircleParking,
  Clock3,
  MapPin,
  Navigation,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { slotImage } from "@/lib/parking";
import streetImage from "@/assets/story-panorama.webp";
import garageImage from "@/assets/story-garage.webp";
import carImage from "@/assets/story-car.webp";
import sideCarImage from "@/assets/story-car-side.webp";
import { clampProgress, journeyLabels as labels, journeyMotion } from "@/lib/journey-motion";
const beats = [
  [
    "The journey begins",
    "Stop searching. Start parking.",
    "Find a verified private space before you start the drive.",
  ],
  [
    "The parking problem",
    "The city moves. Your search shouldn’t stop you.",
    "Full streets. Unclear signs. Another lap around the block. There’s a better way.",
  ],
  [
    "Find your space",
    "Where are you going?",
    "The right place, time and vehicle. A space that fits your day.",
  ],
  [
    "Discover nearby",
    "A clearer view of the city.",
    "Discover verified parking near metro stations, offices and your next stop.",
  ],
  [
    "Choose with confidence",
    "Compare. Choose. Park smarter.",
    "Clear prices, access hours and vehicle fit—before you arrive.",
  ],
  [
    "Reserve ahead",
    "A space with your name on it.",
    "Reserve in advance. See your booking status and arrive with certainty.",
  ],
  [
    "The final turn",
    "You’re almost there.",
    "Your destination is ahead. Your reserved space is waiting.",
  ],
  ["Arrive", "You’re parked.", "Less circling. More time for everything you came for."],
];
export function ScrollJourney({ slots = [] }) {
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const [active, setActive] = useState(0);
  useEffect(() => {
    let frame = null;
    let target = 0;
    let current = 0;
    let previousTime = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const paint = (time) => {
      frame = null;
      const stage = stageRef.current;
      if (!stage) return;
      const delta = Math.min(64, previousTime ? time - previousTime : 16);
      previousTime = time;
      current += (target - current) * (1 - Math.exp(-delta / 65));
      if (Math.abs(target - current) < 0.00005) current = target;
      const motion = journeyMotion(reduced.matches ? 1 : current);
      const values = {
        "--story-progress": motion.progress,
        "--street-zoom": 1 + motion.progress * 0.42,
        "--street-pan": `${(motion.x - 52) * -0.3}%`,
        "--garage-opacity": motion.garage,
        "--garage-zoom": 1.04 + motion.garage * 0.16,
        "--map-opacity": motion.map,
        "--car-x": `${motion.x}%`,
        "--car-y": `${motion.y}%`,
        "--car-scale": motion.scale,
        "--route-progress": motion.route,
        "--panel-shift": `${motion.panel}%`,
        "--world-travel": `${-motion.travel}%`,
        "--road-travel": `${-motion.travel * 6}px`,
        "--car-turn": motion.turn,
        "--portal-scale": 1 + motion.portal * 12,
        "--portal-opacity":
          Math.min(1, Math.max(0, (motion.progress - 0.65) / 0.035)) * (1 - motion.garage),
        "--feature-progress": clampProgress(((motion.progress * 8) % 1) / 0.35),
      };
      for (const [key, value] of Object.entries(values))
        stage.style.setProperty(key, String(value));
      setActive((previous) => (previous === motion.active ? previous : motion.active));
      stage.dataset["parked"] = String(motion.parked);
      if (current !== target && !reduced.matches) frame = requestAnimationFrame(paint);
    };
    const queue = () => {
      const section = sectionRef.current;
      const stage = stageRef.current;
      if (!section || !stage) return;
      const inset = parseFloat(getComputedStyle(stage).top) || 0;
      const distance = section.offsetHeight - stage.offsetHeight;
      target = clampProgress((inset - section.getBoundingClientRect().top) / Math.max(1, distance));
      if (frame === null) {
        previousTime = 0;
        frame = requestAnimationFrame(paint);
      }
    };
    queue();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    reduced.addEventListener("change", queue);
    return () => {
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      reduced.removeEventListener("change", queue);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);
  const selected = slots[0];
  return _jsx("section", {
    ref: sectionRef,
    className: "story",
    "aria-label": "SlotBay parking journey",
    children: _jsxs("div", {
      ref: stageRef,
      className: "story-stage",
      "data-stage": labels[active],
      children: [
        _jsxs("div", {
          className: "story-world",
          "aria-hidden": "true",
          children: [
            _jsx("div", {
              className: "story-city-track",
              children: [0, 1, 2].map((i) =>
                _jsx(
                  "img",
                  { src: streetImage, width: 1920, height: 1024, loading: "lazy", alt: "" },
                  i,
                ),
              ),
            }),
            _jsx("img", {
              src: garageImage,
              width: 1920,
              height: 1080,
              loading: "lazy",
              alt: "",
              className: "story-garage",
            }),
            _jsx("div", { className: "story-shade" }),
          ],
        }),
        _jsx("div", {
          className: "story-road",
          "aria-hidden": "true",
          children: _jsx("div", { className: "story-road-lines" }),
        }),
        _jsxs("div", {
          className: "story-landmarks",
          "aria-hidden": "true",
          children: [
            _jsxs("span", { children: [_jsx(MapPin, {}), " METRO STATION"] }),
            _jsxs("span", { children: [_jsx(CircleParking, {}), " PRIVATE PARKING"] }),
            _jsxs("span", { children: [_jsx(ShieldCheck, {}), " VERIFIED SPACES"] }),
          ],
        }),
        _jsx("div", {
          className: "story-portal",
          "aria-hidden": "true",
          children: _jsxs("div", {
            children: [
              _jsx(CircleParking, {}),
              _jsx("strong", { children: "SLOTBAY" }),
              _jsx("span", { children: "YOUR SPACE AHEAD" }),
            ],
          }),
        }),
        _jsx("div", {
          className: "story-heading",
          children: _jsxs("span", {
            children: [_jsx(CircleParking, {}), " SLOTBAY ", _jsx("i", {}), " THE JOURNEY"],
          }),
        }),
        _jsx("div", {
          className: "story-copy",
          "aria-live": "off",
          children: beats.map(([eyebrow, title, text], index) =>
            _jsxs(
              "article",
              {
                className: `story-beat ${active === index ? "is-current" : ""}`,
                "aria-hidden": active !== index,
                children: [
                  _jsxs("p", {
                    className: "story-eyebrow",
                    children: [String(index + 1).padStart(2, "0"), " / ", eyebrow],
                  }),
                  _jsx("h2", { children: title }),
                  _jsx("p", { className: "story-description", children: text }),
                  index === 0 &&
                    _jsx(Button, {
                      asChild: true,
                      className: "mt-6",
                      children: _jsxs("a", {
                        href: "#spaces",
                        children: ["Find parking ", _jsx(ArrowRight, {})],
                      }),
                    }),
                  index === 7 &&
                    _jsxs("div", {
                      className: "story-arrived",
                      children: [
                        _jsxs("span", { children: [_jsx(Check, {}), " Reservation confirmed"] }),
                        _jsxs("span", { children: [_jsx(ShieldCheck, {}), " Secure parking"] }),
                        _jsx(Button, {
                          asChild: true,
                          className: "mt-4",
                          children: _jsxs("a", {
                            href: "#spaces",
                            children: ["Find your space ", _jsx(ArrowRight, {})],
                          }),
                        }),
                      ],
                    }),
                ],
              },
              eyebrow,
            ),
          ),
        }),
        _jsxs("div", {
          className: `story-problem ${active === 1 ? "is-visible" : ""}`,
          "aria-hidden": active !== 1,
          children: [
            ["FULL", "NO PARKING", "RESERVED"].map((text, i) =>
              _jsxs(
                "div",
                {
                  className: `story-road-sign sign-${i}`,
                  children: [_jsx(CircleParking, {}), _jsx("strong", { children: text })],
                },
                text,
              ),
            ),
            _jsx("img", { src: carImage, alt: "", className: "story-traffic traffic-left" }),
            _jsx("img", { src: carImage, alt: "", className: "story-traffic traffic-right" }),
          ],
        }),
        _jsxs("div", {
          className: "story-map",
          "aria-hidden": "true",
          children: [
            _jsxs("svg", {
              viewBox: "0 0 1000 650",
              preserveAspectRatio: "xMidYMid slice",
              children: [
                _jsx("defs", {
                  children: _jsxs("pattern", {
                    id: "city-grid",
                    width: "130",
                    height: "105",
                    patternUnits: "userSpaceOnUse",
                    patternTransform: "rotate(-25)",
                    children: [
                      _jsx("rect", {
                        x: "10",
                        y: "10",
                        width: "108",
                        height: "80",
                        rx: "5",
                        className: "map-block",
                      }),
                      _jsx("path", { d: "M0 0H130M0 0V105", className: "map-street" }),
                    ],
                  }),
                }),
                _jsx("rect", { width: "1000", height: "650", fill: "url(#city-grid)" }),
                _jsx("path", { d: "M0 480 Q260 340 350 540 T1000 420", className: "map-river" }),
                _jsx("path", {
                  d: "M480 600L480 440L610 440L610 270L740 270L740 140",
                  className: "map-route-halo",
                }),
                _jsx("path", {
                  d: "M480 600L480 440L610 440L610 270L740 270L740 140",
                  className: "map-route",
                  pathLength: "1",
                }),
                [
                  [740, 140],
                  [620, 340],
                  [440, 250],
                  [840, 390],
                ].map(([x, y], i) =>
                  _jsxs(
                    "g",
                    {
                      transform: `translate(${x},${y})`,
                      children: [
                        _jsx("circle", { r: "20", className: "map-pin-halo" }),
                        _jsx("circle", { r: "9", className: "map-pin" }),
                      ],
                    },
                    i,
                  ),
                ),
              ],
            }),
            _jsxs("span", {
              className: "story-map-destination",
              children: [_jsx(MapPin, {}), " ", selected?.title ?? "Your next stop"],
            }),
          ],
        }),
        _jsxs("div", {
          className: `story-interface mode-${active} ${active >= 2 && active <= 5 ? "is-visible" : ""}`,
          "aria-hidden": active < 2 || active > 5,
          children: [
            _jsxs("div", {
              className: `story-ui-view story-search ${active === 2 ? "is-current" : ""}`,
              "aria-hidden": active !== 2,
              children: [
                _jsxs("p", {
                  className: "story-ui-label",
                  children: [_jsx(MapPin, {}), " YOUR DESTINATION"],
                }),
                _jsx("strong", { children: selected?.area ?? "Bengaluru" }),
                _jsxs("div", {
                  className: "story-search-fields",
                  children: [
                    _jsxs("span", { children: [_jsx(Clock3, {}), " Today \u00B7 09:00"] }),
                    _jsxs("span", { children: [_jsx(CarFront, {}), " 4-wheeler"] }),
                  ],
                }),
                _jsxs("div", {
                  className: "story-search-command",
                  children: ["Search parking ", _jsx(ArrowRight, {})],
                }),
              ],
            }),
            _jsxs("div", {
              className: `story-ui-view story-discover ${active === 3 ? "is-current" : ""}`,
              "aria-hidden": active !== 3,
              children: [
                _jsxs("span", {
                  className: "story-ui-label",
                  children: [_jsx(Navigation, {}), " NEAR YOUR DESTINATION"],
                }),
                _jsx("strong", { children: selected?.title ?? "Verified private parking" }),
                _jsxs("p", { children: [_jsx(ShieldCheck, {}), " Verified space"] }),
                _jsx("small", { children: selected?.distance ?? "Close to your next stop" }),
              ],
            }),
            _jsxs("div", {
              className: `story-ui-view story-compare ${active === 4 ? "is-current" : ""}`,
              "aria-hidden": active !== 4,
              children: [
                !slots.length &&
                  _jsx("div", {
                    className: "story-result",
                    children: _jsxs("div", {
                      children: [
                        _jsx("strong", { children: "Your choices, side by side." }),
                        _jsx("p", {
                          children:
                            "Owner photos \u00B7 Prices \u00B7 Vehicle fit \u00B7 Access hours",
                        }),
                      ],
                    }),
                  }),
                slots
                  .slice(0, 3)
                  .map((slot, i) =>
                    _jsxs(
                      "div",
                      {
                        className: `story-result ${i === 0 ? "is-selected" : ""}`,
                        children: [
                          _jsx("img", {
                            src: slotImage(slot),
                            width: 1200,
                            height: 800,
                            loading: "lazy",
                            alt: "",
                          }),
                          _jsxs("div", {
                            children: [
                              _jsx("strong", { children: slot.title }),
                              _jsxs("span", {
                                children: [
                                  "\u20B9",
                                  slot.hourly,
                                  _jsx("small", { children: " / hour" }),
                                ],
                              }),
                              _jsxs("p", {
                                children: [
                                  _jsx(ShieldCheck, {}),
                                  " ",
                                  slot.vehicles.join(" · "),
                                  " \u00B7 ",
                                  slot.window,
                                ],
                              }),
                            ],
                          }),
                          i === 0 && _jsx(Check, { className: "story-result-check" }),
                        ],
                      },
                      slot.id,
                    ),
                  ),
              ],
            }),
            _jsxs("div", {
              className: `story-ui-view story-reserve ${active === 5 ? "is-current" : ""}`,
              "aria-hidden": active !== 5,
              children: [
                _jsx("span", { className: "story-confirm-icon", children: _jsx(Check, {}) }),
                _jsx("strong", { children: "Parking reserved." }),
                _jsx("p", { children: selected?.title ?? "Your selected space" }),
                _jsxs("div", {
                  className: "story-reserve-details",
                  children: [
                    _jsxs("span", { children: [_jsx(Clock3, {}), " Today \u00B7 09:00 arrival"] }),
                    _jsxs("span", { children: [_jsx(CarFront, {}), " 4-wheeler"] }),
                    _jsxs("span", { children: [_jsx(CircleParking, {}), " Zone C \u00B7 C-18"] }),
                  ],
                }),
                _jsx("small", { children: "Journey preview \u00B7 not an actual booking" }),
              ],
            }),
          ],
        }),
        _jsxs("div", {
          className: `story-garage-signs ${active >= 6 ? "is-visible" : ""}`,
          "aria-hidden": "true",
          children: [
            _jsx("span", { children: "\u2191 B1" }),
            _jsx("span", { children: "ZONE C" }),
            _jsx("span", { children: "C-18 \u2192" }),
          ],
        }),
        _jsxs("div", {
          className: `story-floor-route ${active >= 6 ? "is-visible" : ""}`,
          "aria-hidden": "true",
          children: [_jsx(ArrowRight, {}), _jsx(ArrowRight, {}), _jsx(ArrowRight, {})],
        }),
        _jsx("div", {
          className: `story-parking-bay ${active === 7 ? "is-visible" : ""}`,
          "aria-hidden": "true",
          children: _jsx("span", { children: "C-18" }),
        }),
        _jsxs("div", {
          className: `story-car ${active === 7 ? "is-parked" : ""}`,
          "aria-hidden": "true",
          children: [
            _jsx("div", { className: "story-car-shadow" }),
            _jsx("img", {
              src: sideCarImage,
              width: 1536,
              height: 1024,
              loading: "lazy",
              alt: "",
              className: "story-car-side",
            }),
            _jsx("img", {
              src: carImage,
              width: 1024,
              height: 1024,
              loading: "lazy",
              alt: "",
              className: "story-car-rear",
            }),
          ],
        }),
        _jsxs("nav", {
          className: "story-progress",
          "aria-label": "Journey progress",
          children: [
            labels.map((label, index) =>
              _jsxs(
                "span",
                {
                  className: index === active ? "is-current" : index < active ? "is-complete" : "",
                  children: [
                    _jsx("i", {}),
                    _jsx("b", { children: String(index + 1).padStart(2, "0") }),
                    _jsx("small", { children: label }),
                  ],
                },
                label,
              ),
            ),
            _jsx("div", { className: "story-progress-line", children: _jsx("i", {}) }),
          ],
        }),
        _jsx("div", {
          className: "story-scroll-cue",
          "aria-hidden": "true",
          children: _jsx(ArrowDown, {}),
        }),
      ],
    }),
  });
}
