import { Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TenantStatsBannerProps {
  total: number;
  active: number;
  pending: number;
  onAddTenant?: () => void;
  onSyncModules?: () => void;
}

export default function TenantStatsBanner({
  total,
  active,
  pending,
  onAddTenant,
  onSyncModules,
}: TenantStatsBannerProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-xl shadow-sm border border-gray-100 p-3">
      <div className="flex flex-wrap gap-3">
        <div className="text-center">
          <div className="text-xs text-gray-500">Total</div>
          <div className="text-lg font-semibold">{total}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500">Active</div>
          <div className="text-lg font-semibold">{active}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500">Pending</div>
          <div className="text-lg font-semibold">{pending}</div>
        </div>
      </div>
      <div className="flex gap-2">
        {onSyncModules && (
          <Button
            variant="outline"
            onClick={onSyncModules}
            className="px-4 py-2 rounded-lg"
            data-testid="button-sync-modules"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Sync Modules
          </Button>
        )}
        {onAddTenant && (
          <Button
            onClick={onAddTenant}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow-sm"
            data-testid="button-add-tenant"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Tenant
          </Button>
        )}
      </div>
    </div>
  );
}
