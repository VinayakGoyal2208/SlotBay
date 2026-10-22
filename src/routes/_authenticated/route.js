import { jsx as _jsx } from "react/jsx-runtime";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { api } from "@/integrations/api/client";
export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const { data, error } = await api.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: () => _jsx(Outlet, {}),
});
