/**
 * Every string/number on the public marketing site lives here, not inline
 * in JSX — this is the frontend-only stand-in for a real `site_content`
 * table (same convention as vendor-storefronts's getSiteContent()). The
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
  supportEmail: "hello@nashemann.store",
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

export const TERMS_CONTENT = {
  lastUpdated: "August 2026",
  intro:
    "These terms apply to everyone who uses Nashemann — whether you're running a store, part of the Influencer Program, or shopping at a store built on Nashemann. Please read them before creating an account.",
  sections: [
    {
      title: "1. What Nashemann is",
      body: `Nashemann ("we", "us", "the platform") provides the infrastructure independent businesses in Pakistan use to run their own branded online store — a storefront, order management, inventory, and payments — without building any of it themselves. Nashemann is not the seller of record for products listed on any individual vendor's store; each vendor is solely responsible for the products, descriptions, pricing, and fulfillment of their own storefront.`,
    },
    {
      title: "2. Accounts",
      body: `You must provide accurate information when creating an account (as a vendor, an influencer, or a customer of a vendor's store) and keep it up to date. You're responsible for activity under your account. One account can hold more than one role (for example, both a vendor and an influencer role) using the same login — each role's data stays separated internally, but the login credentials are shared.`,
    },
    {
      title: "3. Vendors",
      body: `Approval to open a store on Nashemann is at our discretion and generally reviewed within 24 hours of applying. Vendors are responsible for the legality, accuracy, and quality of everything they list, for fulfilling orders they accept, and for their own customer service. Nashemann's fees (pay-per-order or a flat monthly rate, as chosen at signup) are disclosed before a vendor commits and may change with reasonable notice. We may suspend or remove a store that violates these terms, applicable law, or engages in fraudulent activity.`,
    },
    {
      title: "4. Influencers",
      body: `The Influencer Program pays a share of platform revenue generated by businesses you refer, for the period disclosed at signup. Referral codes are personal to your account and may not be resold, shared publicly in a way that misrepresents them as a discount code, or used in paid advertising without our consent. We may adjust program terms or a specific referral's payout period going forward, not retroactively for revenue already earned.`,
    },
    {
      title: "5. Customers",
      body: `When you order from a store on Nashemann, your contract for that purchase is with the vendor, not with Nashemann. Payment, delivery, and return/refund policies are set by the individual vendor unless stated otherwise at checkout. Nashemann provides the checkout, order tracking, and support infrastructure, and will help mediate a dispute with a vendor in good faith, but is not itself liable for a vendor's fulfillment failures.`,
    },
    {
      title: "6. Payments",
      body: `Payments are processed through the methods a given store makes available at checkout. Platform fees charged to vendors are separate from, and not visible as a line item to, the customer. We do not store full card numbers ourselves — payment processing is handled by our payment providers under their own security standards.`,
    },
    {
      title: "7. Prohibited use",
      body: `You may not use Nashemann to list illegal goods or services, infringe someone else's intellectual property, submit fraudulent orders or reviews, attempt to bypass platform fees, or interfere with the platform's security or normal operation. We may suspend any account engaged in prohibited use without prior notice.`,
    },
    {
      title: "8. Your data",
      body: `We collect the information needed to operate your account and, for vendors, your store (contact details, order and product data, and usage data to keep the platform reliable). We don't sell your personal data. You can request an export or deletion of your account data at any time from your account settings, subject to records we're required to retain for legal, tax, or fraud-prevention purposes.`,
    },
    {
      title: "9. Liability",
      body: `Nashemann is provided on an "as is" basis. We work to keep the platform reliable and secure but don't guarantee uninterrupted availability. To the extent permitted by law, our liability for any claim relating to your use of the platform is limited to the fees you paid us (if any) in the three months before the claim arose. This doesn't limit liability for something that can't legally be limited, such as fraud.`,
    },
    {
      title: "10. Changes to these terms",
      body: `We may update these terms as the platform evolves. Material changes will be communicated by email or an in-app notice before they take effect. Continuing to use Nashemann after a change takes effect means you accept the updated terms.`,
    },
    {
      title: "11. Governing law",
      body: `These terms are governed by the laws of Pakistan. Any dispute arising from your use of Nashemann will be subject to the exclusive jurisdiction of the courts of Pakistan.`,
    },
    {
      title: "12. Contact",
      body: `Questions about these terms can be sent to hello@nashemann.store.`,
    },
  ],
};
