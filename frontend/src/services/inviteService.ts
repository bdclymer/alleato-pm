import type { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

export interface InviteResult {
  success: boolean;
  token?: string;
  message?: string;
  error?: string;
}

export interface InviteAcceptResult {
  success: boolean;
  redirectUrl?: string;
  error?: string;
}

export class InviteService {
  constructor(
    private supabase: ReturnType<typeof createClient<Database>>,
    private emailService?: EmailService,
  ) {}

  async sendInvite(projectId: string, personId: string): Promise<InviteResult> {
    const projectIdNum = Number.parseInt(projectId, 10);

    try {
      // Get person and membership details
      const { data: person, error: personError } = await this.supabase
        .from("people")
        .select(
          `
          *,
          project_directory_memberships!inner(
            *,
            project:projects(*)
          )
        `,
        )
        .eq("id", personId)
        .eq("project_directory_memberships.project_id", projectIdNum)
        .single();

      if (personError || !person) {
        return { success: false, error: "Person not found" };
      }

      if (person.person_type !== "user") {
        return { success: false, error: "Only users can be invited" };
      }

      if (!person.email) {
        return { success: false, error: "User has no email address" };
      }

      const membership = person.project_directory_memberships[0];
      const project = membership.project;

      // Generate secure token
      const token = this.generateInviteToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

      // Update membership with invite info
      const { error: updateError } = await this.supabase
        .from("project_directory_memberships")
        .update({
          invite_token: token,
          invite_expires_at: expiresAt.toISOString(),
          invited_at: membership.invited_at || new Date().toISOString(),
          last_invited_at: new Date().toISOString(),
          invite_status: "invited",
        })
        .eq("project_id", projectIdNum)
        .eq("person_id", personId);

      if (updateError) {
        return { success: false, error: "Failed to update invite status" };
      }

      // Send email
      if (this.emailService) {
        const inviteUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/invite?token=${token}`;

        await this.emailService.send({
          to: person.email,
          template: "project-invite",
          data: {
            firstName: person.first_name,
            projectName: project.name,
            inviteUrl,
            expiresAt: expiresAt.toLocaleDateString(),
          },
        });
      }

      return {
        success: true,
        token,
        message: `Invitation sent to ${person.email}`,
      };
    } catch (error) {
      return {
        success: false,
        error: "An unexpected error occurred",
      };
    }
  }

  async resendInvite(
    projectId: string,
    personId: string,
  ): Promise<InviteResult> {
    const projectIdNum = Number.parseInt(projectId, 10);

    try {
      // Check for existing valid invite
      const { data: membership, error: membershipError } = await this.supabase
        .from("project_directory_memberships")
        .select("*")
        .eq("project_id", projectIdNum)
        .eq("person_id", personId)
        .single();

      if (membershipError || !membership) {
        return { success: false, error: "Membership not found" };
      }

      // Check if existing token is still valid
      if (membership.invite_token && membership.invite_expires_at) {
        const expiryDate = new Date(membership.invite_expires_at);
        const now = new Date();

        if (expiryDate > now) {
          // Reuse existing token
          return this.sendInviteEmail(
            projectId,
            personId,
            membership.invite_token,
          );
        }
      }

      // Generate new token
      return this.sendInvite(projectId, personId);
    } catch (error) {
      return {
        success: false,
        error: "An unexpected error occurred",
      };
    }
  }

  async acceptInvite(token: string): Promise<InviteAcceptResult> {
    try {
      // Find membership by token
      const { data: membership, error: membershipError } = await this.supabase
        .from("project_directory_memberships")
        .select(
          `
          *,
          person:people(*),
          project:projects(*)
        `,
        )
        .eq("invite_token", token)
        .single();

      if (membershipError || !membership) {
        return { success: false, error: "Invalid invitation token" };
      }

      // Check expiration
      if (membership.invite_expires_at) {
        const expiryDate = new Date(membership.invite_expires_at);
        if (expiryDate < new Date()) {
          return { success: false, error: "Invitation has expired" };
        }
      }

      // Check if already accepted
      if (membership.invite_status === "accepted") {
        return {
          success: true,
          redirectUrl: `/projects/${membership.project_id}/directory`,
        };
      }

      // Create auth user if doesn't exist
      const person = membership.person;
      if (!person.email) {
        return { success: false, error: "Invalid user data" };
      }

      // Check if auth user exists by listing users with email filter
      const { data, error: listError } =
        await this.supabase.auth.admin.listUsers();
      const authUser = data?.users?.find(
        (u: { email?: string }) => u.email === person.email,
      );

      if (!authUser && !listError) {
        // Create auth user
        const { data: newAuthUser, error: authError } =
          await this.supabase.auth.admin.createUser({
            email: person.email,
            email_confirm: true,
            user_metadata: {
              first_name: person.first_name,
              last_name: person.last_name,
            },
          });

        if (authError) {
          return { success: false, error: "Failed to create user account" };
        }

        // Create users_auth link
        await this.supabase.from("users_auth").insert({
          person_id: person.id,
          auth_user_id: newAuthUser.user.id,
        });
      }

      // Update membership status
      const { error: updateError } = await this.supabase
        .from("project_directory_memberships")
        .update({
          invite_status: "accepted",
          status: "active",
        })
        .eq("id", membership.id);

      if (updateError) {
        return { success: false, error: "Failed to update membership" };
      }

      // Return success with redirect URL
      return {
        success: true,
        redirectUrl: `/auth/set-password?token=${token}&email=${person.email}`,
      };
    } catch (error) {
      return {
        success: false,
        error: "An unexpected error occurred",
      };
    }
  }

  async checkInviteStatus(
    projectId: string,
    personId: string,
  ): Promise<string> {
    const projectIdNum = Number.parseInt(projectId, 10);

    const { data, error } = await this.supabase
      .from("project_directory_memberships")
      .select("invite_status, invite_expires_at")
      .eq("project_id", projectIdNum)
      .eq("person_id", personId)
      .single();

    if (error || !data) return "not_invited";

    if (data.invite_status === "invited" && data.invite_expires_at) {
      const expiryDate = new Date(data.invite_expires_at);
      if (expiryDate < new Date()) {
        return "expired";
      }
    }

    return data.invite_status || "not_invited";
  }

  private generateInviteToken(): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let token = "";
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  private async sendInviteEmail(
    projectId: string,
    personId: string,
    token: string,
  ): Promise<InviteResult> {
    const projectIdNum = Number.parseInt(projectId, 10);

    try {
      // Get person and project details
      const { data: person, error } = await this.supabase
        .from("people")
        .select(
          `
          *,
          project_directory_memberships!inner(
            *,
            project:projects(*)
          )
        `,
        )
        .eq("id", personId)
        .eq("project_directory_memberships.project_id", projectIdNum)
        .single();

      if (error || !person || !person.email) {
        return { success: false, error: "Failed to get person details" };
      }

      const membership = person.project_directory_memberships[0];
      const project = membership.project;

      if (this.emailService) {
        const inviteUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/invite?token=${token}`;

        await this.emailService.send({
          to: person.email,
          template: "project-invite",
          data: {
            firstName: person.first_name,
            projectName: project.name,
            inviteUrl,
            expiresAt: membership.invite_expires_at
              ? new Date(membership.invite_expires_at).toLocaleDateString()
              : '',
          },
        });
      }

      // Update last invited timestamp
      await this.supabase
        .from("project_directory_memberships")
        .update({ last_invited_at: new Date().toISOString() })
        .eq("project_id", projectIdNum)
        .eq("person_id", personId);

      return {
        success: true,
        token,
        message: `Invitation resent to ${person.email}`,
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to send email",
      };
    }
  }
}

// Email service interface (to be implemented separately)
interface EmailService {
  send(options: {
    to: string;
    template: string;
    data: Record<string, unknown>;
  }): Promise<void>;
}
