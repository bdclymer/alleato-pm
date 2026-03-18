"use client";
import { ProjectPageHeader } from "@/components/layout";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit, Mail, Phone, Building, User, Shield } from "lucide-react";
import type { Database } from "@/types/database.types";

type Contact = Database["public"]["Tables"]["people"]["Row"];
type Company = Database["public"]["Tables"]["companies"]["Row"];
type Membership = Database["public"]["Tables"]["project_directory_memberships"]["Row"];
type PermissionTemplate = Database["public"]["Tables"]["permission_templates"]["Row"];
type Project = Database["public"]["Tables"]["projects"]["Row"];

interface ContactWithRelations extends Omit<Contact, "company"> {
  company?: Company | null;
  memberships?: (Membership & {
    project?: Project | null;
    permission_template?: PermissionTemplate | null;
  })[];
}

export default function ContactDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const contactId = params.contactId as string;

  const [contact, setContact] = React.useState<ContactWithRelations | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    async function fetchContactDetails() {
      try {
        const supabase = createClient();

        // Fetch contact
        const { data: contactData, error: contactError } = await supabase
          .from("people")
          .select("*")
          .eq("id", contactId)
          .single();

        if (contactError) throw contactError;

        // Fetch company separately if contact has a company_id
        let company: Company | null = null;
        if (contactData.company_id) {
          const { data: companyData } = await supabase
            .from("companies")
            .select("*")
            .eq("id", contactData.company_id)
            .single();
          company = companyData;
        }

        // Fetch project memberships with permissions
        const { data: memberships, error: membershipError } = await supabase
          .from("project_directory_memberships")
          .select(`
            *,
            project:projects(*),
            permission_template:permission_templates(*)
          `)
          .eq("person_id", contactId)
          .order("created_at", { ascending: false });

        if (membershipError) throw membershipError;

        setContact({
          ...contactData,
          company,
          memberships: memberships || [],
        });
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchContactDetails();
  }, [contactId]);

  if (isLoading) {
    return (
      <>
        <ProjectPageHeader
          title="Contact Details"
          showProjectName={false}
        />
        <PageContainer>
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </PageContainer>
      </>
    );
  }

  if (error || !contact) {
    return (
      <>
        <ProjectPageHeader
          title="Contact Details"
          showProjectName={false}
        />
        <PageContainer>
          <div className="text-center py-12">
            <Text tone="destructive">
              {error?.message || "Contact not found"}
            </Text>
            <Button
              variant="outline"
              onClick={() => router.push("/directory/contacts")}
              className="mt-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Contacts
            </Button>
          </div>
        </PageContainer>
      </>
    );
  }

  const fullName = `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || "Unnamed Contact";

  return (
    <>
      <ProjectPageHeader
        title={fullName}
        description={contact.email || "No email provided"}
        showProjectName={false}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/directory/contacts")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Contacts
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Contact
            </Button>
          </div>
        }
      />
      <PageContainer>
        <div className="grid gap-6">
          {/* Contact Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Text tone="muted" className="text-sm mb-1">Name</Text>
                    <Text className="font-medium">{fullName}</Text>
                  </div>

                  {contact.email && (
                    <div>
                      <Text tone="muted" className="text-sm mb-1">Email</Text>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a
                          href={`mailto:${contact.email}`}
                          className="text-blue-600 hover:underline"
                        >
                          {contact.email}
                        </a>
                      </div>
                    </div>
                  )}

                  {(contact.phone_business || contact.phone_mobile) && (
                    <div>
                      <Text tone="muted" className="text-sm mb-1">Phone</Text>
                      <div className="space-y-1">
                        {contact.phone_business && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <Text>{contact.phone_business} (Business)</Text>
                          </div>
                        )}
                        {contact.phone_mobile && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <Text>{contact.phone_mobile} (Mobile)</Text>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {contact.company && (
                    <div>
                      <Text tone="muted" className="text-sm mb-1">Company</Text>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <Text className="font-medium">{contact.company.name}</Text>
                      </div>
                    </div>
                  )}

                  {contact.person_type && (
                    <div>
                      <Text tone="muted" className="text-sm mb-1">Type</Text>
                      <Badge variant="secondary">{contact.person_type}</Badge>
                    </div>
                  )}

                  {contact.status && (
                    <div>
                      <Text tone="muted" className="text-sm mb-1">Status</Text>
                      <Badge variant={contact.status === "active" ? "default" : "secondary"}>
                        {contact.status}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Project Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Project Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="active" className="w-full">
                <TabsList>
                  <TabsTrigger value="active">Active Projects</TabsTrigger>
                  <TabsTrigger value="all">All Projects</TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="mt-4">
                  {contact.memberships && contact.memberships.length > 0 ? (
                    <div className="space-y-4">
                      {contact.memberships
                        .filter(m => m.status === "active")
                        .map((membership) => (
                          <div
                            key={membership.id}
                            className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex justify-between items-start">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Text className="font-medium">
                                    {membership.project?.name || "Unknown Project"}
                                  </Text>
                                  <Badge variant="outline" className="text-xs">
                                    {membership.role || "Member"}
                                  </Badge>
                                </div>

                                {membership.permission_template && (
                                  <div>
                                    <Text tone="muted" className="text-sm">
                                      Permission Template: {membership.permission_template.name}
                                    </Text>
                                    {membership.permission_template.rules_json && (
                                      <div className="mt-2 flex flex-wrap gap-2">
                                        {Object.entries(membership.permission_template.rules_json as Record<string, string[]>).map(
                                          ([module, permissions]) => (
                                            <Badge key={module} variant="secondary" className="text-xs">
                                              {module}: {Array.isArray(permissions) ? permissions.join(", ") : ""}
                                            </Badge>
                                          )
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              <Badge variant={membership.status === "active" ? "default" : "secondary"}>
                                {membership.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      {contact.memberships.filter(m => m.status === "active").length === 0 && (
                        <Text tone="muted" className="text-center py-8">
                          No active project memberships
                        </Text>
                      )}
                    </div>
                  ) : (
                    <Text tone="muted" className="text-center py-8">
                      No project memberships found
                    </Text>
                  )}
                </TabsContent>

                <TabsContent value="all" className="mt-4">
                  {contact.memberships && contact.memberships.length > 0 ? (
                    <div className="space-y-4">
                      {contact.memberships.map((membership) => (
                        <div
                          key={membership.id}
                          className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Text className="font-medium">
                                  {membership.project?.name || "Unknown Project"}
                                </Text>
                                <Badge variant="outline" className="text-xs">
                                  {membership.role || "Member"}
                                </Badge>
                              </div>

                              {membership.permission_template && (
                                <div>
                                  <Text tone="muted" className="text-sm">
                                    Permission Template: {membership.permission_template.name}
                                  </Text>
                                  {membership.permission_template.rules_json && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {Object.entries(membership.permission_template.rules_json as Record<string, string[]>).map(
                                        ([module, permissions]) => (
                                          <Badge key={module} variant="secondary" className="text-xs">
                                            {module}: {Array.isArray(permissions) ? permissions.join(", ") : ""}
                                          </Badge>
                                        )
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            <Badge variant={membership.status === "active" ? "default" : "secondary"}>
                              {membership.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Text tone="muted" className="text-center py-8">
                      No project memberships found
                    </Text>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </>
  );
}