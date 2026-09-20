import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

/**
 * The app shell is cached so a phone that comes back hours later opens instantly,
 * even while the venue wifi is saturated. Dev keeps the worker out of the way.
 *
 * Kill switch: build with VITE_DISABLE_SW=1 and deploy. Phones that already have the
 * worker will unregister it and drop its caches on their next visit, so a misbehaving
 * worker can be removed mid-event without touching anyone's device.
 */
const SW_DISABLED = import.meta.env.VITE_DISABLE_SW === "1";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    if (SW_DISABLED || !import.meta.env.PROD) {
      const regs = await navigator.serviceWorker.getRegistrations().catch(() => []);
      await Promise.all(regs.map((r) => r.unregister()));
      if ("caches" in window) {
        const keys = await caches.keys().catch(() => []);
        await Promise.all(keys.filter((k) => k.startsWith("devfest-")).map((k) => caches.delete(k)));
      }
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // No service worker means a slower first paint, nothing more.
    });
  });
}
