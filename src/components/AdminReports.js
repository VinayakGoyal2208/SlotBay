import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { request } from "@/integrations/api/client";
import { FormField, inputCls } from "./Form";
import { Button } from "./ui/button";
import { useActionLock } from "@/lib/use-action-lock";
import { toast } from "sonner";
export function AdminReports() {
  const action = useActionLock();
  const q = useQuery({ queryKey: ["platform-report"], queryFn: () => request("/reports") });
  const g = useQuery({
    queryKey: ["guidelines"],
    queryFn: () => request("/pricing-guidelines"),
  });
  const [f, setF] = useState({ city: "Bengaluru", hourly_min: 20, hourly_max: 150, note: "" });
  return _jsxs("section", {
    className: "space-y-5",
    children: [
      _jsx("h2", { className: "text-2xl font-bold", children: "Platform metrics" }),
      q.error && _jsx("p", { role: "alert", children: "Could not load report." }),
      q.data &&
        _jsxs(_Fragment, {
          children: [
            _jsx("div", {
              className: "report-metrics grid gap-3 sm:grid-cols-3",
              children: [
                ["Drivers", q.data.registered_users],
                ["Owners", q.data.registered_owners],
                ["Parking bays", q.data.bays],
                ["Locations", q.data.locations],
                ["Collected revenue", `₹${q.data.collected_revenue_inr}`],
                ["30-day booked utilization", `${q.data.utilization_30d_percent.toFixed(2)}%`],
              ].map(([k, v]) =>
                _jsxs(
                  "div",
                  {
                    className: "rounded border p-4",
                    children: [
                      _jsx("p", { className: "text-sm text-muted-foreground", children: k }),
                      _jsx("strong", { className: "text-2xl", children: v }),
                    ],
                  },
                  k,
                ),
              ),
            }),
            _jsxs("p", {
              className: "text-xs text-muted-foreground",
              children: [q.data.utilization_note, " ", q.data.measurement_note],
            }),
          ],
        }),
      _jsxs("form", {
        className: "grid gap-3 rounded border p-5 sm:grid-cols-2",
        onSubmit: (e) => {
          e.preventDefault();
          void action.run(async () => {
            await request("/pricing-guidelines", { method: "POST", body: JSON.stringify(f) });
            toast.success("Guideline saved");
            await g.refetch();
          });
        },
        children: [
          _jsx("h3", {
            className: "text-xl font-semibold sm:col-span-2",
            children: "Optional city pricing guidelines",
          }),
          _jsx(FormField, {
            label: "City",
            children: _jsx("input", {
              required: true,
              className: inputCls,
              value: f.city,
              onChange: (e) => setF({ ...f, city: e.target.value }),
            }),
          }),
          _jsx(FormField, {
            label: "Minimum hourly INR",
            children: _jsx("input", {
              required: true,
              type: "number",
              min: 0,
              className: inputCls,
              value: f.hourly_min,
              onChange: (e) => setF({ ...f, hourly_min: Number(e.target.value) }),
            }),
          }),
          _jsx(FormField, {
            label: "Maximum hourly INR",
            children: _jsx("input", {
              required: true,
              type: "number",
              min: f.hourly_min,
              max: 10000,
              className: inputCls,
              value: f.hourly_max,
              onChange: (e) => setF({ ...f, hourly_max: Number(e.target.value) }),
            }),
          }),
          _jsx(FormField, {
            label: "Guidance for owners",
            children: _jsx("input", {
              maxLength: 500,
              className: inputCls,
              value: f.note,
              onChange: (e) => setF({ ...f, note: e.target.value }),
            }),
          }),
          _jsx(Button, { disabled: action.pending, children: "Save guidance" }),
          _jsx("p", {
            className: "text-xs text-muted-foreground",
            children: "Advisory only; owner prices remain authoritative.",
          }),
        ],
      }),
      (g.data ?? []).map((v) =>
        _jsxs(
          "p",
          {
            className: "text-sm",
            children: [
              v.city,
              ": \u20B9",
              v.hourly_min,
              "\u2013\u20B9",
              v.hourly_max,
              "/hour \u00B7 ",
              v.note,
            ],
          },
          v.id,
        ),
      ),
    ],
  });
}
