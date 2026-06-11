"use client";
import { PageShell, SectionRuleHeading } from "@/components/layout";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ds/text";
import { EmptyState } from "@/components/ds";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit } from "lucide-react";
import type { Database } from "@/types/database.types";
import { ContactFormDialog } from "@/components/domain/contacts/ContactFormDialog";

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
  const params = useParams()! ?? {};
  const router = useRouter();
  const contactId = params.contactId as string;

  const [contact, setContact] = React.useState<ContactWithRelations | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);

  const fetchContactDetails = React.useCallback(async () => {
    try {
      setError(null);
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
  }, [contactId]);

  React.useEffect(() => {
    void fetchContactDetails();
  }, [fetchContactDetails]);

  if (isLoading) {
    return (
      <PageShell variant="detail" title="Contact Details" onBack={() => router.back()}>
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageShell>
    );
  }

  if (error || !contact) {
    return (
      <PageShell variant="detail" title="Contact Details" onBack={() => router.back()}>
        <div className="text-center py-12">
          <Text tone="destructive">
            {error?.message || "Contact not found"}
          </Text>
          <Button
            variant="outline"
            onClick={() => router.push("/directory/contacts")}
            className="mt-4"
          >
            <ArrowLeft />
            Back to Contacts
          </Button>
        </div>
      </PageShell>
    );
  }

  const fullName = `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || "Unnamed Contact";

  return (
    <PageShell
      variant="detail"
      title={fullName}
      onBack={() => router.back()}
      actions={
        <Button
          onClick={() => setIsEditDialogOpen(true)}
        >
          <Edit className="h-4 w-4" />
          Edit
        </Button>
      }
    >
      <div className="space-y-8">
        {/* Contact Information */}
        <section>
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <Text tone="muted" className="text-xs uppercase tracking-wide mb-2">Email</Text>
                {contact.email ? (
                  <a href={`mailto:${contact.email}`} className="text-primary hover:underline break-all">
                    {contact.email}
                  </a>
                ) : (
                  <Text tone="muted">—</Text>
                )}
              </div>

              <div>
                <Text tone="muted" className="text-xs uppercase tracking-wide mb-2">Phone</Text>
                {contact.phone_business || contact.phone_mobile ? (
                  <div className="space-y-1">
                    {contact.phone_business && <div>{contact.phone_business}</div>}
                    {contact.phone_mobile && contact.phone_business && <div className="text-sm text-muted-foreground">{contact.phone_mobile}</div>}
                    {contact.phone_mobile && !contact.phone_business && <div>{contact.phone_mobile}</div>}
                  </div>
                ) : (
                  <Text tone="muted">—</Text>
                )}
              </div>

              <div>
                <Text tone="muted" className="text-xs uppercase tracking-wide mb-2">Company</Text>
                {contact.company ? (
                  <Link href={`/directory/companies/${contact.company.id}`} className="text-primary hover:underline">
                    {contact.company.name}
                  </Link>
                ) : (
                  <Text tone="muted">—</Text>
                )}
              </div>
            </div>

            {(contact.job_title || contact.person_type) && (
              <div className="flex flex-wrap gap-4 pt-2 border-t border-border/50">
                {contact.job_title && (
                  <div>
                    <Text tone="muted" className="text-xs mb-1">Job Title</Text>
                    <Text className="text-sm">{contact.job_title}</Text>
                  </div>
                )}
                {contact.person_type && (
                  <div>
                    <Text tone="muted" className="text-xs mb-1">Type</Text>
                    <Badge variant="secondary" className="text-xs">{contact.person_type}</Badge>
                  </div>
                )}
                {contact.status && (
                  <div>
                    <Text tone="muted" className="text-xs mb-1">Status</Text>
                    <Badge variant={contact.status === "active" ? "default" : "secondary"} className="text-xs">
                      {contact.status}
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Project Access */}
        {contact.memberships && contact.memberships.length > 0 && (
          <section>
            <SectionRuleHeading>Project Access</SectionRuleHeading>
            <Tabs defaultValue="active" className="w-full">
              <TabsList variant="line" className="mb-6">
                <TabsTrigger value="active">
                  Active
                  {contact.memberships.filter(m => m.status === "active").length > 0 && (
                    <span className="ml-2 text-xs bg-accent px-2 py-1 rounded">
                      {contact.memberships.filter(m => m.status === "active").length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="all">
                  All
                  <span className="ml-2 text-xs bg-accent px-2 py-1 rounded">
                    {contact.memberships.length}
                  </span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active">
                {contact.memberships.filter(m => m.status === "active").length > 0 ? (
                  <div className="space-y-3">
                    {contact.memberships
                      .filter(m => m.status === "active")
                      .map((membership) => (
                        <div
                          key={membership.id}
                          className="p-4 bg-muted/30 rounded hover:bg-muted/50 transition-colors group"
                        >
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <Text className="font-medium truncate">
                                  {membership.project?.name || "Unknown Project"}
                                </Text>
                                {membership.role && (
                                  <Badge variant="outline" className="text-xs flex-shrink-0">
                                    {membership.role}
                                  </Badge>
                                )}
                              </div>
                              {membership.permission_template && (
                                <Text tone="muted" className="text-sm">
                                  {membership.permission_template.name}
                                </Text>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No active projects"
                    description="This contact has no active memberships."
                  />
                )}
              </TabsContent>

              <TabsContent value="all">
                <div className="space-y-3">
                  {contact.memberships.map((membership) => (
                    <div
                      key={membership.id}
                      className="p-4 bg-muted/30 rounded hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Text className="font-medium truncate">
                              {membership.project?.name || "Unknown Project"}
                            </Text>
                            {membership.role && (
                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                {membership.role}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {membership.permission_template && (
                              <Text tone="muted" className="text-sm">
                                {membership.permission_template.name}
                              </Text>
                            )}
                            <Badge variant={membership.status === "active" ? "default" : "secondary"} className="text-xs">
                              {membership.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </section>
        )}
      </div>
      <ContactFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        contact={{
          id: contact.id,
          first_name: contact.first_name,
          last_name: contact.last_name,
          email: contact.email,
          phone: contact.phone_mobile ?? contact.phone_business,
          person_type: contact.person_type as "user" | "contact" | "employee" | null,
          company_id: contact.company_id,
          job_title: contact.job_title,
          type: contact.business_unit,
          address: contact.address_line1,
          address_line2: contact.address_line2,
          city: contact.city,
          state: contact.state,
          zip: contact.zip,
          linkedin: contact.linkedin,
          avatar: contact.profile_photo_url,
          notes: contact.notes,
        }}
        onSuccess={() => {
          void fetchContactDetails();
        }}
      />
    </PageShell>
  );
}
