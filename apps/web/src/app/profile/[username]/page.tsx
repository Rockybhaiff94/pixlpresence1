import { redirect } from "next/navigation";

export default async function ProfileLegacyRedirect({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const clean = decodeURIComponent(username).trim().replace(/^@+/, "");
  redirect(`/${clean}`);
}

