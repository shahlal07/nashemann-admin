import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AssistantClient } from "./AssistantClient";

export default async function AssistantPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) redirect("/login");

  return <AssistantClient />;
}
