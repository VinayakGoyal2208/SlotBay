import { QueryClient, QueryCache } from "@tanstack/react-query";
import { toast } from "sonner";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
export const getRouter = () => {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({ onError: (error) => toast.error(error.message) }),
    defaultOptions: { queries: { staleTime: 15000, retry: 1 } },
  });
  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });
  return router;
};
