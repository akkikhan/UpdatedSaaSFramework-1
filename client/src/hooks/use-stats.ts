import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useStats() {
  return useQuery({
    queryKey: ["/api/stats"],
    queryFn: () => api.getStats(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useHealthStatus() {
  return useQuery({
    queryKey: ["/api/health"],
    queryFn: () => api.getHealthStatus(),
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}
