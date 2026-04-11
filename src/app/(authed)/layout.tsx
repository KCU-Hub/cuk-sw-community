import { requireUser } from "@/lib/auth/require-user";

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return children;
}
