import { createClient } from "@/lib/supabase/server";
import { ContactsDataTable } from "@/components/tables/contacts-data-table";
import { TablePageWrapper } from "@/components/tables/table-page-wrapper";

const PAGE_TITLE = "Contacts";
const PAGE_DESCRIPTION = "View and manage your contacts";

export default async function ContactsPage() {
  const supabase = await createClient();

  // Fetch contacts with company data
  const { data: contacts, error } = await supabase
    .from("people")
    .select(
      `
      *,
      company:companies(*)
    `,
    )
    .eq("person_type", "contact")
    .order("last_name", { ascending: true });

  if (error) {
    return (
      <TablePageWrapper title={PAGE_TITLE} description={PAGE_DESCRIPTION}>
        <div className="text-center text-red-600 p-6">
          Error loading contacts: {error.message}
        </div>
      </TablePageWrapper>
    );
  }

  return (
    <TablePageWrapper title={PAGE_TITLE} description={PAGE_DESCRIPTION}>
      <ContactsDataTable contacts={contacts || []} />
    </TablePageWrapper>
  );
}
