import { useState } from "react";
import { Plus, Eye, Edit, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface EmailTemplate {
  id: string;
  tenantId: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables: string[];
  createdAt: string;
  updatedAt: string;
}

export default function EmailTemplatesPage() {
  const [tenantId, setTenantId] = useState("");
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const tenantsQuery = useQuery({
    queryKey: ["/api/tenants"],
    queryFn: async () => {
      const res = await fetch("/api/tenants");
      if (!res.ok) throw new Error("Failed to fetch tenants");
      return res.json() as Promise<Array<{ id: string; name: string }>>;
    },
  });

  const templatesQuery = useQuery({
    queryKey: ["/api/email/templates", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const res = await fetch(`/api/email/templates?tenantId=${tenantId}`);
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json() as Promise<EmailTemplate[]>;
    },
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async (template: Partial<EmailTemplate>) => {
      if (editing) {
        const res = await fetch(`/api/email/templates/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(template),
        });
        if (!res.ok) throw new Error("Failed to update template");
        return res.json();
      } else {
        const res = await fetch(`/api/email/templates`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...template, tenantId, variables: [] }),
        });
        if (!res.ok) throw new Error("Failed to create template");
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email/templates", tenantId] });
      setEditing(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save template", variant: "destructive" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/email/templates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete template");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email/templates", tenantId] });
    },
  });

  const startNew = () => {
    setEditing({
      id: "",
      tenantId,
      name: "",
      subject: "",
      htmlContent: "",
      variables: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Email Templates</h1>

      <div className="max-w-xs">
        <Select onValueChange={setTenantId} value={tenantId}>
          <SelectTrigger>
            <SelectValue placeholder="Select Tenant" />
          </SelectTrigger>
          <SelectContent>
            {tenantsQuery.data?.map(t => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {editing && (
        <div className="space-y-4 border p-4 rounded-md bg-white">
          <Input
            placeholder="Template Name"
            value={editing.name}
            onChange={e => setEditing({ ...editing, name: e.target.value })}
          />
          <Input
            placeholder="Subject"
            value={editing.subject}
            onChange={e => setEditing({ ...editing, subject: e.target.value })}
          />
          <Textarea
            placeholder="HTML Content"
            value={editing.htmlContent}
            onChange={e => setEditing({ ...editing, htmlContent: e.target.value })}
            className="h-40"
          />
          <div className="flex gap-2">
            <Button
              onClick={() =>
                saveTemplateMutation.mutate({
                  name: editing.name,
                  subject: editing.subject,
                  htmlContent: editing.htmlContent,
                })
              }
            >
              Save
            </Button>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Templates</h3>
            <p className="text-slate-600 text-sm mt-1">Manage email templates per tenant</p>
          </div>
          <Button className="btn-primary flex items-center gap-2" onClick={startNew} disabled={!tenantId}>
            <Plus size={16} /> New Template
          </Button>
        </div>
        <div className="p-6 space-y-4">
          {templatesQuery.data?.map(t => (
            <div key={t.id} className="border p-4 rounded-lg flex items-center justify-between">
              <div>
                <h4 className="font-medium text-slate-800">{t.name}</h4>
                <p className="text-sm text-slate-500 mt-1">{t.subject}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => alert(t.htmlContent)} title="Preview">
                  <Eye size={16} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditing(t)} title="Edit">
                  <Edit size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteTemplateMutation.mutate(t.id)}
                  title="Delete"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))}
          {templatesQuery.data && templatesQuery.data.length === 0 && (
            <p className="text-sm text-slate-500">No templates configured.</p>
          )}
        </div>
      </div>
    </div>
  );
}

