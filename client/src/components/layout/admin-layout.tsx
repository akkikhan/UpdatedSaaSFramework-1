import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Building,
  ChartPie,
  Code,
  Inbox,
  Server,
  LayersIcon,
  Settings,
  FileText,
  Shield,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { handleUnauthorized } from "@/lib/queryClient";

const navigation = [
  { name: "Dashboard", href: "/", icon: ChartPie, id: "dashboard" },
  { name: "Tenants", href: "/tenants", icon: Building, id: "tenants" },
  { name: "RBAC Config", href: "/rbac-config", icon: Shield, id: "rbac-config" },
  { name: "Module Management", href: "/modules", icon: Settings, id: "modules" },
  { name: "System Logs", href: "/logs", icon: FileText, id: "logs" },
  { name: "Compliance", href: "/compliance", icon: Shield, id: "compliance" },
  { name: "SDK Integration", href: "/sdk", icon: Code, id: "sdk" },
  { name: "Email Templates", href: "/emails", icon: Inbox, id: "emails" },
  { name: "System Health", href: "/system", icon: Server, id: "system" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [currentPage, setCurrentPage] = useState(() => {
    const path = location === "/" ? "/" : location;
    return navigation.find((item) => item.href === path) || navigation[0];
  });

  const handleLogoutClick = () => {
    handleUnauthorized();
  };

  return (
    <div className="admin-layout flex h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg border-r border-slate-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <LayersIcon className="text-white text-lg" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-800">SaaS Framework</h1>
              <p className="text-sm text-slate-500">Admin Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href || (location === "/" && item.href === "/");
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setCurrentPage(item)}
                className={`nav-item ${isActive ? "active" : ""}`}
                data-testid={`nav-${item.id}`}
              >
                <item.icon size={20} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Admin Profile */}
        <div className="absolute bottom-0 w-64 p-4 border-t border-slate-200 bg-white">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">PA</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-800">Platform Admin</p>
              <p className="text-xs text-slate-500">dev-saas@primussoft.com</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-800" data-testid="page-title">
                {currentPage.name}
              </h2>
              <p className="text-slate-600 mt-1" data-testid="page-subtitle">
                {getPageSubtitle(currentPage.id)}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-slate-600">All Systems Operational</span>
              </div>
              <Button
                variant="ghost"
                className="text-slate-600 hover:text-slate-900"
                onClick={handleLogoutClick}
                data-testid="logout-button"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="admin-content flex-1 p-6 overflow-y-auto">
          <div className="page-container max-w-full">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function getPageSubtitle(pageId: string): string {
  const subtitles = {
    dashboard: "Monitor your SaaS platform performance and manage tenants",
    tenants: "Manage all your platform tenants",
    sdk: "Integration guides and documentation",
    emails: "Manage email templates and delivery",
    system: "Monitor system performance and service status",
  };
  return subtitles[pageId as keyof typeof subtitles] || "";
}
