import Image from "next/image";
import Link from "next/link";

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
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <Image
              src="/Alleato Favicon.png"
              alt="Alleato"
              width={32}
              height={32}
              className="object-contain"
            />
            <span className="text-xl font-semibold">Alleato</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm redirectTo={redirectTo} />
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <Image
          src="/alleato-group.jpg"
          alt="Alleato Group"
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
          priority
        />
      </div>
    </div>
  );
}
