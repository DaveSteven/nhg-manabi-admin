import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { useAuthStore } from "./stores/auth";
import { fetchSessionAndApplyToStore } from "./utils/session";

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

async function enableMocking() {
  /** Mocking is opt-in via VITE_ENABLE_MOCK=true (dev defaults to the real backend through the vite proxy). */
  const enableMock = import.meta.env.VITE_ENABLE_MOCK === "true";
  if (!enableMock) {
    // Unregister a stale MSW worker from a previous mock-mode session so it
    // cannot intercept requests.
    const registrations = await navigator.serviceWorker?.getRegistrations?.();
    registrations?.forEach((registration) => void registration.unregister());
    return;
  }
  const { worker } = await import("./mocks/browser");
  return worker.start({ onUnhandledRequest: "bypass" });
}

enableMocking()
  .then(async () => {
    await useAuthStore.persist.rehydrate();
    const { isAuthenticated, token } = useAuthStore.getState();
    if (isAuthenticated && token) {
      try {
        await fetchSessionAndApplyToStore();
      } catch {
        useAuthStore.getState().logout();
      }
    }

    ReactDOM.createRoot(document.getElementById("root")!).render(
      <React.StrictMode>
        <RouterProvider router={router} />
      </React.StrictMode>,
    );
  })
  .catch((err) => {
    console.error("Failed to initialize app:", err);
  });
