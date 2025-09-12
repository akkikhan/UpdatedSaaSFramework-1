import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Helper function to handle logout and redirect
function handleUnauthorized() {
  // Clear all authentication data
  localStorage.removeItem("platformAdminToken");
  localStorage.removeItem("tenantToken");
  localStorage.removeItem("currentTenant");

  // Redirect to platform admin login page
  window.location.href = "/admin/login";
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Check if it's a 401 Unauthorized error
    if (res.status === 401) {
      console.log("Session expired - redirecting to login");
      handleUnauthorized();
      return; // Stop execution to prevent error display
    }

    // Try to extract meaningful message from JSON error payload
    try {
      const clone = res.clone();
      const maybeJson = await clone.json();
      const msg = typeof maybeJson?.message === 'string' ? maybeJson.message : JSON.stringify(maybeJson);
      throw new Error(msg || res.statusText || `HTTP ${res.status}`);
    } catch {
      const text = (await res.text()) || res.statusText;
      // Fallback to raw text
      throw new Error(text || `HTTP ${res.status}`);
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined
): Promise<Response> {
  // Get platform admin token from localStorage
  const platformAdminToken = localStorage.getItem("platformAdminToken");

  const headers: Record<string, string> = {
    ...(data ? { "Content-Type": "application/json" } : {}),
    ...(platformAdminToken ? { Authorization: `Bearer ${platformAdminToken}` } : {}),
  };

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw" | "redirect";
export const getQueryFn: <T>(options: { on401: UnauthorizedBehavior }) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get platform admin token from localStorage
    const platformAdminToken = localStorage.getItem("platformAdminToken");

    const headers: Record<string, string> = {
      ...(platformAdminToken ? { Authorization: `Bearer ${platformAdminToken}` } : {}),
    };

    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers,
    });

    if (res.status === 401) {
      if (unauthorizedBehavior === "returnNull") {
        return null;
      } else if (unauthorizedBehavior === "redirect") {
        handleUnauthorized();
        return null;
      }
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "redirect" }), // Changed from "throw" to "redirect"
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
      onError: (error: any) => {
        // Handle 401 errors in mutations as well
        if (error.message && error.message.startsWith("401:")) {
          console.log("Mutation failed with 401 - redirecting to login");
          handleUnauthorized();
        }
      },
    },
  },
});

// Export the handleUnauthorized function for manual use
export { handleUnauthorized };
