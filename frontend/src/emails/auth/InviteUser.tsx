import * as React from "react";
import { EmailShell } from "../_shell/EmailShell";

export interface InviteUserProps {
  inviterName: string;
  inviteeName?: string;
  role?: string;
  acceptUrl: string;
  expiresInHours?: number;
}

export default function InviteUser({
  inviterName,
  inviteeName,
  role,
  acceptUrl,
  expiresInHours = 72,
}: InviteUserProps) {
  return (
    <EmailShell
      previewText={`${inviterName} invited you to join Alleato`}
      eyebrow="Invitation"
      heading="You're invited to Alleato"
      ctaLabel="Accept invitation"
      ctaUrl={acceptUrl}
      footerNote={`This invitation expires in ${expiresInHours} hours.`}
    >
      <p style={{ margin: "0 0 12px" }}>
        {inviteeName ? `Hi ${inviteeName},` : "Hi,"}
      </p>
      <p style={{ margin: "0 0 12px" }}>
        <strong>{inviterName}</strong> has invited you to join the Alleato
        construction management platform
        {role ? (
          <>
            {" "}
            as a <strong>{role}</strong>
          </>
        ) : null}
        .
      </p>
      <p style={{ margin: "0 0 12px" }}>
        Click the button below to accept and set up your account.
      </p>
    </EmailShell>
  );
}
