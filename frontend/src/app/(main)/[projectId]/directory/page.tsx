import { redirect } from "next/navigation";

interface DirectoryPageProps {
  params: Promise<{
    projectId: string;
  }>;
}

export default async function ProjectDirectoryPage({
  params,
}: DirectoryPageProps) {
  const { projectId } = await params;
  // Redirect to the all people tab by default
  redirect(`/${projectId}/directory/all`);
}
