import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { faviconHref } from "./components/AppIcon";
import "flag-icons/css/flag-icons.min.css";
import "./index.css";

const initialTheme =
  (localStorage.getItem("theme") as "dark" | "light" | null) || "dark";
document.documentElement.setAttribute("data-theme", initialTheme);
const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
if (favicon) favicon.href = faviconHref(initialTheme);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
