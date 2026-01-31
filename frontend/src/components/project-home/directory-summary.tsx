"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import {
  Users,
  Building2,
  Mail,
  Plus,
  ChevronDown,
  UserPlus,
  Building,
  Contact,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthUsers } from "@/hooks/use-auth-users";
import { useContacts } from "@/hooks/use-contacts";
import { useProjectCompanies } from "@/hooks/use-project-companies";

interface DirectorySummaryProps {
  projectId: string;
}

export function DirectorySummary({ projectId }: DirectorySummaryProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(true);

  // Fetch data with small limits for summary
  const { users, isLoading: usersLoading } = useAuthUsers(projectId);
  const { contacts, isLoading: contactsLoading } = useContacts({
    projectId,
    limit: 5
  });
  const { companies, isLoading: companiesLoading } = useProjectCompanies(projectId, {
    page: 1,
    per_page: 5,
    status: "ACTIVE",
  });

  const totalItems = users.length + contacts.length + companies.length;
  const isLoading = usersLoading || contactsLoading || companiesLoading;

  const handleAddUser = () => {
    router.push(`/${projectId}/directory/users`);
  };

  const handleAddContact = () => {
    router.push(`/${projectId}/directory/contacts`);
  };

  const handleAddCompany = () => {
    router.push(`/${projectId}/directory/companies`);
  };

  return (
    <SectionCard
      title="Directory"
      open={isOpen}
      onOpenChange={setIsOpen}
      viewAllHref={`/${projectId}/directory`}
      headerActions={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 px-2">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add
              <ChevronDown className="h-3.5 w-3.5 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleAddUser}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add User
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAddContact}>
              <Contact className="mr-2 h-4 w-4" />
              Add Contact
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAddCompany}>
              <Building className="mr-2 h-4 w-4" />
              Add Company
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <div className="h-8 w-8 bg-neutral-100 rounded-full animate-pulse" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-neutral-100 rounded animate-pulse w-32" />
                <div className="h-2 bg-neutral-100 rounded animate-pulse w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : totalItems === 0 ? (
        <SectionCard.Empty
          message="No directory entries"
          description="Add users, contacts, and companies to get started"
          actionLabel="Add to directory"
          onAction={handleAddUser}
        />
      ) : (
        <div className="space-y-4">
          {/* Users Section */}
          {users.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-neutral-400" />
                <h4 className="text-sm font-medium text-neutral-700">
                  Users ({users.length})
                </h4>
              </div>
              <div className="space-y-0">
                {users.slice(0, 3).map((user) => {
                  const fullName = [user.first_name, user.last_name]
                    .filter(Boolean)
                    .join(" ") || user.email;
                  const initials = fullName
                    .split(" ")
                    .map(n => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 py-1.5 pl-6 border-b border-neutral-100/60 last:border-0"
                    >
                      <Avatar className="h-7 w-7 border border-neutral-200/80">
                        <AvatarFallback className="bg-neutral-100 text-neutral-600 text-xs font-medium">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 truncate">
                          {fullName}
                        </p>
                        <p className="text-xs text-neutral-500 truncate">
                          {user.job_title || user.company_name || "User"}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {users.length > 3 && (
                  <div className="pl-6 py-1">
                    <p className="text-xs text-neutral-400">
                      +{users.length - 3} more users
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contacts Section */}
          {contacts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-neutral-400" />
                <h4 className="text-sm font-medium text-neutral-700">
                  Contacts ({contacts.length})
                </h4>
              </div>
              <div className="space-y-0">
                {contacts.slice(0, 3).map((contact) => {
                  const fullName = [contact.first_name, contact.last_name]
                    .filter(Boolean)
                    .join(" ") || contact.email || "Contact";
                  const initials = fullName
                    .split(" ")
                    .map(n => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <div
                      key={contact.id}
                      className="flex items-center gap-3 py-1.5 pl-6 border-b border-neutral-100/60 last:border-0"
                    >
                      <Avatar className="h-7 w-7 border border-neutral-200/80">
                        <AvatarFallback className="bg-blue-50 text-blue-600 text-xs font-medium">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 truncate">
                          {fullName}
                        </p>
                        <p className="text-xs text-neutral-500 truncate">
                          {contact.job_title || contact.email || "Contact"}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {contacts.length > 3 && (
                  <div className="pl-6 py-1">
                    <p className="text-xs text-neutral-400">
                      +{contacts.length - 3} more contacts
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Companies Section */}
          {companies.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-neutral-400" />
                <h4 className="text-sm font-medium text-neutral-700">
                  Companies ({companies.length})
                </h4>
              </div>
              <div className="space-y-0">
                {companies.slice(0, 3).map((company) => {
                  const companyName = company.company?.name || "Company";
                  const initials = companyName
                    .split(" ")
                    .map(n => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <div
                      key={company.id}
                      className="flex items-center gap-3 py-1.5 pl-6 border-b border-neutral-100/60 last:border-0"
                    >
                      <Avatar className="h-7 w-7 border border-neutral-200/80">
                        <AvatarFallback className="bg-green-50 text-green-600 text-xs font-medium">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 truncate">
                          {companyName}
                        </p>
                        <p className="text-xs text-neutral-500 truncate">
                          {company.company_type?.replace('_', ' ').toLowerCase() || 'Company'}
                          {company.user_count && ` • ${company.user_count} users`}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {companies.length > 3 && (
                  <div className="pl-6 py-1">
                    <p className="text-xs text-neutral-400">
                      +{companies.length - 3} more companies
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}