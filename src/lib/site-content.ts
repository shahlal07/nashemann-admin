/**
 * Every string/number on the public marketing site lives here, not inline
 * in JSX — this is the frontend-only stand-in for a real `site_content`
 * table (same convention as theaamghar-web's getSiteContent()). The
 * super-admin "Website Content" page edits this exact shape; once a
 * backend exists, this becomes a fetch instead of a static import.
 */

export const HERO_CONTENT = {
  eyebrow: "Now onboarding local businesses — free to start",
  headline: "Give your shop a home online.",
  subheadline:
    "Nashemann is the infrastructure behind independent stores — your own branded storefront, orders, and customers, live in days. You only pay when you sell.",
  primaryCta: "Apply for your store",
  secondaryCta: "See pricing",
  stats: [
    { label: "Vendors live", value: 5 },
    { label: "Orders processed", value: 1284 },
    { label: "Avg. setup time", value: 2, suffix: " days" },
  ],
};

export const HOW_IT_WORKS = [
  {
    title: "Apply in 3 minutes",
    description: "Tell us about your business — no paperwork, no upfront cost, decision within 24 hours.",
    icon: "FileEdit" as const,
  },
  {
    title: "We build your store",
    description: "A branded storefront on your own subdomain, seeded and ready — you just add products.",
    icon: "Rocket" as const,
  },
  {
    title: "Customers order",
    description: "Real checkout, real orders, delivered your way — you stay fully in control of fulfillment.",
    icon: "ShoppingBag" as const,
  },
  {
    title: "You grow, we earn together",
    description: "Rs 15 per order, or a flat monthly plan once you outgrow it. Never a surprise bill.",
    icon: "TrendingUp" as const,
  },
];

export const FEATURES = [
  {
    title: "Your own branded storefront",
    description: "Custom colors, logo, and typeface — customers never know it runs on shared infrastructure.",
    icon: "Palette" as const,
  },
  {
    title: "Real-time order management",
    description: "Every order lands in your own admin panel the moment it's placed. Nothing to refresh.",
    icon: "PackageCheck" as const,
  },
  {
    title: "Built-in inventory tracking",
    description: "Stock levels update automatically — never oversell a product that's already gone.",
    icon: "Boxes" as const,
  },
  {
    title: "Revenue you can actually see",
    description: "A live dashboard of every rupee — no waiting for a monthly statement.",
    icon: "LineChart" as const,
  },
  {
    title: "WhatsApp & AI support",
    description: "Your customers get instant answers, day or night, escalated to a human when it matters.",
    icon: "MessageCircle" as const,
  },
  {
    title: "Zero upfront cost",
    description: "Pay Rs 15 only when an order actually happens. No subscription required to start.",
    icon: "ShieldCheck" as const,
  },
];

export const TESTIMONIALS = [
  {
    quote:
      "We were taking orders over WhatsApp DMs for two years. Nashemann gave us a real store in two days — customers trust us more now.",
    name: "Sana Tariq",
    business: "Bloom & Batter, Lahore",
    emoji: "🥐",
  },
  {
    quote:
      "The Rs 15/order model meant we could try it with zero risk. Three months later it's half our business.",
    name: "Fatima Noor",
    business: "Sabz Basket, Karachi",
    emoji: "🥬",
  },
  {
    quote:
      "Seeing revenue update live, instead of guessing at month-end, changed how we actually run the shop.",
    name: "Shahzaib Lal",
    business: "TheAamGhar, Multan",
    emoji: "🥭",
  },
];

export const REWARDS_CONTENT = {
  headline: "Nashemann Rewards",
  subheadline: "Grow the platform, and we grow your store back.",
  tiers: [
    { name: "Seedling", ordersRequired: 0, perk: "Standard Rs 15/order rate", icon: "Sprout" as const },
    { name: "Rooted", ordersRequired: 200, perk: "2% off platform fees for a month", icon: "Trees" as const },
    { name: "Thriving", ordersRequired: 750, perk: "Free custom domain (worth Rs 4,600)", icon: "Flower2" as const },
    { name: "Flagship", ordersRequired: 2000, perk: "Featured on the Nashemann homepage", icon: "Star" as const },
  ],
  referral: {
    headline: "Refer a business, earn credit",
    description:
      "Every vendor gets a unique referral link. When a business you refer completes their first 50 orders, you both get Rs 2,000 in platform-fee credit.",
    yourCode: "SANA-BLOOM-2K26",
    reward: 2000,
  },
};

export const CONTACT_CONTENT = {
  whatsappNumber: "923001234567",
  whatsappDisplay: "+92 300 1234567",
  supportEmail: "hello@nashemann.com",
  phoneDisplay: "+92 42 1234 5678",
  phoneHref: "tel:+924212345678",
  address: "Gulberg III, Lahore, Pakistan",
  hours: "Mon–Sat, 9am–8pm PKT",
};

export const SOCIAL_LINKS = {
  instagram: "https://instagram.com/nashemann",
  facebook: "https://facebook.com/nashemann",
  tiktok: "https://tiktok.com/@nashemann",
  linkedin: "https://linkedin.com/company/nashemann",
  youtube: "https://youtube.com/@nashemann",
};

export const PROMO_POPUP = {
  enabled: true,
  eyebrow: "Limited-time",
  headline: "First 10 vendors — Monthly plan free for 3 months",
  description: "Applying this week? Mention code EARLYBIRD and skip the Rs 7,000/mo fee for your first quarter.",
  cta: "Apply now",
  delayMs: 4000,
};

export const AI_SUPPORT_CONTENT = {
  greeting: "Hi! I'm the Nashemann assistant. Ask me about pricing, applying, or anything else.",
  suggestedPrompts: ["How much does it cost to start?", "How long does approval take?", "Talk to a human"],
};
