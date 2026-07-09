import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
export async function GET() {
  const supabase = createServiceClient();
  const { data } = await supabase.auth.admin.listUsers();
  const users = data.users;
  const contacted = new Set(["aortiz@alleatogroup.com","awehner@alleatogroup.com","bwright@alleatogroup.com","crusin@alleatogroup.com","ctragesser@alleatogroup.com","dfranklin@alleatogroup.com","dsatterfield@alleatogroup.com","eandrade@alleatogroup.com","gcloud@alleatogroup.com","gdavis@alleatogroup.com","hrutledge@alleatogroup.com","jgaona@alleatogroup.com","jmendez@alleatogroup.com","kmass@alleatogroup.com","mamico@alleatogroup.com","megan@nutritionsolutionslifestyle.com","mharrison@alleatogroup.com","mkharrison16@gmail.com","mparsons@alleatogroup.com","mrogers@alleatogroup.com","nbrimie@alleatogroup.com","njepson@alleatogroup.com","pantone@alleatogroup.com","phollingsworth@alleatogroup.com","randerson@alleatogroup.com","rrapean@alleatogroup.com","test1@mail.com","tgraves@alleatogroup.com","varvizu@alleatogroup.com"]);
  const needsEmail = users.filter((u) => u.email && !contacted.has(u.email)).map((u) => u.email).sort();
  return NextResponse.json({total_users: users.length, contacted_today: 29, need_info_email: needsEmail.length, email_list: needsEmail});
}
