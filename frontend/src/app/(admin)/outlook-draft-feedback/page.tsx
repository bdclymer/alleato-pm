import type { Metadata } from "next";
import { Suspense } from "react";
import { EmailsClient } from "@/app/(main)/[projectId]/emails/emails-client";

export const metadata: Metadata = {
  title: "Outlook Draft Feedback",
};

export const dynamic = "force-dynamic";

const BRANDON_MAILBOX_USER_ID = "bclymer@alleatogroup.com";

export default function OutlookDraftFeedbackPage() {
  return (
    <div className="-mt-2 flex min-h-0 flex-1 overflow-hidden">
      <Suspense>
        <EmailsClient
          detailsPanelMode="assistant-feedback"
          scope="global"
          source="outlook"
          navigationTabs={[]}
          mailboxUserId={BRANDON_MAILBOX_USER_ID}
        />
      </Suspense>
    </div>
  );
}
