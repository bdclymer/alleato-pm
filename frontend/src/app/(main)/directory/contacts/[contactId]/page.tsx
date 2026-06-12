"use client";
import { PageShell } from "@/components/layout";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ds";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Pencil,
  Building2,
  ExternalLink,
  MapPin,
  Check,
  ChevronsUpDown,
  Layers,
  User,
  FileText,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database.types";
import { updateContact } from "@/app/(main)/actions/table-actions";
import { ContactFormSheet } from "@/components/domain/contacts/ContactFormSheet";

type Contact = Database["public"]["Tables"]["people"]["Row"];
type Company = Database["public"]["Tables"]["companies"]["Row"];
type Membership = Database["public"]["Tables"]["project_directory_memberships"]["Row"];
type PermissionTemplate = Database["public"]["Tables"]["permission_templates"]["Row"];
type Project = Database["public"]["Tables"]["projects"]["Row"];
type ContactUpdateData = Database["public"]["Tables"]["people"]["Update"];

interface ContactWithRelations extends Contact {
  company?: Company | null;
  memberships?: (Membership & {
    project?: Project | null;
    permission_template?: PermissionTemplate | null;
  })[];
}

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

// ─── Inline edit primitives ────────────────────────────────────────────────

interface InlineTextProps {
  label: string;
  value: string | null | undefined;
  onSave: (val: string | null) => Promise<void>;
  type?: "text" | "email" | "tel" | "url";
  placeholder?: string;
  href?: string;
}

