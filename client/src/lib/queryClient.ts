import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Helper function to handle logout and redirect
function handleUnauthorized() {
  // Clear platform admin token
  localStorage.removeItem("platformAdminToken");

  // Clear tenant tokens (both global and namespaced)
  const tenantMatch = window.location.pathname.match(/\/tenant\/([^/]+)/);
  const orgId = tenantMatch ? decodeURIComponent(tenantMatch[1]) : null;
  localStorage.removeItem("tenant_token");
  localStorage.removeItem("tenant_user");
  if (orgId) {
    localStorage.removeItem(`tenant_token_${orgId}`);
    localStorage.removeItem(`tenant_user_${orgId}`);
  }
  localStorage.removeItem("tenantToken"); // legacy key
  localStorage.removeItem("currentTenant");

  // Redirect based on current portal
  if (orgId) {
    window.location.href = `/tenant/${orgId}/login`;
  } else {
    window.location.href = "/admin/login";
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Check if it's a 401 Unauthorized error
    if (res.status === 401) {
      console.log("Session expired - redirecting to login");
      handleUnauthorized();
      return; // Stop execution to prevent error display
    }

    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  extraHeaders?: Record<string, string>
): Promise<Response> {
  // Determine which token to use based on current portal
  const platformAdminToken = localStorage.getItem("platformAdminToken");
  const tenantMatch = window.location.pathname.match(/\/tenant\/([^/]+)/);
  const tenantToken = tenantMatch
    ? localStorage.getItem(`tenant_token_${decodeURIComponent(tenantMatch[1])}`) ||
      localStorage.getItem("tenant_token")
    : localStorage.getItem("tenant_token");

  const authToken = platformAdminToken || tenantToken || undefined;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(data ? { "Content-Type": "application/json" } : {}),
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(extraHeaders || {}),
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
    // Determine token based on portal
    const platformAdminToken = localStorage.getItem("platformAdminToken");
    const tenantMatch = window.location.pathname.match(/\/tenant\/([^/]+)/);
    const tenantToken = tenantMatch
      ? localStorage.getItem(`tenant_token_${decodeURIComponent(tenantMatch[1])}`) ||
        localStorage.getItem("tenant_token")
      : localStorage.getItem("tenant_token");

    const authToken = platformAdminToken || tenantToken || undefined;

    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
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
