import { getStaffUser } from "@/lib/auth";

export default async function VendorsLayout({ children }: { children: React.ReactNode }) {
  await getStaffUser();
  return <>{children}</>;
}
