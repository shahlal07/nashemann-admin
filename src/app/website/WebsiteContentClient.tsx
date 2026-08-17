"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { saveSiteContentAction } from "./actions";

const TABS = [
  "Homepage Hero",
  "How It Works",
  "Features",
  "Testimonials",
  "Contact Info",
  "Social Links",
  "Promo Popup",
  "Rewards & Referral",
  "AI Support",
] as const;
type Tab = (typeof TABS)[number];

const inputClass =
  "w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none transition-colors focus:border-[var(--accent-violet)] accent-ring";
const labelClass = "mb-1.5 block text-xs font-medium text-[var(--text-muted)]";

type Hero = {
  eyebrow: string;
  headline: string;
  subheadline: string;
  primaryCta: string;
  secondaryCta: string;
  stats: { label: string; value: number; suffix?: string }[];
};
type Step = { icon: string; title: string; description: string };
type Testimonial = { name: string; emoji: string; quote: string; business: string };
type RewardTier = { icon: string; name: string; perk: string; ordersRequired: number };
type Rewards = {
  headline: string;
  subheadline: string;
  tiers: RewardTier[];
  referral: { headline: string; description: string; reward: number };
};
type Contact = {
  whatsappNumber: string;
  whatsappDisplay: string;
  supportEmail: string;
  phoneDisplay: string;
  phoneHref: string;
  address: string;
  hours: string;
};
type SocialLinks = { instagram: string; facebook: string; tiktok: string; linkedin: string; youtube: string };
type PromoPopup = { enabled: boolean; eyebrow: string; headline: string; description: string; cta: string; delayMs: number };
type AiSupport = { greeting: string; suggestedPrompts: string[] };

