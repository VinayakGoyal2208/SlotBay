import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "@/integrations/api/client";
export function useSession() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const { data } = api.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setReady(true);
    });
    api.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return { session, ready, user: session?.user ?? null };
}
export function useMe() {
  const { user, ready } = useSession();
  const q = useQuery({
    queryKey: ["me", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) throw new Error("Sign in required");
      const [p, r] = await Promise.all([
        api.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        api.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      const roles = (r.data ?? []).map((x) => x.role);
      return {
        profile: p.data,
        roles,
        isAdmin: !p.data?.suspended && roles.includes("admin"),
        isOwner: !p.data?.suspended && roles.includes("owner"),
      };
    },
  });
  return {
    user,
    ready,
    error: q.error,
    loading: !ready || (!!user && q.isLoading),
    ...q.data,
    refetch: q.refetch,
  };
}
