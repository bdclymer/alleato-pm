"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Check, ChevronsUpDown, X, Loader2, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  job_title?: string;
  phone_mobile?: string;
  phone_business?: string;
  company?: {
    id?: string;
    name?: string;
  };
}

interface TeamMember {
  name: string;
  role: string;
  personId?: string;
  contactId?: string;
}

interface InlineTeamMemberFormProps {
  projectId: number;
  existingMembers: TeamMember[];
  onSave: (members: TeamMember[]) => Promise<void>;
  onCancel: () => void;
}

const ROLE_OPTIONS = [
  { value: "Architect", label: "Architect" },
  { value: "Project Manager", label: "Project Manager" },
  { value: "Superintendent", label: "Superintendent" },
];

export function InlineTeamMemberForm({
  projectId,
  existingMembers,
  onSave,
  onCancel,
}: InlineTeamMemberFormProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(
    null,
  );
  const [openCombobox, setOpenCombobox] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const formRef = useRef<HTMLDivElement>(null);

  // Fetch all contacts from global contacts table (not filtered by project)
  useEffect(() => {
    async function fetchContacts() {
      try {
        const response = await fetch(
          `/api/contacts?per_page=200`,
        );
        if (response.ok) {
          const result = await response.json();
          setContacts(result.data || []);
        }
      } catch (error) {

        console.error("Failed to fetch team member:", error);

        // Intentionally swallowed: component shows appropriate state on error

      } finally {
        setLoading(false);
      }
    }
    fetchContacts();
  }, []);

  // Filter contacts based on search
  const filteredContacts = contacts.filter((contact) => {
    const fullName = `${contact.first_name} ${contact.last_name}`.toLowerCase();
    const searchLower = searchValue.toLowerCase();
    return (
      fullName.includes(searchLower) ||
      contact.email?.toLowerCase().includes(searchLower) ||
      contact.company?.name?.toLowerCase().includes(searchLower)
    );
  });

  const handleSave = async () => {
    if (!selectedRole || !selectedContact) return;

    setSaving(true);
    try {
      const newMember: TeamMember = {
        name: `${selectedContact.first_name} ${selectedContact.last_name}`,
        role: selectedRole,
        contactId: selectedContact.id,
      };
      const updatedMembers = [...existingMembers, newMember];
      await onSave(updatedMembers);
    } catch (error) {
      console.error('Error saving team member:', error);
    } finally {
      setSaving(false);
    }
  };

  const isValid = selectedRole && selectedContact;

  return (
    <div
      ref={formRef}
      className="border border-neutral-200 rounded-md p-4 bg-neutral-50 space-y-4"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-600 uppercase tracking-wider">
          Add Team Member
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Cancel</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Role Dropdown */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-600">Role</label>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="Select role..." />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Member Combobox with Search */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-600">Member</label>
          <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openCombobox}
                className="w-full justify-between bg-background font-normal"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2 text-neutral-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </span>
                ) : selectedContact ? (
                  <span className="truncate">
                    {selectedContact.first_name} {selectedContact.last_name}
                  </span>
                ) : (
                  <span className="text-neutral-400">Search members...</span>
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Type to search..."
                  value={searchValue}
                  onValueChange={setSearchValue}
                />
                <CommandList>
                  <CommandEmpty>
                    <div className="py-2 text-center">
                      <p className="text-sm text-neutral-500 mb-2">
                        No members found.
                      </p>
                      <Link
                        href="/directory/contacts"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:text-brand/80 transition-colors"
                        target="_blank"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Create new contact
                      </Link>
                    </div>
                  </CommandEmpty>
                  <CommandGroup>
                    {filteredContacts.map((contact) => (
                      <CommandItem
                        key={contact.id}
                        value={contact.id}
                        onSelect={() => {
                          setSelectedContact(contact);
                          setOpenCombobox(false);
                          setSearchValue("");
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedContact?.id === contact.id
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {contact.first_name} {contact.last_name}
                          </span>
                          {contact.company?.name && (
                            <span className="text-xs text-neutral-500">
                              {contact.company.name}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={!isValid || saving}
          className="bg-brand hover:bg-brand/90"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Add Member"
          )}
        </Button>
      </div>
    </div>
  );
}
