import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z
  .object({
    password: z.string().min(6, "At least 6 characters"),
    confirm: z.string().min(6, "At least 6 characters"),
  })
  .refine(v => v.password === v.confirm, { path: ["confirm"], message: "Passwords do not match" });

export default function PasswordChange() {
  const { orgId } = useParams();
  const [, setLocation] = useLocation();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<{ password: string; confirm: string }>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });

  const onSubmit = async (data: { password: string; confirm: string }) => {
    setMessage(null);
    setError(null);
    try {
      const token =
        localStorage.getItem(`tenant_token_${orgId}`) || localStorage.getItem("tenant_token") || "";
      const stored =
        localStorage.getItem(`tenant_user_${orgId}`) || localStorage.getItem("tenant_user") || "";
      const user = stored ? JSON.parse(stored) : null;
      if (!user?.id) throw new Error("User not found");
      const res = await fetch(`/auth/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-tenant-id": user.tenantId || "",
        },
        body: JSON.stringify({ password: data.password }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || "Failed to change password");
      }
      // Clear mustChangePassword flag client-side
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed?.metadata) parsed.metadata.mustChangePassword = false;
          localStorage.setItem(`tenant_user_${orgId}`, JSON.stringify(parsed));
          localStorage.setItem("tenant_user", JSON.stringify(parsed));
        } catch {}
      }
      setMessage("Password updated. Redirecting...");
      setTimeout(() => setLocation(`/tenant/${orgId}/dashboard`), 1000);
    } catch (e: any) {
      setError(e.message || "Request failed");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Set a new password for your account</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  name="password"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="confirm"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  Update Password
                </Button>
              </form>
            </Form>
            {message && <p className="text-green-700 text-sm mt-4">{message}</p>}
            {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
