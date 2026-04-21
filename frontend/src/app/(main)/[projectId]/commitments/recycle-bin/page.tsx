import { redirect } from "next/navigation";

interface CommitmentsRecycleBinRedirectPageProps {
  params: {
    projectId: string;
  };
}

export default function CommitmentsRecycleBinRedirectPage({
  params,
}: CommitmentsRecycleBinRedirectPageProps) {
  redirect(`/${params.projectId}/commitments?tab=recycle-bin`);
}
