import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// PWA iframe/preview guard — prevent service worker issues in Lovable editor
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((registrations) => {
    registrations.forEach((r) => r.unregister());
  });
} else if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* SW registration failed — not critical */
    });
  });
}

// Remove splash screen once React mounts
const root = createRoot(document.getElementById("root")!);
root.render(<App />);

requestAnimationFrame(() => {
  const splash = document.getElementById("bowser-splash");
  if (splash) {
    splash.classList.add("fade-out");
    setTimeout(() => {
      splash.remove();
      document.getElementById("bowser-splash-style")?.remove();
    }, 350);
  }
});
