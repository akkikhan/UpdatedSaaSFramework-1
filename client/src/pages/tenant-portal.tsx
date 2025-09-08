import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Temporary placeholder page for viewing a tenant's portal within the admin UI.
 * This allows the development server to compile until the real portal page is implemented.
 */
export default function TenantPortalPage() {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Tenant Portal</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This section is under construction.</p>
        </CardContent>
      </Card>
    </div>
  );
}
