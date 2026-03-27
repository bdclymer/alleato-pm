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

interface DirectoryItem {
  id: string;
  name: string;
  type: 'user' | 'contact' | 'company';
  initials: string;
  avatarColor: string;
}

export function DirectorySummary({ projectId }: DirectorySummaryProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(true);

  // Fetch data with small limits for summary
  const { users, isLoading: usersLoading } = useAuthUsers(projectId);
  const { contacts, isLoading: contactsLoading } = useContacts({
    projectId,
    limit: 10
  });
  const { companies, isLoading: companiesLoading } = useProjectCompanies(projectId, {
    page: 1,
    per_page: 10,
    status: "ACTIVE",
  });

  const isLoading = usersLoading || contactsLoading || companiesLoading;

  // Combine all directory items into a single list
  const directoryItems: DirectoryItem[] = React.useMemo(() => {
    const items: DirectoryItem[] = [];

    // Add users
    users.forEach((user) => {
      const fullName = [user.first_name, user.last_name]
        .filter(Boolean)
        .join(" ") || user.email;
      const initials = fullName
        .split(" ")
        .map(n => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

      items.push({
        id: `user-${user.id}`,
        name: fullName,
        type: 'user',
        initials,
        avatarColor: 'bg-neutral-100 text-neutral-600'
      });
    });

    // Add contacts
    contacts.forEach((contact) => {
      const fullName = [contact.first_name, contact.last_name]
        .filter(Boolean)
        .join(" ") || contact.email || "Contact";
      const initials = fullName
        .split(" ")
        .map(n => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

      items.push({
        id: `contact-${contact.id}`,
        name: fullName,
        type: 'contact',
        initials,
        avatarColor: 'bg-primary/10 text-primary'
      });
    });

    // Add companies
    companies.forEach((company) => {
      const companyName = company.company?.name || "Company";
      const initials = companyName
        .split(" ")
        .map(n => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

      items.push({
        id: `company-${company.id}`,
        name: companyName,
        type: 'company',
        initials,
        avatarColor: 'bg-success/10 text-success'
      });
    });

    // Sort alphabetically by name
    return items.sort((a, b) => a.name.localeCompare(b.name));
  }, [users, contacts, companies]);

  const handleAddUser = () => {
    router.push(`/${projectId}/directory/users`);
  };

  const handleAddContact = () => {
    router.push(`/${projectId}/directory/contacts`);
  };

  const handleAddCompany = () => {
    router.push(`/${projectId}/directory/companies`);
  };

  const getTypeLabel = (type: DirectoryItem['type']) => {
    switch (type) {
      case 'user':
        return 'User';
      case 'contact':
        return 'Contact';
      case 'company':
        return 'Company';
    }
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
              <Plus />
              Add
              <ChevronDown />
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
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-2">
              <div className="h-8 w-8 bg-neutral-100 rounded-full animate-pulse" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-neutral-100 rounded animate-pulse w-32" />
                <div className="h-2 bg-neutral-100 rounded animate-pulse w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : directoryItems.length === 0 ? (
        <SectionCard.Empty
          message="No directory entries"
          description="Add users, contacts, and companies to get started"
          actionLabel="Add to directory"
          onAction={handleAddUser}
        />
      ) : (
        <div className="space-y-0">
          {directoryItems.slice(0, 8).map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 py-2 border-b border-neutral-100/60 last:border-0"
            >
              <Avatar className="h-7 w-7 border border-neutral-200/80">
                <AvatarFallback className={`${item.avatarColor} text-xs font-medium`}>
                  {item.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 flex items-center justify-between min-w-0 gap-2">
                <p className="text-sm font-medium text-neutral-900 truncate">
                  {item.name}
                </p>
                <span className="text-xs text-neutral-500 shrink-0">
                  {getTypeLabel(item.type)}
                </span>
              </div>
            </div>
          ))}
          {directoryItems.length > 8 && (
            <div className="pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs text-neutral-500 hover:text-neutral-700"
                onClick={() => router.push(`/${projectId}/directory`)}
              >
                View all {directoryItems.length} entries
              </Button>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}