import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
const crew = [
  { key: "tall", cls: "crew-tall", eyes: [32, 58], eyeTop: 26, mouth: 46 },
  { key: "mid", cls: "crew-mid", eyes: [22, 44], eyeTop: 22, mouth: 40 },
  { key: "duck", cls: "crew-duck", eyes: [30], eyeTop: 30, mouth: 42, beak: true },
  { key: "dome", cls: "crew-dome", eyes: [40, 66], eyeTop: 40, mouth: 56 },
];
/** Four friendly parking buddies: eyes follow the pointer, look away for passwords, frown on errors. */
export function AuthCompanion({ hiding, invalid }) {
  const ref = useRef(null);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const mood = hiding ? "hiding" : invalid ? "invalid" : "idle";
  useEffect(() => {
    const move = (e) => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const dx = e.clientX - (r.left + r.width / 2),
        dy = e.clientY - (r.top + r.height / 2);
      const d = Math.max(1, Math.hypot(dx, dy));
      setLook({ x: (dx / d) * Math.min(5, d / 40), y: (dy / d) * Math.min(4, d / 40) });
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, []);
  const eye = hiding ? { x: -6, y: -3 } : look;
  return _jsxs("div", {
    ref: ref,
    className: `auth-crew mood-${mood}`,
    children: [
      _jsx("div", {
        className: "crew-stage",
        "aria-hidden": "true",
        children: crew.map((c) =>
          _jsxs(
            "div",
            {
              className: `crew-body ${c.cls}`,
              children: [
                c.eyes.map((left) =>
                  _jsx(
                    "span",
                    {
                      className: "crew-eye",
                      style: {
                        left,
                        top: c.eyeTop,
                        transform: `translate(${eye.x}px, ${eye.y}px)`,
                      },
                    },
                    left,
                  ),
                ),
                "beak" in c
                  ? _jsx("span", {
                      className: "crew-beak",
                      style: { top: c.eyeTop + 10, transform: `translateX(${eye.x}px)` },
                    })
                  : _jsx("span", {
                      className: "crew-mouth",
                      style: {
                        top: c.mouth,
                        left: c.eyes[0] + 6,
                        transform: `translate(${eye.x}px, ${eye.y}px)${mood === "invalid" ? " rotate(180deg)" : ""}`,
                      },
                    }),
              ],
            },
            c.key,
          ),
        ),
      }),
      _jsx("p", {
        role: "status",
        className: "mt-4 text-center text-sm font-medium",
        children: hiding
          ? "We're not looking — promise."
          : invalid
            ? "Hmm, some details need another look."
            : "Let's find your next parking space.",
      }),
    ],
  });
}
