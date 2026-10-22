import { jsx as _jsx } from "react/jsx-runtime";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import "./website.css";
const router = getRouter();
// The server supplies crawler metadata; the router owns head tags after mounting.
document.querySelectorAll("[data-server-seo]").forEach((el) => el.remove());
createRoot(document.getElementById("root")).render(
  _jsx(StrictMode, { children: _jsx(RouterProvider, { router: router }) }),
);
