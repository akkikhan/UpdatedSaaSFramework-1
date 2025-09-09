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
  ChevronDown,
  User,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    return navigation.find(item => item.href === path) || navigation[0];
  });

  const handleLogout = () => {
    handleUnauthorized();
  };

  return (
    <div className="admin-layout flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="aspire-sidebar w-64 bg-white shadow-sm border-r border-gray-200">
        {/* Logo Section */}
        <div className="aspire-sidebar-header p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
              <LayersIcon className="text-white" size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">SaaS Platform</h1>
              <p className="text-sm text-purple-600 font-medium">Admin Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="aspire-nav p-4 space-y-1">
          {navigation.map(item => {
            const isActive = location === item.href || (location === "/" && item.href === "/");
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setCurrentPage(item)}
                className={`aspire-nav-item ${isActive ? "active" : ""}`}
                data-testid={`nav-${item.id}`}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Admin Profile */}
        <div className="aspire-sidebar-footer absolute bottom-0 w-64 p-4 border-t border-gray-100 bg-white">
          <div className="flex items-center space-x-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-full flex items-center justify-center">
              <User className="text-white" size={18} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">Platform Admin</p>
              <p className="text-xs text-gray-500">dev-saas@primussoft.com</p>
            </div>
            <ChevronDown className="text-gray-400" size={16} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {/* Aspire Header - Exact Match */}
        <div className="aspire-header bg-white border-b border-gray-100 px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Left Side - Page Title */}
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-semibold text-gray-900" data-testid="page-title">
                {currentPage.name}
              </h1>
            </div>

            {/* Right Side - Simplified Layout */}
            <div className="flex items-center space-x-6">
              {/* Date Display */}
              <div className="text-sm text-gray-600 font-medium">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </div>

              {/* Notification Bell - Icon Only */}
              <div className="relative">
                <button
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title=""
                  aria-label="Notifications"
                >
                  <Bell className="text-gray-600" size={20} />
                  {/* Red notification dot */}
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
                </button>
              </div>

              {/* User Profile */}
              <div className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 rounded-lg p-2 transition-colors">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">PA</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">Platform Admin</div>
                  <div className="text-xs text-gray-500">dev-saas@primussoft.com</div>
                </div>
                <ChevronDown className="text-gray-400" size={16} />
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="aspire-content flex-1 p-6 overflow-y-auto bg-gray-50">
          <div className="page-container max-w-full">{children}</div>
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
