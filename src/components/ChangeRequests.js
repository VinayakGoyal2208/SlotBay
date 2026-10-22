import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useDashboardFilter } from "@/lib/use-dashboard-filter";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { request } from "@/integrations/api/client";
import { StatusPill, FormField, inputCls } from "./Form";
import { DashboardToolbar, EmptyState, Timestamp } from "./DashboardKit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
export function RequestHistory() {
  const filter = useDashboardFilter();
  const q = useQuery({
    queryKey: ["change-requests"],
    queryFn: () => request("/change-requests"),
    refetchInterval: 30000,
  });
  return _jsxs("section", {
    className: "space-y-4",
    children: [
      _jsxs("div", {
        children: [
          _jsx("h2", { className: "text-xl font-bold", children: "My change requests" }),
          _jsx("p", {
            className: "mt-1 text-sm text-muted-foreground",
            children:
              "Your current details stay locked while the administrator reviews a correction.",
          }),
        ],
      }),
      _jsx(DashboardToolbar, { controls: filter, label: "Search your requests" }),
      q.error &&
        _jsxs("p", {
          role: "alert",
          children: [
            "Unable to load requests. ",
            _jsx(Button, { onClick: () => q.refetch(), children: "Retry" }),
          ],
        }),
      filter
        .filter(q.data ?? [], (r) => `${r.category} ${r.message} ${r.status}`)
        .map((r) =>
          _jsxs(
            "details",
            {
              className: "rounded-xl border bg-card p-4",
              children: [
                _jsxs("summary", {
                  className: "font-medium",
                  children: [
                    _jsxs("span", {
                      className: "mr-3 capitalize",
                      children: [r.category, " correction"],
                    }),
                    _jsx(StatusPill, { status: r.status }),
                  ],
                }),
                _jsx("p", { className: "mt-3 text-sm", children: r.message }),
                r.admin_note &&
                  _jsxs("p", {
                    className: "mt-2 text-sm text-primary",
                    children: ["Admin response: ", r.admin_note],
                  }),
                _jsx(Timestamp, { value: r.created_at, label: "Submitted" }),
                r.resolved_at && _jsx(Timestamp, { value: r.resolved_at, label: "Resolved" }),
              ],
            },
            r.id,
          ),
        ),
      q.data &&
        !filter.filter(q.data, (r) => `${r.category} ${r.message} ${r.status}`).length &&
        _jsx(EmptyState, { children: "No matching change requests." }),
    ],
  });
}
export function ReasonDialog({
  title,
  description,
  open,
  onClose,
  onConfirm,
  pending,
  confirmLabel = "Submit decision",
  maxLength = 300,
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  return _jsx(Dialog, {
    open: open,
    onOpenChange: (value) => {
      if (!value && !pending) onClose();
    },
    children: _jsxs(DialogContent, {
      children: [
        _jsxs(DialogHeader, {
          children: [
            _jsx(DialogTitle, { children: title }),
            _jsx(DialogDescription, { children: description }),
          ],
        }),
        _jsxs("form", {
          onSubmit: (e) => {
            e.preventDefault();
            if (reason.trim().length < 3) {
              setError("Give a clear reason of at least 3 characters");
              return;
            }
            onConfirm(reason.trim());
          },
          className: "space-y-4",
          children: [
            _jsx(FormField, {
              label: "Reason / response",
              error: error,
              children: _jsx("textarea", {
                required: true,
                minLength: 3,
                maxLength: maxLength,
                rows: 4,
                value: reason,
                onChange: (e) => {
                  setReason(e.target.value);
                  setError("");
                },
                className: inputCls,
              }),
            }),
            _jsxs(DialogFooter, {
              children: [
                _jsx(Button, {
                  type: "button",
                  variant: "outline",
                  disabled: pending,
                  onClick: onClose,
                  children: "Cancel",
                }),
                _jsx(Button, {
                  type: "submit",
                  disabled: pending,
                  children: pending ? "Saving…" : confirmLabel,
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  });
}
