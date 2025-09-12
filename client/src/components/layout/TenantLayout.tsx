import { ReactNode, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Home, Users, Shield, Key, FileText, Settings } from "lucide-react";

type Props = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  orgName?: string;
  orgStatus?: string;
  showSidebar?: boolean;
  minimal?: boolean;
  active?: string;
  onNavigate?: (key: string) => void;
};

export default function TenantLayout({
  children,
  title = "Tenant Portal",
  subtitle,
  orgName,
  orgStatus,
  showSidebar = true,
  minimal = false,
  active = "overview",
  onNavigate,
}: Props) {
  const [compact, setCompact] = useState<boolean>(() => {
    try { return localStorage.getItem("ui_density_compact") === "true"; } catch { return false; }
  });
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try { return localStorage.getItem("ui_theme_dark") === "true"; } catch { return false; }
  });
  const [highContrast, setHighContrast] = useState<boolean>(() => {
    try { return localStorage.getItem("ui_theme_contrast") === "true"; } catch { return false; }
  });

  useEffect(() => { try { localStorage.setItem("ui_density_compact", compact ? "true" : "false"); } catch {} }, [compact]);
  useEffect(() => {
    try { localStorage.setItem("ui_theme_dark", darkMode ? "true" : "false"); } catch {}
    const root = document.documentElement; if (darkMode) root.classList.add("dark"); else root.classList.remove("dark");
  }, [darkMode]);
  useEffect(() => {
    try { localStorage.setItem("ui_theme_contrast", highContrast ? "true" : "false"); } catch {}
    const root = document.documentElement; if (highContrast) root.classList.add("contrast-more"); else root.classList.remove("contrast-more");
  }, [highContrast]);

  const Menu = (
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Navigation</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton isActive={active === "overview"} onClick={() => onNavigate?.("overview")}>
                <Home /> <span>Overview</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton isActive={active === "users"} onClick={() => onNavigate?.("users")}>
                <Users /> <span>Users</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton isActive={active === "roles"} onClick={() => onNavigate?.("roles")}>
                <Shield /> <span>Roles</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton isActive={active === "authentication"} onClick={() => onNavigate?.("authentication")}>
                <Key /> <span>Authentication</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton isActive={active === "logs"} onClick={() => onNavigate?.("logs")}>
                <FileText /> <span>Logs</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton isActive={active === "modules"} onClick={() => onNavigate?.("modules")}>
                <Settings /> <span>Modules</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton isActive={active === "api-keys"} onClick={() => onNavigate?.("api-keys")}>
                <Key /> <span>API Keys</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );

  return (
    <div className={`min-h-screen ${compact ? "text-xs" : ""}`}>
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1600px] xl:max-w-[1800px] mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-semibold text-xs">{(orgName || title).substring(0,2).toUpperCase()}</span>
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800">{orgName || title}</div>
                {subtitle && <div className="text-[11px] text-slate-500">{subtitle}</div>}
              </div>
              {orgStatus && <Badge variant={orgStatus === "active" ? "default" : "secondary"}>{orgStatus}</Badge>}
            </div>
            {!minimal && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span>Compact</span>
                  <Switch checked={compact} onCheckedChange={(v) => setCompact(!!v)} />
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span>Dark</span>
                  <Switch checked={darkMode} onCheckedChange={(v) => setDarkMode(!!v)} />
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span>High Contrast</span>
                  <Switch checked={highContrast} onCheckedChange={(v) => setHighContrast(!!v)} />
                </div>
                <Button variant="outline" size="sm">⌘K / Ctrl+K</Button>
              </div>
            )}
          </div>
        </div>
      </div>
      {minimal ? (
        <div className="min-h-[calc(100vh-56px)] bg-slate-50 flex items-center justify-center px-4">
          <div className="w-full max-w-md">{children}</div>
        </div>
      ) : (
        <SidebarProvider>
          <div className="flex">
            {showSidebar && (
              <Sidebar collapsible="icon" className="bg-white">
                {Menu}
              </Sidebar>
            )}
            <SidebarInset className="flex-1">
              <div className="max-w-[1600px] xl:max-w-[1800px] mx-auto px-6 lg:px-8 py-8">
                {children}
              </div>
            </SidebarInset>
          </div>
        </SidebarProvider>
      )}
      <Toaster />
    </div>
  );
}
