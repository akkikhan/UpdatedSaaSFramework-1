import { useState } from "react";
import { useParams, useLocation } from "wouter";
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

const schema = z.object({ email: z.string().email("Enter a valid email") });

export default function PasswordResetRequest() {
  const { orgId } = useParams();
  const [, setLocation] = useLocation();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<{ email: string }>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: { email: string }) => {
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, orgId }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || "Failed to request password reset");
      }
      setMessage("Password reset email sent. Please check your inbox.");
    } catch (e: any) {
      setError(e.message || "Request failed");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Reset your password</CardTitle>
            <CardDescription>Enter the admin email for {orgId}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="admin@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  Send reset link
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
