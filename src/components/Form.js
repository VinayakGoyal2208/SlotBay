import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cloneElement, isValidElement, useId } from "react";
export function FormField({ label, error, hint, children, field }) {
  const id = useId();
  const control =
    isValidElement(children) &&
    typeof children.type === "string" &&
    ["input", "select", "textarea"].includes(children.type);
  const content = control
    ? cloneElement(children, {
        id,
        ...(field ? { name: field } : {}),
        "aria-invalid": !!error,
        "aria-describedby": error || hint ? `${id}-help` : undefined,
      })
    : children;
  return _jsxs("div", {
    className: "block",
    role: control ? undefined : "group",
    "aria-labelledby": control ? undefined : `${id}-label`,
    children: [
      control
        ? _jsx("label", {
            htmlFor: id,
            className: "mb-1.5 block text-xs font-semibold text-foreground",
            children: label,
          })
        : _jsx("span", {
            id: `${id}-label`,
            className: "mb-1.5 block text-xs font-semibold text-foreground",
            children: label,
          }),
      content,
      error
        ? _jsx("span", {
            id: `${id}-help`,
            role: "alert",
            className: "mt-1 block text-xs font-medium text-destructive",
            children: error,
          })
        : hint
          ? _jsx("span", {
              id: `${id}-help`,
              className: "mt-1 block text-xs text-muted-foreground",
              children: hint,
            })
          : null,
    ],
  });
}
export const inputCls =
  "w-full rounded-md border bg-background/70 px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30";
export function StatusPill({ status }) {
  const t = {
    pending: "bg-accent/20 text-accent",
    approved: "bg-primary/20 text-primary",
    rejected: "bg-destructive/20 text-destructive",
    Pending: "bg-accent/20 text-accent",
    Confirmed: "bg-primary/20 text-primary",
    Declined: "bg-destructive/20 text-destructive",
    Cancelled: "bg-muted text-muted-foreground",
    Completed: "bg-muted text-muted-foreground",
    Open: "bg-accent/20 text-accent",
    Resolved: "bg-muted text-muted-foreground",
    Approved: "bg-primary/20 text-primary",
    Rejected: "bg-destructive/20 text-destructive",
    Active: "bg-primary/20 text-primary",
  };
  return _jsx("span", {
    className: `inline-flex self-start items-center rounded-sm px-2 py-1 text-[10px] font-bold uppercase ${t[status] ?? "bg-muted"}`,
    children: status,
  });
}
