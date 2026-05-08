import Image from "next/image";

import { LoginForm } from "@/components/misc/login-form";
import { validateCallbackUrl } from "@/lib/validation/callback-url";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  // Await searchParams as required in Next.js 15
  const params = await searchParams;
  // Validate callback URL to prevent open redirect attacks
  const redirectTo = validateCallbackUrl(params.callbackUrl);

  return (
    <main className="relative flex min-h-svh overflow-hidden bg-surface-inverse text-primary-foreground">
      <Image
        src="/images/auth/login-commercial-construction.jpg"
        alt=""
        fill
        sizes="100vw"
        className="object-cover opacity-34 saturate-0"
        priority
      />
      <div className="absolute inset-0 bg-surface-inverse/80" />

      <div className="relative z-10 mx-auto flex min-h-svh w-full max-w-md flex-col items-center justify-center px-6 py-10 sm:px-8">
        <div className="flex w-full flex-col items-center">
          <Image
            src="/Alleato-Group-Logo_Light.png"
            alt="Alleato Group"
            width={320}
            height={69}
            className="mb-14 h-auto w-80 max-w-full object-contain"
            priority
          />

          <LoginForm redirectTo={redirectTo} />
        </div>

        <p className="absolute bottom-6 left-1/2 w-full -translate-x-1/2 px-6 text-center text-xs text-primary-foreground/32">
          All rights reserved
        </p>
      </div>
    </main>
  );
}
