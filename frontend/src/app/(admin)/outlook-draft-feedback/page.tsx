import type { Metadata } from "next";
import { Suspense } from "react";
import { EmailInboxClient } from "@/features/emails/inbox/email-inbox-client";

export const metadata: Metadata = {
  title: "Outlook Draft Feedback",
};

export const dynamic = "force-dynamic";

export default function OutlookDraftFeedbackPage() {
  return (
    <div className="-mt-2 flex min-h-0 flex-1 overflow-hidden">
      <Suspense>
        <EmailInboxClient initialTab="reviewed" />
      </Suspense>
    </div>
  );
}
