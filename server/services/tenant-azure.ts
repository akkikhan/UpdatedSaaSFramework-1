import { AzureADService } from "./azure-ad";

interface InviteResult {
  success: boolean;
  userId?: string;
  error?: string;
}

export class TenantAzureService {
  private getPlatformTenantId(): string {
    // For application tokens, we must use a concrete directory tenant id (not 'common')
    return (
      process.env.PLATFORM_TENANT_ID ||
      process.env.AZURE_DIRECTORY_TENANT_ID ||
      process.env.AZURE_TENANT_ID ||
      ""
    );
  }

  private getAzureApp(): AzureADService {
    const tenantId = this.getPlatformTenantId();
    return new AzureADService({
      tenantId,
      clientId: process.env.AZURE_CLIENT_ID || "",
      clientSecret: process.env.AZURE_CLIENT_SECRET || "",
    });
  }

  async onboardTenantAdmin(email: string): Promise<{ success: boolean; message: string; userId?: string }> {
    try {
      const tenantId = this.getPlatformTenantId();
      if (!tenantId || tenantId.toLowerCase() === "common") {
        return {
          success: false,
          message:
            "Application token requires a concrete tenant. Set PLATFORM_TENANT_ID (your directory tenant id) in .env.",
        };
      }

      // Ensure we can get an app token
      const app = this.getAzureApp();
      const verified = await app.verifyClientCredentials();
      if (!verified.ok) {
        return { success: false, message: `Failed to verify client credentials: ${verified.message}` };
      }

      // Try to find user
      const user = await this.findUserByEmail(email);
      let userId = user.userId;
      let inviteNote = "";
      if (!user.found) {
        const invite = await this.inviteUser(email);
        if (!invite.success) {
          return { success: false, message: `Invite failed: ${invite.error}` };
        }
        userId = invite.userId;
        inviteNote = " Invitation sent; ask the user to accept.";
      }

      // Add to Tenant-Admins group if configured
      const groupId = process.env.TENANT_ADMIN_GROUP_ID || "";
      if (groupId && userId) {
        const add = await this.addUserToGroup(userId, groupId);
        if (!add.success) {
          return {
            success: true,
            userId,
            message: `User invited/resolved but adding to group failed: ${add.error || "unknown"}.${inviteNote}`,
          };
        }
      }

      return { success: true, userId, message: `Tenant admin ready.${inviteNote}` };
    } catch (e: any) {
      return { success: false, message: e?.message || String(e) };
    }
  }

  private async getApplicationToken(): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      const tenant = this.getPlatformTenantId();
      const url = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.AZURE_CLIENT_ID || "",
          client_secret: process.env.AZURE_CLIENT_SECRET || "",
          grant_type: "client_credentials",
          scope: "https://graph.microsoft.com/.default",
        }),
      });
      if (!res.ok) return { success: false, error: `Token request failed: ${res.status} ${res.statusText}` };
      const json = await res.json();
      return { success: true, token: json.access_token };
    } catch (e: any) {
      return { success: false, error: e?.message || String(e) };
    }
  }

  private async inviteUser(email: string): Promise<InviteResult> {
    try {
      const token = await this.getApplicationToken();
      if (!token.success || !token.token) return { success: false, error: token.error || "no token" };
      const redirect = (process.env.PORTAL_BASE_URL || process.env.BASE_URL || "http://localhost:5000") + "/auth-success";
      const body = {
        invitedUserEmailAddress: email,
        inviteRedirectUrl: redirect,
        sendInvitationMessage: true,
        invitedUserMessageInfo: { customizedMessageBody: "You have been invited to the SaaS Framework tenant portal." },
      } as any;
      const resp = await fetch("https://graph.microsoft.com/v1.0/invitations", {
        method: "POST",
        headers: { Authorization: `Bearer ${token.token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const t = await resp.text();
        return { success: false, error: `Invite failed: ${resp.status} ${t}` };
      }
      const json = await resp.json();
      const userId: string | undefined = json?.invitedUser?.id || json?.invitedUserId || undefined;
      return userId ? { success: true, userId } : { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || String(e) };
    }
  }

  private async findUserByEmail(email: string): Promise<{ found: boolean; userId?: string; displayName?: string }> {
    try {
      const token = await this.getApplicationToken();
      if (!token.success || !token.token) return { found: false };
      const url =
        "https://graph.microsoft.com/v1.0/users?$filter=" +
        encodeURIComponent(`mail eq '${email}' or userPrincipalName eq '${email}'`) +
        "&$select=id,displayName,mail,userPrincipalName";
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${token.token}` } });
      if (!resp.ok) return { found: false };
      const json = await resp.json();
      const u = json?.value?.[0];
      return u ? { found: true, userId: u.id, displayName: u.displayName } : { found: false };
    } catch {
      return { found: false };
    }
  }

  private async addUserToGroup(userId: string, groupId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await this.getApplicationToken();
      if (!token.success || !token.token) return { success: false, error: token.error };
      const url = `https://graph.microsoft.com/v1.0/groups/${groupId}/members/$ref`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ "@odata.id": `https://graph.microsoft.com/v1.0/users/${userId}` }),
      });
      if (resp.ok || resp.status === 400) return { success: true };
      const t = await resp.text();
      return { success: false, error: `HTTP ${resp.status}: ${t}` };
    } catch (e: any) {
      return { success: false, error: e?.message || String(e) };
    }
  }
}

export const tenantAzureService = new TenantAzureService();

