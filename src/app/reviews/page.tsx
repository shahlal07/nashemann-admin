import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReviewsClient, type ReviewRow } from "./ReviewsClient";

export default async function ReviewsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) redirect("/login");

  const { data: reviews } = await supabase
    .from("reviews")
    .select("*, vendor:vendors(name)")
    .order("created_at", { ascending: false });

  return <ReviewsClient initialReviews={(reviews ?? []) as ReviewRow[]} />;
}
