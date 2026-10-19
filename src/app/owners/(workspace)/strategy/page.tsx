import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * The former /owners/strategy route is now part of the Marketing workspace
 * (the live membership model maps the third founder — "Marketing Owner" — to
 * the business_strategy domain and strategy.* capabilities). Existing links
 * and bookmarks keep working via this redirect.
 */
export default function FounderStrategyPage() {
  redirect("/owners/marketing");
}
