import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import leafletCss from "leaflet/dist/leaflet.css?url";
export function ParkingMap({ slots, location, search }) {
  const ref = useRef(null);
  const query = search
    ? new URLSearchParams(Object.entries(search).map(([k, v]) => [k, String(v)])).toString()
    : "";
  useEffect(() => {
    let disposed = false;
    let map;
    void import("leaflet").then((L) => {
      if (disposed || !ref.current) return;
      map = L.map(ref.current, {
        zoomAnimation: false,
        fadeAnimation: false,
        markerZoomAnimation: false,
      }).setView(
        [location?.lat ?? slots[0]?.lat ?? 12.9716, location?.lng ?? slots[0]?.lng ?? 77.5946],
        13,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);
      slots.forEach((s) => {
        if (!map) return;
        const popup = document.createElement("div");
        const a = document.createElement("a");
        a.href = `/slot/${encodeURIComponent(s.id)}${query ? `?${query}` : ""}`;
        a.textContent = `${s.title} · ₹${s.hourly}/hr · ${s.available} bays`;
        popup.append(a);
        L.circleMarker([s.lat, s.lng], { radius: 9 }).addTo(map).bindPopup(popup);
      });
      if (location)
        L.circleMarker([location.lat, location.lng], { radius: 5 })
          .addTo(map)
          .bindPopup("Your location");
      if (slots.length > 1 && !location)
        map.fitBounds(L.latLngBounds(slots.map((s) => [s.lat, s.lng])), {
          padding: [35, 35],
          maxZoom: 14,
        });
    });
    return () => {
      disposed = true;
      map?.stop();
      map?.remove();
    };
  }, [slots, location, query]);
  return _jsxs(_Fragment, {
    children: [
      _jsx("link", { rel: "stylesheet", href: leafletCss }),
      _jsx("div", {
        ref: ref,
        className: "relative z-0 h-96 w-full overflow-hidden rounded-lg border",
        "aria-label": "Available parking map",
      }),
    ],
  });
}
