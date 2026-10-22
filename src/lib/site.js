export const SITE_URL = (import.meta.env["VITE_SITE_URL"] || window.location.origin).replace(
  /\/$/,
  "",
);
