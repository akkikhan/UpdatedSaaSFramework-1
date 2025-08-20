import { Plus, Eye, Edit, Send, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatsCard from "@/components/ui/stats-card";

export default function EmailTemplatesPage() {
  return (
    <div className="space-y-6">
      {/* Email Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          title="Emails Sent Today"
          value={23}
          icon={Send}
          iconColor="text-blue-600"
          backgroundColor="bg-blue-100"
        />
        <StatsCard
          title="Delivery Rate"
          value="98.5%"
          icon={CheckCircle}
          iconColor="text-green-600"
          backgroundColor="bg-green-100"
        />
        <StatsCard
          title="Failed Emails"
          value={3}
          icon={AlertTriangle}
          iconColor="text-red-600"
          backgroundColor="bg-red-100"
        />
      </div>

      {/* Email Templates */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Email Templates</h3>
              <p className="text-slate-600 text-sm mt-1">Manage your email templates and configurations</p>
            </div>
            <Button className="btn-primary flex items-center space-x-2">
              <Plus size={16} />
              <span>New Template</span>
            </Button>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            <div className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-slate-800">Tenant Onboarding</h4>
                  <p className="text-sm text-slate-500 mt-1">Welcome email sent to new tenant administrators</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Active</span>
                    <span className="text-xs text-slate-500">Last sent: 2 hours ago</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" title="Preview">
                    <Eye size={16} />
                  </Button>
                  <Button variant="ghost" size="sm" title="Edit">
                    <Edit size={16} />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-500" title="Send Test">
                    <Send size={16} />
                  </Button>
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-slate-800">Password Reset</h4>
                  <p className="text-sm text-slate-500 mt-1">Password recovery email for tenant users</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Active</span>
                    <span className="text-xs text-slate-500">Last sent: 1 day ago</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" title="Preview">
                    <Eye size={16} />
                  </Button>
                  <Button variant="ghost" size="sm" title="Edit">
                    <Edit size={16} />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-500" title="Send Test">
                    <Send size={16} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SMTP Configuration */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">SMTP Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">SMTP Host</label>
            <Input value="smtp.office365.com" readOnly />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">SMTP Port</label>
            <Input value="587" readOnly />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">From Email</label>
            <Input value="dev-saas@primussoft.com" readOnly />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
            <div className="flex items-center space-x-2 mt-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-green-600 font-medium text-sm">Connected</span>
            </div>
          </div>
        </div>
        <Button className="mt-4 btn-primary">Test Connection</Button>
      </div>
    </div>
  );
}
