import { useLocation } from "wouter";
import { useTenants } from "@/hooks/use-tenants";
import TenantStatsBanner from "@/components/tenants/stats-banner";

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const { data: tenants } = useTenants();

  const total = tenants?.length ?? 0;
  const active = tenants?.filter(t => t.status === "active").length ?? 0;
  const pending = tenants?.filter(t => t.status === "pending").length ?? 0;

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 bg-gray-50">
        <TenantStatsBanner
          total={total}
          active={active}
          pending={pending}
          onAddTenant={() => setLocation("/tenants/wizard")}
          onSyncModules={() => setLocation("/modules")}
        />
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

