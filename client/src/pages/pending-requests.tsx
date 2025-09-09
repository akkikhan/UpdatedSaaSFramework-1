import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/api";
import { apiRequest } from "@/lib/queryClient";
import { useTenants } from "@/hooks/use-tenants";
import { MODULES_INFO } from "../../../shared/types";

export default function PendingRequestsPage() {
  const queryClient = useQueryClient();
  const { data: tenants = [] } = useTenants();
  const { data: requests = [] } = useQuery({
    queryKey: ["/api/admin/module-requests"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/module-requests");
      return res.json();
    },
    refetchInterval: 5000,
  }) as unknown as {
    data: Array<{ id: string; tenantId: string; details?: { moduleId?: string; action?: string } }>;
  };

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.approveModuleRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/module-requests"] }),
  });
  const dismissMutation = useMutation({
    mutationFn: (id: string) => api.dismissModuleRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/module-requests"] }),
  });

  const tenantMap = Object.fromEntries(tenants.map(t => [t.id, t.name]));

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const approveSelected = async () => {
    await Promise.all(Array.from(selected).map(id => api.approveModuleRequest(id)));
    setSelected(new Set());
    queryClient.invalidateQueries({ queryKey: ["/api/admin/module-requests"] });
  };

  const dismissSelected = async () => {
    await Promise.all(Array.from(selected).map(id => api.dismissModuleRequest(id)));
    setSelected(new Set());
    queryClient.invalidateQueries({ queryKey: ["/api/admin/module-requests"] });
  };

  const approveAll = async () => {
    await Promise.all(filtered.map(r => api.approveModuleRequest(r.id)));
    setSelected(new Set());
    queryClient.invalidateQueries({ queryKey: ["/api/admin/module-requests"] });
  };

  const dismissAll = async () => {
    await Promise.all(filtered.map(r => api.dismissModuleRequest(r.id)));
    setSelected(new Set());
    queryClient.invalidateQueries({ queryKey: ["/api/admin/module-requests"] });
  };

  const filtered = requests.filter(r => {
    const tenantName = (tenantMap[r.tenantId] || "").toLowerCase();
    const moduleName = (
      MODULES_INFO[r.details?.moduleId || ""]?.name || r.details?.moduleId || ""
    ).toLowerCase();
    const q = filter.toLowerCase();
    return tenantName.includes(q) || moduleName.includes(q);
  });

  const allSelected = filtered.length > 0 && selected.size === filtered.length;

  const toggleAll = () => {
    setSelected(prev => {
      if (allSelected) return new Set();
      return new Set(filtered.map(r => r.id));
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/tenants">
          <Button variant="ghost">Back to Tenants</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Pending Requests</h1>
          <p className="text-slate-600">Manage module requests across tenants</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Input
          placeholder="Filter by tenant or module..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="max-w-xs"
        />
        <div className="space-x-2">
          <Button
            variant="outline"
            onClick={approveSelected}
            disabled={selected.size === 0 || approveMutation.isPending}
          >
            Approve Selected
          </Button>
          <Button
            variant="outline"
            onClick={dismissSelected}
            disabled={selected.size === 0 || dismissMutation.isPending}
          >
            Dismiss Selected
          </Button>
          <Button
            variant="outline"
            onClick={approveAll}
            disabled={filtered.length === 0 || approveMutation.isPending}
          >
            Approve All
          </Button>
          <Button
            variant="outline"
            onClick={dismissAll}
            disabled={filtered.length === 0 || dismissMutation.isPending}
          >
            Dismiss All
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleAll}
                aria-label="Select all requests"
              />
            </TableHead>
            <TableHead>Tenant</TableHead>
            <TableHead>Module</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Requested</TableHead>
            <TableHead className="text-right">Controls</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                No pending requests
              </TableCell>
            </TableRow>
          )}
          {filtered.map(r => {
            const moduleName = MODULES_INFO[r.details?.moduleId || ""]?.name || r.details?.moduleId;
            const actionLabel = r.details?.action
              ? r.details.action.charAt(0).toUpperCase() + r.details.action.slice(1)
              : "Pending";
            return (
              <TableRow key={r.id} data-testid={`request-row-${r.id}`}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(r.id)}
                    onCheckedChange={() => toggle(r.id)}
                    aria-label="Select request"
                  />
                </TableCell>
                <TableCell>{tenantMap[r.tenantId] || r.tenantId}</TableCell>
                <TableCell>{moduleName}</TableCell>
                <TableCell>{actionLabel}</TableCell>
                <TableCell>{r.timestamp ? new Date(r.timestamp).toLocaleString() : "—"}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => approveMutation.mutate(r.id)}
                    disabled={approveMutation.isPending}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => dismissMutation.mutate(r.id)}
                    disabled={dismissMutation.isPending}
                  >
                    Dismiss
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

