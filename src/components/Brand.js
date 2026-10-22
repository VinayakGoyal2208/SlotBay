import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** A parking bay, an arrival marker and a clear, compact wordmark. */
export function Brand({ compact = false }) {
  return _jsxs("span", {
    className: `brand ${compact ? "brand-compact" : ""}`,
    "aria-label": "SlotBay",
    children: [
      _jsxs("svg", {
        className: "brand-mark",
        viewBox: "0 0 48 48",
        fill: "none",
        "aria-hidden": "true",
        children: [
          _jsx("rect", { width: "48", height: "48", rx: "15", fill: "currentColor" }),
          _jsx("path", {
            d: "M12 15v21h24V15",
            stroke: "#effaf5",
            strokeWidth: "2.5",
            strokeLinecap: "round",
          }),
          _jsx("path", {
            d: "M24 10a8 8 0 0 0-8 8c0 6 8 12 8 12s8-6 8-12a8 8 0 0 0-8-8Z",
            fill: "#e9bb63",
          }),
          _jsx("circle", { cx: "24", cy: "18", r: "2.5", fill: "#174e49" }),
        ],
      }),
      _jsxs("span", {
        className: "brand-word",
        "aria-hidden": "true",
        children: ["slot", _jsx("span", { children: "bay" }), _jsx("i", {})],
      }),
    ],
  });
}
