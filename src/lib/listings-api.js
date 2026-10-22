import { request } from "@/integrations/api/client";
export const searchListings = (params = {}) => request(`/search?${new URLSearchParams(params)}`);
export const listListings = async () => (await searchListings()).data;
export const getListing = async ({ data }) => {
  try {
    return await request(`/spaces/${encodeURIComponent(data.id)}`);
  } catch (e) {
    if (e.message === "Parking space not found") return null;
    throw e;
  }
};
export const checkAvailability = ({ data }) =>
  request(
    `/availability?${new URLSearchParams({ date: data.date, start: data.start, hours: String(data.hours), ...(data.ids ? { ids: data.ids.join(",") } : {}) })}`,
  );
