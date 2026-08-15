import { getStaffUser } from "@/lib/auth";

export default async function AccountsLayout({ children }: { children: React.ReactNode }) {
  await getStaffUser();
  return <>{children}</>;
}
