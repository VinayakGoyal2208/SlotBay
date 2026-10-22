import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Search, ArrowUpDown, LockKeyhole, MapPin, CarFront, UserRound } from "lucide-react";
import { inputCls, StatusPill } from "./Form";
import { TabsList, TabsTrigger } from "./ui/tabs";
function stamp(value) {
  return value && Number.isFinite(+new Date(value))
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      }).format(new Date(value)) + " IST"
    : "Not recorded";
}
export function Timestamp({ value, label = "Created" }) {
  return _jsxs("span", {
    className: "block text-xs leading-5 text-muted-foreground",
    children: [
      label,
      " \u00B7 ",
      value ? _jsx("time", { dateTime: value, children: stamp(value) }) : "Not recorded",
    ],
  });
}
export function DashboardHeading({ eyebrow, title, description, actions }) {
  return _jsxs("header", {
    className:
      "dashboard-heading flex flex-wrap items-end justify-between gap-6 rounded-2xl border p-6 sm:p-8",
    children: [
      _jsxs("div", {
        className: "max-w-2xl",
        children: [
          _jsx("p", {
            className: "text-xs font-bold uppercase tracking-[.18em] text-primary",
            children: eyebrow,
          }),
          _jsx("h1", { className: "mt-3 text-3xl font-bold sm:text-4xl", children: title }),
          _jsx("p", {
            className: "mt-3 text-sm leading-6 text-muted-foreground",
            children: description,
          }),
        ],
      }),
      _jsx("div", { className: "dashboard-actions flex flex-wrap gap-2", children: actions }),
    ],
  });
}
export function MetricCards({ items }) {
  return _jsx("div", {
    className: "metric-grid grid grid-cols-2 gap-3 xl:grid-cols-4",
    children: items.map((item, i) =>
      _jsxs(
        "div",
        {
          className: "metric-card relative overflow-hidden rounded-xl border bg-card p-5",
          children: [
            _jsxs("span", {
              "aria-hidden": true,
              className: "absolute right-4 top-3 text-4xl font-bold text-primary/10",
              children: ["0", i + 1],
            }),
            _jsx("p", {
              className: "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
              children: item.label,
            }),
            _jsx("p", {
              className: `metric-value mt-3 font-bold tabular-nums ${String(item.value).length > 8 ? "text-xl" : "text-3xl"}`,
              children: item.value,
            }),
            item.note &&
              _jsx("p", { className: "mt-2 text-xs text-muted-foreground", children: item.note }),
          ],
        },
        item.label,
      ),
    ),
  });
}
export function LockedNotice({ children }) {
  return _jsxs("div", {
    className:
      "flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm",
    children: [
      _jsx(LockKeyhole, { className: "mt-0.5 size-4 shrink-0 text-primary" }),
      _jsx("p", {
        children:
          children ??
          "Your registered details are locked. To make a correction, submit a change request below.",
      }),
    ],
  });
}
export function EmptyState({ children }) {
  return _jsx("p", {
    className: "rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground",
    children: children,
  });
}
export function DashboardToolbar({ controls, label = "Search records" }) {
  return _jsxs("div", {
    className: "dashboard-toolbar flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3",
    children: [
      _jsxs("label", {
        className: "flex w-full min-w-0 items-center gap-2 sm:w-auto sm:flex-1",
        children: [
          _jsx(Search, { "aria-hidden": true, className: "size-4 shrink-0 text-muted-foreground" }),
          _jsx("span", { className: "sr-only", children: label }),
          _jsx("input", {
            type: "search",
            maxLength: 150,
            value: controls.search,
            onChange: (e) => controls.setSearch(e.target.value),
            placeholder: label,
            className: `${inputCls} min-w-36 border-0 bg-transparent`,
          }),
        ],
      }),
      _jsxs("label", {
        className: "dashboard-sort flex w-full items-center gap-2 text-sm sm:w-auto",
        children: [
          _jsx(ArrowUpDown, { "aria-hidden": true, className: "size-4" }),
          _jsx("span", { className: "sr-only", children: "Sort records" }),
          _jsxs("select", {
            value: controls.sort,
            onChange: (e) => controls.setSort(e.target.value),
            className: inputCls,
            children: [
              _jsx("option", { value: "newest", children: "Newest first" }),
              _jsx("option", { value: "oldest", children: "Oldest first" }),
              _jsx("option", { value: "name", children: "Name / reference A\u2013Z" }),
            ],
          }),
        ],
      }),
    ],
  });
}
export function BookingSummary({ booking: b, showDriver = false, actions }) {
  return _jsxs("article", {
    className: "booking-card rounded-xl border bg-card p-5",
    children: [
      _jsxs("div", {
        className: "flex flex-wrap justify-between gap-3",
        children: [
          _jsxs("div", {
            children: [
              _jsx("p", { className: "text-xs font-mono text-muted-foreground", children: b.code }),
              _jsx("h3", {
                className: "mt-1 text-lg font-bold",
                children: b.listings?.title ?? "Parking reservation",
              }),
            ],
          }),
          _jsxs("div", {
            className: "flex items-center gap-3",
            children: [
              _jsxs("strong", { children: ["\u20B9", b.amount.toLocaleString("en-IN")] }),
              _jsx(StatusPill, { status: b.status }),
            ],
          }),
        ],
      }),
      _jsxs("div", {
        className: "mt-4 grid gap-3 text-sm sm:grid-cols-2",
        children: [
          _jsxs("div", {
            children: [
              _jsxs("p", {
                className: "font-medium",
                children: [
                  b.booking_date,
                  " \u00B7 ",
                  b.start_time,
                  " IST \u00B7 ",
                  b.hours,
                  " hr",
                ],
              }),
              b.ends_at && _jsx(Timestamp, { label: "Departure", value: b.ends_at }),
              _jsxs("p", {
                className: "mt-2 flex items-start gap-2 text-muted-foreground",
                children: [
                  _jsx(MapPin, { className: "size-4 shrink-0" }),
                  b.listings?.address ?? "Address available in listing",
                ],
              }),
            ],
          }),
          _jsxs("div", {
            children: [
              _jsxs("p", {
                className: "flex items-center gap-2 font-medium",
                children: [
                  _jsx(CarFront, { className: "size-4 text-primary" }),
                  b.plate,
                  " \u00B7 ",
                  b.vehicle === "4W" ? "Car / 4-wheeler" : "2-wheeler",
                ],
              }),
              showDriver &&
                _jsxs("p", {
                  className: "mt-2 flex flex-wrap items-center gap-2",
                  children: [
                    _jsx(UserRound, { className: "size-4 text-primary" }),
                    b.arrival?.full_name ?? "Driver",
                    b.arrival?.phone &&
                      _jsx("a", {
                        href: `tel:${b.arrival.phone}`,
                        className: "text-primary underline",
                        children: b.arrival.phone,
                      }),
                  ],
                }),
              _jsxs("p", {
                className: "mt-2 text-xs text-muted-foreground",
                children: [
                  showDriver ? "Check on arrival" : "Carry on arrival",
                  ": driving licence",
                  showDriver && b.arrival?.licence_last4
                    ? ` (ending ${b.arrival.licence_last4})`
                    : "",
                  " + vehicle RC.",
                ],
              }),
            ],
          }),
        ],
      }),
      _jsxs("details", {
        className: "booking-metadata mt-4 border-t pt-3",
        children: [
          _jsx("summary", {
            className: "text-xs font-semibold text-primary",
            children: "Booking timestamps",
          }),
          _jsxs("div", {
            className: "mt-2",
            children: [
              _jsx(Timestamp, { value: b.created_at, label: "Booked" }),
              b.updated_at && _jsx(Timestamp, { value: b.updated_at, label: "Last updated" }),
            ],
          }),
        ],
      }),
      actions &&
        _jsx("div", { className: "booking-actions mt-4 flex flex-wrap gap-2", children: actions }),
    ],
  });
}
export function DashboardSections({ value, onChange, options }) {
  return _jsxs("div", {
    className: "dashboard-sections",
    children: [
      _jsxs("label", {
        className: "mobile-section-picker",
        children: [
          _jsx("span", { children: "Workspace section" }),
          _jsx("select", {
            value: value,
            onChange: (event) => onChange(event.target.value),
            "aria-label": "Workspace section",
            children: options.map((option) =>
              _jsx("option", { value: option.value, children: option.label }, option.value),
            ),
          }),
        ],
      }),
      _jsx(TabsList, {
        className: "desktop-section-tabs h-auto w-full flex-wrap justify-start gap-1 bg-card p-2",
        children: options.map((option) =>
          _jsx(TabsTrigger, { value: option.value, children: option.label }, option.value),
        ),
      }),
    ],
  });
}