export function WebsiteContentClient({
  initialHero,
  initialHowItWorks,
  initialFeatures,
  initialTestimonials,
  initialRewards,
  initialContact,
  initialSocial,
  initialPromo,
  initialAiSupport,
}: {
  initialHero: Hero;
  initialHowItWorks: Step[];
  initialFeatures: Step[];
  initialTestimonials: Testimonial[];
  initialRewards: Rewards;
  initialContact: Contact;
  initialSocial: SocialLinks;
  initialPromo: PromoPopup;
  initialAiSupport: AiSupport;
}) {
  const [tab, setTab] = useState<Tab>("Homepage Hero");
  const [hero, setHero] = useState(initialHero);
  const [howItWorks, setHowItWorks] = useState(initialHowItWorks);
  const [features, setFeatures] = useState(initialFeatures);
  const [testimonials, setTestimonials] = useState(initialTestimonials);
  const [rewards, setRewards] = useState(initialRewards);
  const [contact, setContact] = useState(initialContact);
  const [social, setSocial] = useState(initialSocial);
  const [promo, setPromo] = useState(initialPromo);
  const [aiSupport, setAiSupport] = useState(initialAiSupport);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await saveSiteContentAction({
        hero,
        how_it_works: howItWorks,
        features,
        testimonials,
        rewards,
        contact,
        social_links: social,
        promo_popup: promo,
        ai_support: aiSupport,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    });
  }

  function updateStep(list: Step[], setList: (v: Step[]) => void, i: number, patch: Partial<Step>) {
    const next = [...list];
    next[i] = { ...next[i], ...patch };
    setList(next);
  }

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--text)]">Website content</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-[var(--text-muted)]">
            Everything on nashemann.store&apos;s public site — nothing is hardcoded, it all comes from here.
          </p>
        </div>
        <Button variant="primary" onClick={save} disabled={pending}>
          {pending ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
        </Button>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-[var(--border)]">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${
              tab === t ? "text-[var(--text)]" : "text-[var(--text-faint)] hover:text-[var(--text-muted)]"
            }`}
          >
            {t}
            {tab === t && (
              <motion.div
                layoutId="website-tab-underline"
                className="absolute inset-x-0 -bottom-px h-0.5"
                style={{ background: "var(--accent-gradient)" }}
              />
            )}
          </button>
        ))}
      </div>

      {tab === "Homepage Hero" && (
        <Card>
          <CardHeader title="Hero section" description="The very first thing a visitor sees." />
          <div className="space-y-4">
            <label className="block">
              <span className={labelClass}>Eyebrow badge</span>
              <input value={hero.eyebrow} onChange={(e) => setHero({ ...hero, eyebrow: e.target.value })} className={inputClass} />
            </label>
            <label className="block">
              <span className={labelClass}>Headline</span>
              <input value={hero.headline} onChange={(e) => setHero({ ...hero, headline: e.target.value })} className={inputClass} />
            </label>
            <label className="block">
              <span className={labelClass}>Subheadline</span>
              <textarea
                value={hero.subheadline}
                onChange={(e) => setHero({ ...hero, subheadline: e.target.value })}
                rows={3}
                className={inputClass}
              />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className={labelClass}>Primary CTA text</span>
                <input value={hero.primaryCta} onChange={(e) => setHero({ ...hero, primaryCta: e.target.value })} className={inputClass} />
              </label>
              <label className="block">
                <span className={labelClass}>Secondary CTA text</span>
                <input value={hero.secondaryCta} onChange={(e) => setHero({ ...hero, secondaryCta: e.target.value })} className={inputClass} />
              </label>
            </div>
            <div>
              <span className={labelClass}>Stat counters</span>
              <div className="grid grid-cols-3 gap-3">
                {hero.stats.map((s, i) => (
                  <div key={i} className="rounded-[var(--radius-sm)] border border-[var(--border)] p-3">
                    <input
                      value={s.value}
                      type="number"
                      onChange={(e) => {
                        const stats = [...hero.stats];
                        stats[i] = { ...stats[i], value: Number(e.target.value) };
                        setHero({ ...hero, stats });
                      }}
                      className="w-full bg-transparent text-sm font-semibold text-[var(--text)] outline-none"
                    />
                    <input
                      value={s.label}
                      onChange={(e) => {
                        const stats = [...hero.stats];
                        stats[i] = { ...stats[i], label: e.target.value };
                        setHero({ ...hero, stats });
                      }}
                      className="mt-1 w-full bg-transparent text-xs text-[var(--text-faint)] outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {tab === "How It Works" && (
        <Card>
          <CardHeader title="How it works steps" description="Shown on the homepage, in order." />
          <div className="space-y-4">
            {howItWorks.map((step, i) => (
              <div key={i} className="rounded-[var(--radius-md)] border border-[var(--border)] p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[8rem_1fr]">
                  <label className="block">
                    <span className={labelClass}>Icon name</span>
                    <input
                      value={step.icon}
                      onChange={(e) => updateStep(howItWorks, setHowItWorks, i, { icon: e.target.value })}
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Title</span>
                    <input
                      value={step.title}
                      onChange={(e) => updateStep(howItWorks, setHowItWorks, i, { title: e.target.value })}
                      className={inputClass}
                    />
                  </label>
                </div>
                <label className="mt-3 block">
                  <span className={labelClass}>Description</span>
                  <textarea
                    value={step.description}
                    onChange={(e) => updateStep(howItWorks, setHowItWorks, i, { description: e.target.value })}
                    rows={2}
                    className={inputClass}
                  />
                </label>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "Features" && (
        <Card>
          <CardHeader title="Feature grid" description="The 'why Nashemann' feature list." />
          <div className="space-y-4">
            {features.map((f, i) => (
              <div key={i} className="rounded-[var(--radius-md)] border border-[var(--border)] p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[8rem_1fr]">
                  <label className="block">
                    <span className={labelClass}>Icon name</span>
                    <input
                      value={f.icon}
                      onChange={(e) => updateStep(features, setFeatures, i, { icon: e.target.value })}
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Title</span>
                    <input
                      value={f.title}
                      onChange={(e) => updateStep(features, setFeatures, i, { title: e.target.value })}
                      className={inputClass}
                    />
                  </label>
                </div>
                <label className="mt-3 block">
                  <span className={labelClass}>Description</span>
                  <textarea
                    value={f.description}
                    onChange={(e) => updateStep(features, setFeatures, i, { description: e.target.value })}
                    rows={2}
                    className={inputClass}
                  />
                </label>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "Testimonials" && (
        <Card>
          <CardHeader
            title="Testimonials"
            description="Vendor quotes shown on the homepage."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setTestimonials([...testimonials, { name: "", emoji: "🙂", quote: "", business: "" }])}
              >
                <Plus size={13} /> Add
              </Button>
            }
          />
          <div className="space-y-4">
            {testimonials.map((t, i) => (
              <div key={i} className="rounded-[var(--radius-md)] border border-[var(--border)] p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[4rem_1fr_1fr]">
                  <label className="block">
                    <span className={labelClass}>Emoji</span>
                    <input
                      value={t.emoji}
                      onChange={(e) => {
                        const next = [...testimonials];
                        next[i] = { ...next[i], emoji: e.target.value };
                        setTestimonials(next);
                      }}
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Name</span>
                    <input
                      value={t.name}
                      onChange={(e) => {
                        const next = [...testimonials];
                        next[i] = { ...next[i], name: e.target.value };
                        setTestimonials(next);
                      }}
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Business</span>
                    <input
                      value={t.business}
                      onChange={(e) => {
                        const next = [...testimonials];
                        next[i] = { ...next[i], business: e.target.value };
                        setTestimonials(next);
                      }}
                      className={inputClass}
                    />
                  </label>
                </div>
                <label className="mt-3 block">
                  <span className={labelClass}>Quote</span>
                  <textarea
                    value={t.quote}
                    onChange={(e) => {
                      const next = [...testimonials];
                      next[i] = { ...next[i], quote: e.target.value };
                      setTestimonials(next);
                    }}
                    rows={2}
                    className={inputClass}
                  />
                </label>
                <button
                  onClick={() => setTestimonials(testimonials.filter((_, j) => j !== i))}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--danger)] hover:underline"
                >
                  <Trash2 size={12} /> Remove
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "Contact Info" && (
        <Card>
          <CardHeader title="Contact details" description="Shown on /contact and in the footer." />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>WhatsApp number</span>
              <input value={contact.whatsappDisplay} onChange={(e) => setContact({ ...contact, whatsappDisplay: e.target.value })} className={inputClass} />
            </label>
            <label className="block">
              <span className={labelClass}>Support email</span>
              <input value={contact.supportEmail} onChange={(e) => setContact({ ...contact, supportEmail: e.target.value })} className={inputClass} />
            </label>
            <label className="block">
              <span className={labelClass}>Phone (display)</span>
              <input value={contact.phoneDisplay} onChange={(e) => setContact({ ...contact, phoneDisplay: e.target.value })} className={inputClass} />
            </label>
            <label className="block">
              <span className={labelClass}>Office hours</span>
              <input value={contact.hours} onChange={(e) => setContact({ ...contact, hours: e.target.value })} className={inputClass} />
            </label>
            <label className="block sm:col-span-2">
              <span className={labelClass}>Address</span>
              <input value={contact.address} onChange={(e) => setContact({ ...contact, address: e.target.value })} className={inputClass} />
            </label>
          </div>
        </Card>
      )}

      {tab === "Social Links" && (
        <Card>
          <CardHeader title="Social media" description="Shown in the footer. Leave blank to hide an icon." />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(Object.keys(social) as Array<keyof typeof social>).map((key) => (
              <label key={key} className="block">
                <span className={`${labelClass} capitalize`}>{key}</span>
                <input value={social[key]} onChange={(e) => setSocial({ ...social, [key]: e.target.value })} className={inputClass} />
              </label>
            ))}
          </div>
        </Card>
      )}

      {tab === "Promo Popup" && (
        <Card>
          <CardHeader title="Promotional popup" description="Appears on the homepage after a delay." />
          <div className="mb-4 flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] p-4">
            <div>
              <p className="text-sm font-medium text-[var(--text)]">Popup enabled</p>
              <p className="text-xs text-[var(--text-faint)]">Turn off to pause the current promotion.</p>
            </div>
            <button
              onClick={() => setPromo({ ...promo, enabled: !promo.enabled })}
              className={`h-6 w-11 shrink-0 rounded-full transition-colors ${promo.enabled ? "" : "bg-white/10"}`}
              style={promo.enabled ? { background: "var(--accent-gradient)" } : undefined}
            >
              <span className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform ${promo.enabled ? "translate-x-[22px]" : ""}`} />
            </button>
          </div>
          <div className="space-y-4">
            <label className="block">
              <span className={labelClass}>Eyebrow</span>
              <input value={promo.eyebrow} onChange={(e) => setPromo({ ...promo, eyebrow: e.target.value })} className={inputClass} />
            </label>
            <label className="block">
              <span className={labelClass}>Headline</span>
              <input value={promo.headline} onChange={(e) => setPromo({ ...promo, headline: e.target.value })} className={inputClass} />
            </label>
            <label className="block">
              <span className={labelClass}>Description</span>
              <textarea value={promo.description} onChange={(e) => setPromo({ ...promo, description: e.target.value })} rows={3} className={inputClass} />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className={labelClass}>CTA text</span>
                <input value={promo.cta} onChange={(e) => setPromo({ ...promo, cta: e.target.value })} className={inputClass} />
              </label>
              <label className="block">
                <span className={labelClass}>Delay before showing (ms)</span>
                <input
                  type="number"
                  value={promo.delayMs}
                  onChange={(e) => setPromo({ ...promo, delayMs: Number(e.target.value) })}
                  className={inputClass}
                />
              </label>
            </div>
          </div>
        </Card>
      )}

      {tab === "Rewards & Referral" && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Rewards program copy" description="Shown on /rewards." />
            <div className="space-y-4">
              <label className="block">
                <span className={labelClass}>Headline</span>
                <input value={rewards.headline} onChange={(e) => setRewards({ ...rewards, headline: e.target.value })} className={inputClass} />
              </label>
              <label className="block">
                <span className={labelClass}>Subheadline</span>
                <textarea value={rewards.subheadline} onChange={(e) => setRewards({ ...rewards, subheadline: e.target.value })} rows={2} className={inputClass} />
              </label>
            </div>
          </Card>

          <Card>
            <CardHeader title="Reward tiers" />
            <div className="space-y-3">
              {rewards.tiers.map((tier, i) => (
                <div key={i} className="grid grid-cols-1 gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3 sm:grid-cols-4">
                  <label className="block">
                    <span className={labelClass}>Icon</span>
                    <input
                      value={tier.icon}
                      onChange={(e) => {
                        const tiers = [...rewards.tiers];
                        tiers[i] = { ...tiers[i], icon: e.target.value };
                        setRewards({ ...rewards, tiers });
                      }}
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Name</span>
                    <input
                      value={tier.name}
                      onChange={(e) => {
                        const tiers = [...rewards.tiers];
                        tiers[i] = { ...tiers[i], name: e.target.value };
                        setRewards({ ...rewards, tiers });
                      }}
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Orders required</span>
                    <input
                      type="number"
                      value={tier.ordersRequired}
                      onChange={(e) => {
                        const tiers = [...rewards.tiers];
                        tiers[i] = { ...tiers[i], ordersRequired: Number(e.target.value) };
                        setRewards({ ...rewards, tiers });
                      }}
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Perk</span>
                    <input
                      value={tier.perk}
                      onChange={(e) => {
                        const tiers = [...rewards.tiers];
                        tiers[i] = { ...tiers[i], perk: e.target.value };
                        setRewards({ ...rewards, tiers });
                      }}
                      className={inputClass}
                    />
                  </label>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Referral program" description="Shown on /rewards." />
            <div className="space-y-4">
              <label className="block">
                <span className={labelClass}>Headline</span>
                <input
                  value={rewards.referral.headline}
                  onChange={(e) => setRewards({ ...rewards, referral: { ...rewards.referral, headline: e.target.value } })}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Description</span>
                <textarea
                  value={rewards.referral.description}
                  onChange={(e) => setRewards({ ...rewards, referral: { ...rewards.referral, description: e.target.value } })}
                  rows={3}
                  className={inputClass}
                />
              </label>
              <label className="block max-w-xs">
                <span className={labelClass}>Reward amount (Rs)</span>
                <input
                  type="number"
                  value={rewards.referral.reward}
                  onChange={(e) => setRewards({ ...rewards, referral: { ...rewards.referral, reward: Number(e.target.value) } })}
                  className={inputClass}
                />
              </label>
            </div>
          </Card>
        </div>
      )}

      {tab === "AI Support" && (
        <Card>
          <CardHeader title="AI assistant greeting" description="Shown when a visitor opens the AI support widget." />
          <div className="space-y-4">
            <label className="block">
              <span className={labelClass}>Greeting</span>
              <textarea
                value={aiSupport.greeting}
                onChange={(e) => setAiSupport({ ...aiSupport, greeting: e.target.value })}
                rows={2}
                className={inputClass}
              />
            </label>
            <div>
              <span className={labelClass}>Suggested prompts</span>
              <div className="space-y-2">
                {aiSupport.suggestedPrompts.map((p, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={p}
                      onChange={(e) => {
                        const next = [...aiSupport.suggestedPrompts];
                        next[i] = e.target.value;
                        setAiSupport({ ...aiSupport, suggestedPrompts: next });
                      }}
                      className={inputClass}
                    />
                    <button
                      onClick={() =>
                        setAiSupport({
                          ...aiSupport,
                          suggestedPrompts: aiSupport.suggestedPrompts.filter((_, j) => j !== i),
                        })
                      }
                      className="shrink-0 rounded-[var(--radius-sm)] border border-[var(--border)] px-3 text-xs text-[var(--danger)] hover:bg-[var(--danger-bg)]"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setAiSupport({ ...aiSupport, suggestedPrompts: [...aiSupport.suggestedPrompts, ""] })}
                >
                  <Plus size={13} /> Add prompt
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
