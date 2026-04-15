interface EmailAttachment {
  filename: string;
  content: string;
}

interface SendEmailOptions {
  to: string[];
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
}

interface ResendSuccessResponse {
  id: string;
}

function getFromAddress(): string {
  const configuredFrom =
    process.env.RESEND_FROM_EMAIL ||
    process.env.DIGEST_FROM_EMAIL ||
    process.env.EMAIL_FROM_ADDRESS;

  if (configuredFrom) {
    return configuredFrom;
  }

  if (process.env.NODE_ENV !== "production") {
    return "Alleato <onboarding@resend.dev>";
  }

  throw new Error(
    "RESEND_FROM_EMAIL, DIGEST_FROM_EMAIL, or EMAIL_FROM_ADDRESS must be configured with a verified sender address",
  );
}

export async function sendDocumentEmail(
  options: SendEmailOptions,
): Promise<ResendSuccessResponse> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getFromAddress(),
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments ?? [],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to send email: ${body || response.statusText}`);
  }

  return (await response.json()) as ResendSuccessResponse;
}
