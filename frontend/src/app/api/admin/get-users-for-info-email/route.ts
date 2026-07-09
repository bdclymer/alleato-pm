import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const supabase = createServiceClient();
  const { data } = await supabase.auth.admin.listUsers();
  const identities = data.users.flatMap((user) => user.identities ?? []);
  
  const alreadyContacted = new Set([
    "megan@nutritionsolutionslifestyle.com",
    "randerson@alleatogroup.com",
    "pantone@alleatogroup.com",
    "mrogers@alleatogroup.com",
    "crusin@alleatogroup.com",
    "gdavis@alleatogroup.com",
    "test1@mail.com",
    "varvizu@alleatogroup.com",
    "tgraves@alleatogroup.com",
    "rrapean@alleatogroup.com",
    "phollingsworth@alleatogroup.com",
    "nbrimie@alleatogroup.com",
    "mparsons@alleatogroup.com",
    "mamico@alleatogroup.com",
    "kmass@alleatogroup.com",
    "jmendez@alleatogroup.com",
    "jgaona@alleatogroup.com",
    "hrutledge@alleatogroup.com",
    "gcloud@alleatogroup.com",
    "eandrade@alleatogroup.com",
    "dfranklin@alleatogroup.com",
    "ctragesser@alleatogroup.com",
    "aortiz@alleatogroup.com",
    "awehner@alleatogroup.com",
    "dsatterfield@alleatogroup.com",
    "bwright@alleatogroup.com",
    "njepson@alleatogroup.com",
    "mkharrison16@gmail.com",
    "mharrison@alleatogroup.com",
  ]);

  const usersToContact = identities
    .map((i) => i.identity_data?.email)
    .filter((e): e is string => Boolean(e) && !alreadyContacted.has(e ?? ""))
    .sort();

  const unique = [...new Set(usersToContact)];
  return NextResponse.json({
    total_users: identities.length,
    already_contacted: alreadyContacted.size,
    need_to_contact: unique.length,
    email_list: unique
  });
}
