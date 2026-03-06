"use client";

import { AlertCircle, Mail, Shield } from "lucide-react";
import { useMemo } from "react";

import { PageContainer } from "@/components/layout";
import { PageHeader } from "@/components/layout/page-header-unified";
import { ProfileImageUpload } from "@/components/misc/profile-image-upload";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCurrentUserProfile } from "@/hooks/use-current-user-profile";
import { getBestAvatarUrl } from "@/lib/gravatar";

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[160px_1fr] sm:gap-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground break-words">{value || "Not set"}</p>
    </div>
  );
}

export default function ProfilePage() {
  const { profile, isLoading, error } = useCurrentUserProfile();

  const initials = useMemo(() => {
    const name = profile?.fullName || "";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [profile?.fullName]);

  return (
    <>
      <PageHeader
        title={profile?.fullName || "Profile"}
        description="View account information that is currently active in Alleato."
        breadcrumbs={[
          { label: "Account", href: "/settings" },
          { label: "Profile" },
        ]}
      />

      <PageContainer className="space-y-8">
        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Couldn't load profile</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <section className="space-y-4 rounded-lg border bg-card p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4 min-w-0">
              <Avatar className="h-14 w-14 shrink-0">
                {profile?.avatarUrl ? (
                  <AvatarImage src={profile.avatarUrl} alt={profile.fullName} />
                ) : profile?.email ? (
                  <AvatarImage
                    src={getBestAvatarUrl(undefined, profile.email)}
                    alt={profile.fullName}
                  />
                ) : null}
                <AvatarFallback>{initials || "?"}</AvatarFallback>
              </Avatar>
              <div className="space-y-2 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-foreground break-words">
                    {profile?.fullName || (isLoading ? "Loading..." : "Unknown user")}
                  </h2>
                  <Badge variant={profile?.isAdmin ? "default" : "secondary"}>
                    {profile?.isAdmin ? "Super Admin" : "Standard user"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground break-words">
                  {profile?.title || "No title set"}
                  {profile?.company ? ` · ${profile.company}` : ""}
                </p>
              </div>
            </div>

            <ProfileImageUpload
              currentImage={profile?.avatarUrl}
              userEmail={profile?.email || ""}
              userName={profile?.fullName || "User"}
            />
          </div>
        </section>

        <section className="space-y-4 rounded-lg border bg-card p-6">
          <h3 className="text-base font-semibold text-foreground">Active account details</h3>
          <div className="space-y-4">
            <InfoRow label="Email" value={profile?.email} />
            <Separator />
            <InfoRow label="Phone" value={profile?.phone} />
            <Separator />
            <InfoRow label="Location" value={profile?.location} />
            <Separator />
            <InfoRow label="Timezone" value={profile?.timezone} />
            <Separator />
            <InfoRow label="Region" value={profile?.region} />
            <Separator />
            <InfoRow label="Role" value={profile?.role} />
          </div>
        </section>

        <section className="space-y-4 rounded-lg border bg-card p-6">
          <h3 className="text-base font-semibold text-foreground">System access</h3>
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <Shield className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              {profile?.isAdmin
                ? "This account has Super Admin privileges."
                : "This account has standard privileges based on project memberships."}
            </p>
          </div>
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <Mail className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Authentication and password management are handled by Supabase Auth.</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Only verified, active account fields are shown on this page.
          </p>
        </section>
      </PageContainer>
    </>
  );
}
