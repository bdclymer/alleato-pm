"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Mail, Phone, Plus } from "lucide-react";

import type { Database } from "@/types/database.types";
import { createClient } from "@/lib/supabase/client";
import { PageShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ds";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/unified-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Vendor = Database["public"]["Tables"]["vendors"]["Row"];
type Contact = Database["public"]["Tables"]["people"]["Row"];

function normalizeVendorField(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (
    trimmed === "{}" ||
    trimmed === "[]" ||
    trimmed.toLowerCase() === "null" ||
    trimmed.toLowerCase() === "undefined"
  ) {
    return "";
  }
  return trimmed;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString();
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  );
}

export default function VendorDetailPage() {
  const router = useRouter();
  const params = useParams();
  const vendorId = params.vendorId as string;

  const [vendor, setVendor] = React.useState<Vendor | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = React.useState(false);
  const [addContactOpen, setAddContactOpen] = React.useState(false);
  const [isSavingContact, setIsSavingContact] = React.useState(false);
  const [newContactForm, setNewContactForm] = React.useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_business: "",
    job_title: "",
  });

  React.useEffect(() => {
    let isActive = true;

    const loadVendor = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const supabase = createClient();
        const { data, error: queryError } = await supabase
          .from("vendors")
          .select("*")
          .eq("id", vendorId)
          .single();

        if (queryError) throw queryError;
        if (!isActive) return;
        setVendor(data);
      } catch (err) {
        if (!isActive) return;
        setError(err instanceof Error ? err.message : "Failed to load vendor details");
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    void loadVendor();

    return () => {
      isActive = false;
    };
  }, [vendorId]);

  const loadContacts = React.useCallback(async (companyId: string) => {
    try {
      setIsLoadingContacts(true);
      const supabase = createClient();
      const { data, error: queryError } = await supabase
        .from("people")
        .select("*")
        .eq("company_id", companyId)
        .eq("person_type", "contact")
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true });

      if (queryError) throw queryError;
      setContacts(data ?? []);
    } catch {
      setContacts([]);
    } finally {
      setIsLoadingContacts(false);
    }
  }, []);

  React.useEffect(() => {
    if (!vendor?.company_id) {
      setContacts([]);
      return;
    }
    void loadContacts(vendor.company_id);
  }, [loadContacts, vendor?.company_id]);

  if (isLoading) {
    return (
      <PageShell
        variant="detail"
        title="Vendor Details"
        description="Loading vendor information..."
        onBack={() => router.push("/directory/vendors")}
      >
        <div className="space-y-6">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      </PageShell>
    );
  }

  if (error || !vendor) {
    return (
      <PageShell
        variant="detail"
        title="Vendor Details"
        description="Unable to load vendor details"
        onBack={() => router.push("/directory/vendors")}
      >
        <section className="space-y-4">
          <p className="text-sm text-destructive">{error || "Vendor not found"}</p>
          <Button variant="outline" onClick={() => router.push("/directory/vendors")}>
            <ArrowLeft />
            Back to Vendors
          </Button>
        </section>
      </PageShell>
    );
  }

  const email = normalizeVendorField(vendor.contact_email);
  const phone = normalizeVendorField(vendor.contact_phone);
  const contactName = normalizeVendorField(vendor.contact_name);
  const location = [vendor.city, vendor.state, vendor.zip_code].filter(Boolean).join(", ");
  const handleCreateContact = async () => {
    if (!vendor.company_id) return;
    if (!newContactForm.first_name.trim() || !newContactForm.last_name.trim()) return;

    try {
      setIsSavingContact(true);
      const supabase = createClient();
      const { error: insertError } = await supabase.from("people").insert({
        first_name: newContactForm.first_name.trim(),
        last_name: newContactForm.last_name.trim(),
        email: newContactForm.email.trim() || null,
        phone_business: newContactForm.phone_business.trim() || null,
        job_title: newContactForm.job_title.trim() || null,
        person_type: "contact",
        status: "active",
        company_id: vendor.company_id,
      });

      if (insertError) throw insertError;

      setAddContactOpen(false);
      setNewContactForm({
        first_name: "",
        last_name: "",
        email: "",
        phone_business: "",
        job_title: "",
      });
      await loadContacts(vendor.company_id);
    } finally {
      setIsSavingContact(false);
    }
  };

  return (
    <PageShell
      variant="detail"
      title={vendor.name}
      description={location || normalizeVendorField(vendor.legal_name) || "Vendor details"}
      onBack={() => router.push("/directory/vendors")}
      actions={
        <Link
          href={`/directory/vendors?detail=${vendor.id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Directory
        </Link>
      }
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-6">
          <div className="space-y-3">
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={vendor.is_active ? "Active" : "Inactive"} />
              {vendor.vendor_class ? <Badge variant="outline">{vendor.vendor_class}</Badge> : null}
            </div>
          </div>

          {(contactName || phone || email) && (
            <div className="space-y-3 border-b border-border pb-6">
              <h3 className="text-sm font-semibold text-foreground">Primary Contact</h3>
              <div className="px-0 py-0 space-y-2">
                {contactName ? <p className="text-sm font-medium">{contactName}</p> : null}
                {phone ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{phone}</span>
                  </div>
                ) : null}
                {email ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <a href={`mailto:${email}`} className="text-primary hover:underline break-all">
                      {email}
                    </a>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Company Contacts</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setAddContactOpen(true)}
                aria-label="Add contact"
                title="Add contact"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {isLoadingContacts ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contacts linked to this company.</p>
            ) : (
              <div className="space-y-1">
                {contacts.map((contact) => (
                  <Link
                    key={contact.id}
                    href={`/directory/contacts/${contact.id}`}
                    className="flex items-center justify-between gap-3 py-2 text-sm hover:bg-muted/30"
                  >
                    <span className="font-medium text-foreground">
                      {contact.first_name} {contact.last_name}
                    </span>
                    <span className="text-muted-foreground truncate">
                      {contact.email || contact.phone_business || contact.phone_mobile || "No contact info"}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <DetailField label="Legal Name" value={normalizeVendorField(vendor.legal_name) || "-"} />
            <DetailField label="Acumatica Vendor ID" value={normalizeVendorField(vendor.acumatica_vendor_id) || "-"} />
            <DetailField label="Payment Method" value={normalizeVendorField(vendor.payment_method) || "-"} />
            <DetailField label="Terms" value={normalizeVendorField(vendor.terms) || "-"} />
            <DetailField label="Tax ID" value={normalizeVendorField(vendor.tax_id) || "-"} />
            <DetailField label="1099 Vendor" value={vendor.is_1099_vendor ? "Yes" : "No"} />
            <DetailField label="Address" value={normalizeVendorField(vendor.address) || "-"} />
            <DetailField label="City" value={normalizeVendorField(vendor.city) || "-"} />
            <DetailField label="State" value={normalizeVendorField(vendor.state) || "-"} />
            <DetailField label="Zip Code" value={normalizeVendorField(vendor.zip_code) || "-"} />
            <DetailField label="Created" value={formatDate(vendor.created_at)} />
            <DetailField label="Updated" value={formatDate(vendor.updated_at)} />
          </div>

          {normalizeVendorField(vendor.notes) ? (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{normalizeVendorField(vendor.notes)}</p>
            </div>
          ) : null}
        </section>

        <aside className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Quick Actions</p>
            <Button variant="outline" className="w-full justify-start" onClick={() => router.push("/directory/vendors")}>
              <ArrowLeft />
              Back to Vendors
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => router.push(`/directory/vendors?detail=${vendor.id}`)}>
              Open In Split View
            </Button>
          </div>
        </aside>
      </div>

      <Modal open={addContactOpen} onOpenChange={setAddContactOpen}>
        <ModalContent className="sm:max-w-lg">
          <ModalHeader>
            <ModalTitle>Add Contact</ModalTitle>
            <ModalDescription>Create a company contact for this vendor.</ModalDescription>
          </ModalHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="vendor-contact-first-name">First Name</Label>
                <Input
                  id="vendor-contact-first-name"
                  value={newContactForm.first_name}
                  onChange={(e) =>
                    setNewContactForm((prev) => ({ ...prev, first_name: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="vendor-contact-last-name">Last Name</Label>
                <Input
                  id="vendor-contact-last-name"
                  value={newContactForm.last_name}
                  onChange={(e) =>
                    setNewContactForm((prev) => ({ ...prev, last_name: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="vendor-contact-email">Email</Label>
              <Input
                id="vendor-contact-email"
                type="email"
                value={newContactForm.email}
                onChange={(e) =>
                  setNewContactForm((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="vendor-contact-phone">Phone</Label>
              <Input
                id="vendor-contact-phone"
                value={newContactForm.phone_business}
                onChange={(e) =>
                  setNewContactForm((prev) => ({ ...prev, phone_business: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="vendor-contact-job-title">Job Title</Label>
              <Input
                id="vendor-contact-job-title"
                value={newContactForm.job_title}
                onChange={(e) =>
                  setNewContactForm((prev) => ({ ...prev, job_title: e.target.value }))
                }
              />
            </div>
          </div>
          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => setAddContactOpen(false)}
              disabled={isSavingContact}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleCreateContact()}
              disabled={
                isSavingContact ||
                !newContactForm.first_name.trim() ||
                !newContactForm.last_name.trim()
              }
            >
              {isSavingContact ? "Creating..." : "Create Contact"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </PageShell>
  );
}
