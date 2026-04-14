import { UpdatePasswordForm } from "@/components/misc/update-password-form";

interface PageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <UpdatePasswordForm next={next} />
      </div>
    </div>
  );
}
