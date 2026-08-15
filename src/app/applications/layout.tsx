import { getStaffUser } from "@/lib/auth";

export default async function ApplicationsLayout({ children }: { children: React.ReactNode }) {
  await getStaffUser();
  return <>{children}</>;
}
