import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { usePermissionTemplates, useSsoProviders } from "@/hooks/use-platform-config";

/**
 * Watches for new RBAC templates or SSO providers and notifies the user
 * so tenant management features can be updated accordingly.
 */
export function usePlatformChangeMonitor() {
  const { data: permissionTemplates = [] } = usePermissionTemplates();
  const { data: ssoProviders = [] } = useSsoProviders();
  const { toast } = useToast();

  const prevTemplates = useRef<string[]>([]);
  const prevProviders = useRef<string[]>([]);

  // Notify when new RBAC templates become available
  useEffect(() => {
    const names = permissionTemplates.map((t: any) => t.name || t.id);
    const newTemplates = names.filter((n) => !prevTemplates.current.includes(n));
    if (prevTemplates.current.length && newTemplates.length) {
      toast({
        title: "New RBAC templates available",
        description: newTemplates.join(", "),
      });
    }
    prevTemplates.current = names;
  }, [permissionTemplates, toast]);

  // Notify when new SSO providers become available
  useEffect(() => {
    const types = ssoProviders.map((p: any) => p.type || p.name);
    const newProviders = types.filter((t) => !prevProviders.current.includes(t));
    if (prevProviders.current.length && newProviders.length) {
      toast({
        title: "New SSO providers available",
        description: newProviders.join(", "),
      });
    }
    prevProviders.current = types;
  }, [ssoProviders, toast]);
}

export default usePlatformChangeMonitor;
