import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { handleUnauthorized } from "./lib/queryClient";

// Store platform admin token from URL before any network requests
const params = new URLSearchParams(window.location.search);
const urlToken = params.get("token");
const isAdminLogin = params.get("admin");
if (urlToken && isAdminLogin === "true") {
  // Persist the token for subsequent API requests
  localStorage.setItem("platformAdminToken", urlToken);
  // Clean up URL so token isn't visible in the address bar
  const cleanPath = window.location.pathname + window.location.hash;
  window.history.replaceState({}, document.title, cleanPath);
}

// Global fetch wrapper to redirect on 401 responses
const originalFetch = window.fetch;
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const response = await originalFetch(input, init);
  if (response.status === 401) {
    console.log("Received 401 from API - redirecting to login");
    handleUnauthorized();
  }
  return response;
};

createRoot(document.getElementById("root")!).render(<App />);
