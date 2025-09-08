import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { handleUnauthorized } from "./lib/queryClient";

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
