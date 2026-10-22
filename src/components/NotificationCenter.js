import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/integrations/api/client";
import { useMe } from "@/lib/auth";
import { useActionLock } from "@/lib/use-action-lock";
import { Timestamp } from "./DashboardKit";
import { Button } from "@/components/ui/button";
export function NotificationCenter() {
  const me = useMe(),
    action = useActionLock();
  const q = useQuery({
    queryKey: ["notifications", me.user?.id],
    enabled: !!me.user,
    queryFn: async () =>
      (await api.from("notifications").select().order("created_at", { ascending: false }).limit(30))
        .data,
    refetchInterval: 15000,
  });
  return _jsx("section", {
    "aria-label": "Account notifications",
    "aria-live": "polite",
    className: "space-y-2",
    children: (q.data ?? [])
      .filter((n) => !n.read_at)
      .map((n) =>
        _jsxs(
          "div",
          {
            className:
              "flex flex-wrap justify-between gap-3 border-l-2 border-primary bg-card p-4 text-sm",
            children: [
              _jsxs("div", {
                children: [
                  _jsx("p", { children: n.message }),
                  _jsx(Timestamp, { value: n.created_at, label: "Received" }),
                ],
              }),
              _jsx(Button, {
                variant: "ghost",
                size: "sm",
                disabled: action.pending,
                onClick: () =>
                  action.run(async () => {
                    const r = await api
                      .from("notifications")
                      .update({ read_at: new Date().toISOString() })
                      .eq("id", n.id);
                    if (r.error) throw new Error(r.error.message);
                    await q.refetch();
                  }),
                children: "Dismiss",
              }),
            ],
          },
          n.id,
        ),
      ),
  });
}
