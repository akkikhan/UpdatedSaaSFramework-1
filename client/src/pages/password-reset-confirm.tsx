import { useState } from "react";
import { useParams } from "wouter";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
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
  .refine(vals => vals.password === vals.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

export default function PasswordResetConfirm() {
  const { orgId } = useParams();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const token = new URLSearchParams(window.location.search).get("token") || "";

  const form = useForm<{ password: string; confirm: string }>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });

  const onSubmit = async (data: { password: string; confirm: string }) => {
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: data.password }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || "Failed to reset password");
      }
      setMessage("Password reset successful. You can now log in.");
    } catch (e: any) {
      setError(e.message || "Request failed");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Set a new password</CardTitle>
            <CardDescription>Enter your new password</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter new password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Re-enter password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  Reset Password
                </Button>
              </form>
            </Form>
            {message && <p className="text-green-700 text-sm mt-4">{message}</p>}
            {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
            <div className="text-sm mt-6">
              <a className="text-blue-600" href={`/tenant/${orgId}/login`}>
                Back to login
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
