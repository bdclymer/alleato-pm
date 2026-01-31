"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  Phone,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { useMemo } from "react";

import { PageContainer, PageHeader } from "@/components/layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useCurrentUserProfile } from "@/hooks/use-current-user-profile";
import { ProfileImageUpload } from "@/components/misc/profile-image-upload";
import { getBestAvatarUrl } from "@/lib/gravatar";

const notificationPreferences = [
  {
    title: "Project updates",
    description: "Daily summaries for active projects and assigned tasks",
    defaultChecked: true,
  },
  {
    title: "Team messages",
    description: "Mentions, direct replies, and channel activity",
    defaultChecked: true,
  },
  {
    title: "Approvals",
    description: "Submittals, change orders, and invoice approvals",
    defaultChecked: true,
  },
  {
    title: "Weekly digest",
    description: "High-level portfolio health and blockers",
    defaultChecked: false,
  },
];

const communicationPreferences = [
  {
    title: "Email",
    description:
      "Send detailed summaries and approvals to jordan@alleato.build",
    defaultChecked: true,
  },
  {
    title: "Mobile push",
    description: "Time-sensitive alerts while you're on site",
    defaultChecked: true,
  },
  {
    title: "SMS",
    description: "Critical escalations when away from the app",
    defaultChecked: false,
  },
];

// Removed fake security items - these should come from actual auth data