function InlineTextField({ label, value, onSave, type = "text", placeholder, href }: InlineTextProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value ?? "");
  const [saving, setSaving] = React.useState(false);

  const commit = async () => {
    const next = draft.trim() || null;
    if (next === (value || null)) { setEditing(false); return; }
    setSaving(true);
    try {
      await onSave(next);
    } catch {
      toast.error("Failed to save");
      setDraft(value ?? "");
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center py-2 gap-4 border-b border-border/20">
        <p className="w-32 shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
        <Input
          autoFocus
          type={type}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === "Enter") { e.preventDefault(); void commit(); }
            if (e.key === "Escape") { setEditing(false); setDraft(value ?? ""); }
          }}
          placeholder={placeholder}
          className="flex-1 h-7 text-sm"
          disabled={saving}
        />
      </div>
    );
  }

  return (
    <div className="group flex items-center py-2 gap-4 border-b border-border/20">
      <p className="w-32 shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
        {value ? (
          href ? (
            <a
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1 truncate"
            >
              <span className="truncate">{value}</span>
              {href.startsWith("http") && <ExternalLink className="h-2.5 w-2.5 flex-shrink-0 opacity-60" />}
            </a>
          ) : (
            <p className="text-sm text-foreground truncate">{value}</p>
          )
        ) : (
          <p className="text-sm text-muted-foreground/30">—</p>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4 opacity-0 group-hover:opacity-30 hover:bg-transparent transition-opacity flex-shrink-0"
          onClick={() => { setDraft(value ?? ""); setEditing(true); }}
          aria-label={`Edit ${label}`}
        >
          <Pencil className="h-2.5 w-2.5" />
        </Button>
      </div>
    </div>
  );
}

interface InlineTextareaProps {
  label: string;
  value: string | null | undefined;
  onSave: (val: string | null) => Promise<void>;
  placeholder?: string;
}

function InlineTextareaField({ label, value, onSave, placeholder }: InlineTextareaProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value ?? "");
  const [saving, setSaving] = React.useState(false);

  const commit = async () => {
    const next = draft.trim() || null;
    if (next === (value || null)) { setEditing(false); return; }
    setSaving(true);
    try {
      await onSave(next);
    } catch {
      toast.error("Failed to save");
      setDraft(value ?? "");
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-start py-2 gap-4 border-b border-border/20">
        <p className="w-32 shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground pt-1.5">{label}</p>
        <div className="flex-1">
          <Textarea
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Escape") { setEditing(false); setDraft(value ?? ""); } }}
            placeholder={placeholder}
            className="text-sm min-h-20 resize-none"
            disabled={saving}
          />
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={commit} disabled={saving} className="h-7 text-xs px-3">
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDraft(value ?? ""); }} className="h-7 text-xs">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-center py-2 gap-4 border-b border-border/20">
      <p className="w-32 shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
        {value ? (
          <p className="text-sm text-foreground whitespace-pre-wrap">{value}</p>
        ) : (
          <p className="text-sm text-muted-foreground/30">—</p>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4 opacity-0 group-hover:opacity-30 hover:bg-transparent transition-opacity flex-shrink-0"
          onClick={() => { setDraft(value ?? ""); setEditing(true); }}
          aria-label={`Edit ${label}`}
        >
          <Pencil className="h-2.5 w-2.5" />
        </Button>
      </div>
    </div>
  );
}

interface InlineSelectProps {
  label: string;
  value: string | null | undefined;
  onSave: (val: string | null) => Promise<void>;
  options: { value: string; label: string }[];
  placeholder?: string;
}

function InlineSelectField({ label, value, onSave, options, placeholder }: InlineSelectProps) {
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const commit = async (val: string) => {
    setEditing(false);
    if ((val || null) === (value || null)) return;
    setSaving(true);
    try {
      await onSave(val || null);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const displayLabel = options.find(o => o.value === value)?.label;

  if (editing) {
    return (
      <div className="flex items-center py-2 gap-4 border-b border-border/20">
        <p className="w-32 shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
        <Select
          defaultOpen
          value={value ?? ""}
          onValueChange={commit}
          onOpenChange={open => { if (!open) setEditing(false); }}
          disabled={saving}
        >
          <SelectTrigger className="flex-1 h-7 text-sm">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="group flex items-center py-2 gap-4 border-b border-border/20">
      <p className="w-32 shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
        {(displayLabel ?? value) ? (
          <p className="text-sm text-foreground capitalize">{displayLabel ?? value}</p>
        ) : (
          <p className="text-sm text-muted-foreground/30">—</p>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4 opacity-0 group-hover:opacity-30 hover:bg-transparent transition-opacity flex-shrink-0"
          onClick={() => setEditing(true)}
          aria-label={`Edit ${label}`}
        >
          <Pencil className="h-2.5 w-2.5" />
        </Button>
      </div>
    </div>
  );
}

interface InlineCompanyProps {
  label: string;
  company: Company | null | undefined;
  onSave: (companyId: string | null) => Promise<void>;
}

function InlineCompanyField({ label, company, onSave }: InlineCompanyProps) {
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [companies, setCompanies] = React.useState<Pick<Company, "id" | "name">[]>([]);

  React.useEffect(() => {
    if (!editing) return;
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase.from("companies").select("id, name").order("name");
      setCompanies(data ?? []);
      setPopoverOpen(true);
    };
    void load();
  }, [editing]);

  const commit = async (id: string) => {
    const next = id || null;
    setPopoverOpen(false);
    setEditing(false);
    if (next === (company?.id ?? null)) return;
    setSaving(true);
    try {
      await onSave(next);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center py-2 gap-4 border-b border-border/20">
        <p className="w-32 shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
        <Popover open={popoverOpen} onOpenChange={open => { setPopoverOpen(open); if (!open) setEditing(false); }}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="flex-1 justify-between h-7 text-sm font-normal"
              disabled={saving}
            >
              {saving ? "Saving…" : (company?.name ?? "Select company")}
              <ChevronsUpDown className="ml-2 h-3 w-3 opacity-50 flex-shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-64" align="start">
            <Command>
              <CommandInput placeholder="Search companies…" />
              <CommandList>
                <CommandEmpty>No companies found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem value="__none" onSelect={() => commit("")}>
                    <Check className={cn("mr-2 h-3 w-3", !company ? "opacity-100" : "opacity-0")} />
                    No company
                  </CommandItem>
                  {companies.map(c => (
                    <CommandItem key={c.id} value={c.name} onSelect={() => commit(c.id)}>
                      <Check className={cn("mr-2 h-3 w-3", company?.id === c.id ? "opacity-100" : "opacity-0")} />
                      {c.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className="group flex items-center py-2 gap-4 border-b border-border/20">
      <p className="w-32 shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
        {company ? (
          <Link
            href={`/directory/companies/${company.id}`}
            className="text-sm text-primary hover:underline truncate"
          >
            {company.name}
          </Link>
        ) : (
          <p className="text-sm text-muted-foreground/30">—</p>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4 opacity-0 group-hover:opacity-30 hover:bg-transparent transition-opacity flex-shrink-0"
          onClick={() => setEditing(true)}
          aria-label={`Edit ${label}`}
        >
          <Pencil className="h-2.5 w-2.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Section wrapper ───────────────────────────────────────────────────────

function FieldSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon className="h-3 w-3 text-muted-foreground" />}
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{title}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function ContactDetailsPage() {
  const params = useParams()! ?? {};
  const router = useRouter();
  const contactId = params.contactId as string;

  const [contact, setContact] = React.useState<ContactWithRelations | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const [editSheetOpen, setEditSheetOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setError(null);
      const supabase = createClient();

      const { data: contactData, error: contactError } = await supabase
        .from("people")
        .select("*")
        .eq("id", contactId)
        .single();
      if (contactError) throw contactError;

      let company: Company | null = null;
      if (contactData.company_id) {
        const { data } = await supabase
          .from("companies")
          .select("*")
          .eq("id", contactData.company_id)
          .single();
        company = data;
      }

      const { data: memberships, error: membershipError } = await supabase
        .from("project_directory_memberships")
        .select("*, project:projects(*), permission_template:permission_templates(*)")
        .eq("person_id", contactId)
        .order("created_at", { ascending: false });
      if (membershipError) throw membershipError;

      setContact({ ...contactData, company, memberships: memberships ?? [] });
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [contactId]);

  React.useEffect(() => { void load(); }, [load]);

  const save = React.useCallback(async (fields: ContactUpdateData) => {
    const result = await updateContact(contactId, fields);
    if (result?.error) throw new Error(result.error);
    await load();
  }, [contactId, load]);

  if (isLoading) {
    return (
      <PageShell variant="content">
        <div className="space-y-10 pt-4">
          <div className="flex gap-5">
            <Skeleton className="h-16 w-16 rounded-full flex-shrink-0" />
            <div className="space-y-2 pt-1 flex-1">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}
            </div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  if (error || !contact) {
    return (
      <PageShell variant="detail" onBack={() => router.back()} title="Contact Not Found">
        <div className="text-center py-16">
          <p className="text-sm text-muted-foreground mb-4">{error?.message ?? "Contact not found"}</p>
          <Button variant="outline" size="sm" onClick={() => router.push("/directory/contacts")}>
            Back to Contacts
          </Button>
        </div>
      </PageShell>
    );
  }

  const fullName = `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim() || "Unnamed Contact";
  const initials = fullName.split(" ").map(n => n[0]).filter(Boolean).join("").toUpperCase().slice(0, 2);
  const activeCount = contact.memberships?.filter(m => m.status === "active").length ?? 0;

  return (
    <PageShell variant="content">
      <div className="space-y-10 pb-16">

        {/* ── Identity header ─────────────────────────────────── */}
        <div className="flex items-start gap-5 pt-1">
          <div className="flex-shrink-0">
            {contact.profile_photo_url ? (
              <img
                src={contact.profile_photo_url}
                alt={fullName}
                className="h-16 w-16 rounded-full object-cover bg-muted"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <span className="text-lg font-medium text-muted-foreground">{initials}</span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 pt-0.5 space-y-0.5">
            <p className="text-lg font-semibold text-foreground truncate">{fullName}</p>
            {contact.job_title && (
              <p className="text-sm text-muted-foreground">{contact.job_title}</p>
            )}
            {contact.company && (
              <Link
                href={`/directory/companies/${contact.company.id}`}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Building2 className="h-3.5 w-3.5" />
                {contact.company.name}
              </Link>
            )}
          </div>

          <div className="flex items-center gap-0.5 flex-shrink-0 pt-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:bg-transparent hover:text-foreground"
              onClick={() => setEditSheetOpen(true)}
              aria-label="Edit contact"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:bg-transparent hover:text-foreground"
              onClick={() => { void load(); }}
              aria-label="Refresh"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="border-t border-border/30" />

        {/* ── Contact + Address ───────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
          <FieldSection title="Contact" icon={User}>
            <InlineTextField
              label="Email"
              value={contact.email}
              type="email"
              href={contact.email ? `mailto:${contact.email}` : undefined}
              placeholder="email@example.com"
              onSave={val => save({ email: val })}
            />
            <InlineTextField
              label="Mobile"
              value={contact.phone_mobile}
              type="tel"
              href={contact.phone_mobile ? `tel:${contact.phone_mobile}` : undefined}
              placeholder="(555) 123-4567"
              onSave={val => save({ phone_mobile: val })}
            />
            <InlineTextField
              label="Business Phone"
              value={contact.phone_business}
              type="tel"
              href={contact.phone_business ? `tel:${contact.phone_business}` : undefined}
              placeholder="(555) 987-6543"
              onSave={val => save({ phone_business: val })}
            />
            <InlineTextField
              label="LinkedIn"
              value={contact.linkedin}
              type="url"
              href={contact.linkedin ?? undefined}
              placeholder="https://linkedin.com/in/…"
              onSave={val => save({ linkedin: val })}
            />
          </FieldSection>

          <FieldSection title="Address" icon={MapPin}>
            <InlineTextField
              label="Street"
              value={contact.address_line1}
              placeholder="123 Main St"
              onSave={val => save({ address_line1: val })}
            />
            <InlineTextField
              label="Suite / Unit"
              value={contact.address_line2}
              placeholder="Suite 100"
              onSave={val => save({ address_line2: val })}
            />
            <InlineTextField
              label="City"
              value={contact.city}
              placeholder="City"
              onSave={val => save({ city: val })}
            />
            <InlineSelectField
              label="State"
              value={contact.state}
              options={US_STATES.map(s => ({ value: s, label: s }))}
              placeholder="Select state"
              onSave={val => save({ state: val })}
            />
            <InlineTextField
              label="ZIP"
              value={contact.zip}
              placeholder="12345"
              onSave={val => save({ zip: val })}
            />
          </FieldSection>
        </div>

        {/* ── Profile + Notes ─────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
          <FieldSection title="Profile" icon={FileText}>
            <InlineTextField
              label="First Name"
              value={contact.first_name}
              placeholder="First name"
              onSave={val => save({ first_name: val ?? "" })}
            />
            <InlineTextField
              label="Last Name"
              value={contact.last_name}
              placeholder="Last name"
              onSave={val => save({ last_name: val ?? "" })}
            />
            <InlineCompanyField
              label="Company"
              company={contact.company}
              onSave={val => save({ company_id: val })}
            />
            <InlineTextField
              label="Job Title"
              value={contact.job_title}
              placeholder="Project Manager"
              onSave={val => save({ job_title: val })}
            />
            <InlineSelectField
              label="Person Type"
              value={contact.person_type}
              options={[
                { value: "contact", label: "Contact" },
                { value: "employee", label: "Employee" },
                { value: "user", label: "User" },
              ]}
              placeholder="Select type"
              onSave={val => save({ person_type: val as "contact" | "employee" | "user" | null })}
            />
            <InlineTextField
              label="Business Unit"
              value={contact.business_unit}
              placeholder="e.g. Operations"
              onSave={val => save({ business_unit: val })}
            />
          </FieldSection>

          <FieldSection title="Notes" icon={FileText}>
            <InlineTextareaField
              label="Notes"
              value={contact.notes}
              placeholder="Add notes about this contact…"
              onSave={val => save({ notes: val })}
            />
          </FieldSection>
        </div>

        {/* ── Project Access ───────────────────────────────────── */}
        <div className="border-t border-border/30 pt-8">
          <div className="flex items-center gap-1.5 mb-4">
            <Layers className="h-3 w-3 text-muted-foreground" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Project Access{activeCount > 0 ? ` · ${activeCount} active` : ""}
            </p>
          </div>

          {contact.memberships && contact.memberships.length > 0 ? (
            <div className="divide-y divide-border/20">
              {contact.memberships.map(m => (
                <div key={m.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {m.project?.name ?? "Unknown Project"}
                    </p>
                    {m.permission_template && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {m.permission_template.name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {m.role && (
                      <span className="text-xs text-muted-foreground">{m.role}</span>
                    )}
                    <span
                      className={cn(
                        "text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full",
                        m.status === "active"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {m.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No project access"
              description="This contact has not been assigned to any projects yet."
            />
          )}
        </div>
      </div>

      <ContactFormSheet
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
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
        onSuccess={() => { void load(); }}
      />
    </PageShell>
  );
}
