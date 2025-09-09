import { useState } from "react";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useTenants, useNotificationHistory, useBulkResendNotifications } from "@/hooks/use-tenants";

export default function NotificationHistoryPage() {
  const { data: tenants = [] } = useTenants();
  const [tenantId, setTenantId] = useState<string | undefined>();
  const [recipient, setRecipient] = useState("");
  const [channel, setChannel] = useState("");
  const [status, setStatus] = useState("");
  const [template, setTemplate] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: notifications = [] } = useNotificationHistory(tenantId, {
    recipientId: recipient || undefined,
    channel: channel || undefined,
    status: status || undefined,
    template: template || undefined,
    limit: 50,
  });

  const bulkResend = useBulkResendNotifications(tenantId);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allSelected = notifications.length > 0 && selected.size === notifications.length;
  const toggleAll = () => {
    setSelected(prev => {
      if (allSelected) return new Set();
      return new Set(notifications.map(n => n.id));
    });
  };

  const resendSelected = () => {
    bulkResend.mutate(Array.from(selected));
    setSelected(new Set());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/tenants">
          <Button variant="ghost">Back to Tenants</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Notification History</h1>
          <p className="text-slate-600">Review and resend tenant notifications</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-sm font-medium text-slate-700">Tenant</label>
          <Select onValueChange={v => setTenantId(v)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select tenant" />
            </SelectTrigger>
            <SelectContent>
              {tenants.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Recipient</label>
          <Input value={recipient} onChange={e => setRecipient(e.target.value)} className="w-[200px]" />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Channel</label>
          <Select onValueChange={v => setChannel(v)} value={channel}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Status</label>
          <Select onValueChange={v => setStatus(v)} value={status}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Template</label>
          <Input value={template} onChange={e => setTemplate(e.target.value)} className="w-[200px]" />
        </div>
        <Button
          variant="outline"
          onClick={resendSelected}
          disabled={selected.size === 0 || bulkResend.isPending || !tenantId}
        >
          Resend Selected
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            bulkResend.mutate(notifications.map(n => n.id));
          }}
          disabled={notifications.length === 0 || bulkResend.isPending || !tenantId}
        >
          Resend All
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleAll}
                aria-label="Select all notifications"
              />
            </TableHead>
            <TableHead>Recipient</TableHead>
            <TableHead>Channel</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Template</TableHead>
            <TableHead>Preview</TableHead>
            <TableHead>Sent</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {notifications.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                {tenantId ? "No notifications found" : "Select a tenant to view notifications"}
              </TableCell>
            </TableRow>
          )}
          {notifications.map(n => (
            <TableRow key={n.id} data-testid={`notification-row-${n.id}`}>
              <TableCell>
                <Checkbox
                  checked={selected.has(n.id)}
                  onCheckedChange={() => toggle(n.id)}
                  aria-label="Select notification"
                />
              </TableCell>
              <TableCell>{n.recipientId || "—"}</TableCell>
              <TableCell>{n.channel}</TableCell>
              <TableCell>{n.status}</TableCell>
              <TableCell>{n.subject || "—"}</TableCell>
              <TableCell>{n.template || "—"}</TableCell>
              <TableCell>{n.body ? n.body.slice(0, 40) : "—"}</TableCell>
              <TableCell>{n.timestamp ? new Date(n.timestamp).toLocaleString() : "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
