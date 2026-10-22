import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Search, X, MapPin, LoaderCircle } from "lucide-react";
import { searchListings, checkAvailability } from "@/lib/listings-api";
import { toSlot, slotImage } from "@/lib/parking";
import { availabilitySchema } from "@/lib/availability";
export function ParkingSearch({ date, start, hours, vehicle }) {
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const input = useRef(null);
  const id = useId();
  const navigate = useNavigate();
  const valid = availabilitySchema.safeParse({ date, start, hours }).success;
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(text.trim());
      setActive(-1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [text]);
  const matches = useQuery({
    queryKey: ["parking-suggestions", query, vehicle],
    enabled: open && !!query,
    staleTime: 30000,
    queryFn: () => searchListings({ q: query, ...(vehicle === "all" ? {} : { vehicle }) }),
  });
  const ids = matches.data?.data.map((item) => item.row.id) ?? [];
  const availability = useQuery({
    queryKey: ["suggestion-availability", date, start, hours, ids],
    enabled: open && !!query && valid && ids.length > 0,
    queryFn: () => checkAvailability({ data: { date, start, hours, ids } }),
    staleTime: 15000,
  });
  const loading = text.trim() !== query || (matches.isFetching && !matches.data);
  const failed = !!matches.error;
  const options = (matches.data?.data ?? []).slice(0, 8).map((item) => ({
    ...toSlot(item.row, item.image),
    available: availability.data?.find((a) => a.id === item.row.id)?.available,
  }));
  const expanded = open && !!text.trim();
  const search = valid ? { date, start, hours, ...(vehicle === "all" ? {} : { vehicle }) } : {};
  return _jsxs("div", {
    className: "parking-search",
    onBlur: (event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) {
        setOpen(false);
        setActive(-1);
      }
    },
    children: [
      _jsx("label", { htmlFor: id, className: "search-label", children: "Where are you heading?" }),
      _jsxs("div", {
        className: "search-input-row",
        children: [
          _jsx(Search, { "aria-hidden": "true", className: "size-5 shrink-0 text-primary" }),
          _jsx("input", {
            id: id,
            ref: input,
            type: "search",
            role: "combobox",
            "aria-label": "Search parking locations",
            "aria-autocomplete": "list",
            "aria-expanded": expanded,
            "aria-controls": `${id}-results`,
            "aria-activedescendant":
              active >= 0 && active < options.length && !loading && !failed
                ? `${id}-option-${active}`
                : undefined,
            "aria-describedby": `${id}-hint`,
            autoComplete: "off",
            maxLength: 150,
            placeholder: "Address, area, metro or host",
            value: text,
            onFocus: () => setOpen(true),
            onChange: (e) => {
              setText(e.target.value);
              setOpen(true);
              setActive(-1);
            },
            onKeyDown: (event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                setOpen(false);
                setActive(-1);
              }
              if (["ArrowDown", "ArrowUp"].includes(event.key)) {
                event.preventDefault();
                setOpen(true);
                if (!loading && options.length)
                  setActive((previous) =>
                    event.key === "ArrowDown"
                      ? (previous + 1) % options.length
                      : previous <= 0
                        ? options.length - 1
                        : previous - 1,
                  );
              }
              if (event.key === "Enter") {
                event.preventDefault();
                setOpen(true);
                if (expanded && !loading && !failed && options[active])
                  void navigate({ to: "/slot/$id", params: { id: options[active].id }, search });
              }
            },
          }),
          text &&
            _jsx("button", {
              type: "button",
              className: "search-clear",
              "aria-label": "Clear parking search",
              onClick: () => {
                setText("");
                input.current?.focus();
              },
              children: _jsx(X, { className: "size-4" }),
            }),
        ],
      }),
      _jsx("p", {
        id: `${id}-hint`,
        className: "search-hint",
        children: "Type a place, then choose a parking location.",
      }),
      expanded &&
        _jsxs("div", {
          className: "search-dropdown",
          children: [
            _jsx("p", {
              role: "status",
              "aria-live": "polite",
              className: "search-result-status",
              children: loading
                ? _jsxs(_Fragment, {
                    children: [
                      _jsx(LoaderCircle, { className: "size-4 animate-spin" }),
                      " Finding parking\u2026",
                    ],
                  })
                : failed
                  ? "Search is unavailable. Please try again."
                  : !options.length
                    ? "No matching locations. Try another address or area."
                    : "Choose a location to view and reserve",
            }),
            _jsx("ul", {
              id: `${id}-results`,
              role: "listbox",
              "aria-label": "Parking suggestions",
              children:
                !loading &&
                !failed &&
                options.map((slot, i) =>
                  _jsx(
                    "li",
                    {
                      role: "presentation",
                      children: _jsxs(Link, {
                        to: "/slot/$id",
                        params: { id: slot.id },
                        search: search,
                        role: "option",
                        id: `${id}-option-${i}`,
                        "aria-selected": i === active,
                        className: "search-option",
                        onMouseEnter: () => setActive(i),
                        children: [
                          _jsx("img", { src: slotImage(slot), width: 56, height: 56, alt: "" }),
                          _jsxs("span", {
                            className: "min-w-0 flex-1",
                            children: [
                              _jsx("strong", { children: slot.title }),
                              _jsxs("span", {
                                className: "search-address",
                                children: [
                                  _jsx(MapPin, { className: "size-3 shrink-0" }),
                                  slot.address,
                                ],
                              }),
                              _jsxs("small", {
                                children: [
                                  slot.owner,
                                  " \u00B7 \u20B9",
                                  slot.hourly,
                                  "/hr",
                                  slot.available !== undefined
                                    ? ` · ${slot.available ? `${slot.available} bays free` : "Full at this time"}`
                                    : "",
                                ],
                              }),
                            ],
                          }),
                          _jsx(ArrowUpRight, { className: "size-4 shrink-0 text-primary" }),
                        ],
                      }),
                    },
                    slot.id,
                  ),
                ),
            }),
          ],
        }),
    ],
  });
}
