import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WebsiteContentClient } from "./WebsiteContentClient";
import { HERO_CONTENT, CONTACT_CONTENT, PROMO_POPUP, REWARDS_CONTENT, SOCIAL_LINKS } from "@/lib/site-content";

export default async function WebsiteContentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) redirect("/login");

  const { data: rows } = await supabase.from("platform_site_content").select("key, value");
  const byKey = new Map((rows ?? []).map((r) => [r.key, r.value]));

  return (
    <WebsiteContentClient
      initialHero={(byKey.get("hero") as typeof HERO_CONTENT) ?? HERO_CONTENT}
      initialHowItWorks={(byKey.get("how_it_works") as { icon: string; title: string; description: string }[]) ?? []}
      initialFeatures={(byKey.get("features") as { icon: string; title: string; description: string }[]) ?? []}
      initialTestimonials={
        (byKey.get("testimonials") as { name: string; emoji: string; quote: string; business: string }[]) ?? []
      }
      initialRewards={(byKey.get("rewards") as typeof REWARDS_CONTENT) ?? REWARDS_CONTENT}
      initialContact={(byKey.get("contact") as typeof CONTACT_CONTENT) ?? CONTACT_CONTENT}
      initialSocial={(byKey.get("social_links") as typeof SOCIAL_LINKS) ?? SOCIAL_LINKS}
      initialPromo={(byKey.get("promo_popup") as typeof PROMO_POPUP) ?? PROMO_POPUP}
      initialAiSupport={
        (byKey.get("ai_support") as { greeting: string; suggestedPrompts: string[] }) ?? {
          greeting: "",
          suggestedPrompts: [],
        }
      }
    />
  );
}