export default function ProfilePage() {
  const { profile } = useCurrentUserProfile();

  const initials = useMemo(() => {
    const name = profile?.fullName || "";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }, [profile?.fullName]);

  const contactDetails = [
    {
      icon: Mail,
      value: profile?.email ?? "Add an email address",
    },
    {
      icon: Phone,
      value: profile?.phone ?? "Add a phone number",
    },
    {
      icon: MapPin,
      value: profile?.location ?? "Share your location",
    },
  ];

  const specialties = profile?.specialties || [];

  const profileCompleteness = profile?.profileCompleteness ?? 0;

  return (
    <>
      <PageHeader
        title={profile?.fullName || "Profile"}
        description="Manage your personal details, notification preferences, and security settings."
        breadcrumbs={[
          { label: "Account", href: "/settings" },
          { label: profile?.fullName ? "Profile" : "Profile setup" },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              Edit profile
            </Button>
            <Button size="sm">Save changes</Button>
          </div>
        }
      />

      <PageContainer className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4 min-w-0 flex-1">
                <Avatar className="h-16 w-16 shrink-0">
                  {profile?.avatarUrl ? (
                    <AvatarImage
                      src={profile.avatarUrl}
                      alt={profile.fullName}
                    />
                  ) : profile?.email ? (
                    <AvatarImage
                      src={getBestAvatarUrl(undefined, profile.email)}
                      alt={profile.fullName}
                    />
                  ) : null}
                  <AvatarFallback>{initials || "?"}</AvatarFallback>
                </Avatar>
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-xl break-words">
                      {profile?.fullName || "Your profile"}
                    </CardTitle>
                    <Badge variant="secondary">
                      {profile?.role || "Team member"}
                    </Badge>
                    {profile?.isAdmin && (
                      <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                        <Shield className="mr-1 h-3 w-3" />
                        Super Admin
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="break-words">
                    {[profile?.title, profile?.company]
                      .filter(Boolean)
                      .join(" · ") || "Share your title and company"}
                  </CardDescription>
                  <div className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-muted-foreground">
                    <span className="break-words">
                      License: {profile?.licenseNumber || "Add license"}
                    </span>
                    <span className="hidden sm:inline text-gray-300">•</span>
                    <span className="break-words">
                      Timezone: {profile?.timezone || "Set your timezone"}
                    </span>
                    <span className="hidden sm:inline text-gray-300">•</span>
                    <span className="break-words">
                      Primary region: {profile?.region || "Not specified"}
                    </span>
                  </div>
                </div>
              </div>
              <ProfileImageUpload
                currentImage={profile?.avatarUrl}
                userEmail={profile?.email || ""}
                userName={profile?.fullName || "User"}
              />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3 rounded-xl border bg-muted/40 p-4">
                  {contactDetails.map((detail, index) => (
                    <div key={`${detail.value}-${index}`} className="space-y-3">
                      <div className="flex items-center gap-3 text-sm text-muted-foreground min-w-0">
                        <detail.icon className="h-4 w-4 shrink-0" />
                        <span className="break-words min-w-0">
                          {detail.value}
                        </span>
                      </div>
                      {index < contactDetails.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-3 rounded-xl border bg-muted/40 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Profile completeness
                    </span>
                    <span className="font-semibold text-foreground">
                      {profileCompleteness}%
                    </span>
                  </div>
                  <Progress value={profileCompleteness} className="h-2" />
                  {(profile?.workHours || profile?.communicationPreference) && (
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {profile?.workHours && (
                        <Badge variant="outline">{profile.workHours}</Badge>
                      )}
                      {profile?.communicationPreference && (
                        <Badge variant="outline">{profile.communicationPreference}</Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            {specialties.length > 0 && (
              <CardFooter className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                {specialties.map((specialty) => (
                  <Badge key={specialty} variant="outline">
                    {specialty}
                  </Badge>
                ))}
              </CardFooter>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Work preferences</CardTitle>
              <CardDescription>
                Set your availability and the information your team sees.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between gap-3 rounded-lg border bg-background p-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <p className="text-sm font-medium break-words flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Access level
                  </p>
                  <p className="text-sm text-muted-foreground break-words">
                    {profile?.isAdmin
                      ? "Super Admin - Full access to all projects and features"
                      : "Standard User - Access based on project memberships"}
                  </p>
                </div>
                {profile?.isAdmin ? (
                  <Badge className="shrink-0 bg-green-600 hover:bg-green-700">
                    Super Admin
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="shrink-0">
                    Standard
                  </Badge>
                )}
              </div>
              <div className="flex items-start justify-between gap-3 rounded-lg border bg-background p-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <p className="text-sm font-medium break-words">
                    Default role
                  </p>
                  <p className="text-sm text-muted-foreground break-words">
                    {profile?.role || "Share your primary role"}
                  </p>
                </div>
                {profile?.role && (
                  <Badge className="shrink-0">Primary</Badge>
                )}
              </div>
              <div className="flex items-start justify-between gap-3 rounded-lg border bg-background p-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <p className="text-sm font-medium break-words">Work hours</p>
                  <p className="text-sm text-muted-foreground break-words">
                    {profile?.workHours || "Add your working hours"}
                  </p>
                </div>
                {profile?.workHours && (
                  <Badge variant="secondary" className="shrink-0">Set</Badge>
                )}
              </div>
              <div className="flex items-start justify-between gap-3 rounded-lg border bg-background p-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <p className="text-sm font-medium break-words">
                    Preferred communication
                  </p>
                  <p className="text-sm text-muted-foreground break-words">
                    {profile?.communicationPreference ||
                      "Select how we should reach you"}
                  </p>
                </div>
                {profile?.communicationPreference && (
                  <Badge variant="secondary" className="shrink-0">Set</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Notification preferences</CardTitle>
              <CardDescription>
                Choose when and how you are notified about project activity.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {notificationPreferences.map((preference) => (
                <div
                  key={preference.title}
                  className="flex items-start justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground break-words">
                      {preference.title}
                    </p>
                    <p className="text-sm text-muted-foreground break-words">
                      {preference.description}
                    </p>
                  </div>
                  <Switch
                    defaultChecked={preference.defaultChecked}
                    aria-label={preference.title}
                    className="shrink-0"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Communication channels</CardTitle>
              <CardDescription>
                Control which channels are used for different notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {communicationPreferences.map((preference) => (
                <div
                  key={preference.title}
                  className="flex items-start justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground break-words">
                      {preference.title}
                    </p>
                    <p className="text-sm text-muted-foreground break-words">
                      {preference.title === "Email"
                        ? `Send detailed summaries and approvals to ${profile?.email || "your email"}`
                        : preference.description}
                    </p>
                  </div>
                  <Switch
                    defaultChecked={preference.defaultChecked}
                    aria-label={preference.title}
                    className="shrink-0"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Removed fake security and account health sections */}
      </PageContainer>
    </>
  );
}
