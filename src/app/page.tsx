import { getStaffUser } from "@/lib/auth";
import { OverviewClient } from "./OverviewClient";

export default async function OverviewPage() {
  await getStaffUser();
  return <OverviewClient />;
}
