import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Inbox,
  Store,
  PlusCircle,
  Receipt,
  Activity,
  BarChart3,
  Tags,
  Settings,
  Users,
  ScrollText,
  Globe,
  Megaphone,
  Ticket,
  Star,
  Bug,
  Radio,
  FileDown,
  Sparkles,
  Gift,
  Headset,
  UserCircle,
  Wallet,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Shown as a small pill next to the label when > 0 (e.g. pending applications). */
  badgeKey?: "pendingApplications" | "pendingInfluencerApplications" | "pendingBugReports";
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "",
    items: [{ label: "Overview", href: "/", icon: LayoutDashboard }],
  },
  {
    label: "Vendors",
    items: [
      { label: "Applications", href: "/applications", icon: Inbox, badgeKey: "pendingApplications" },
      { label: "All Vendors", href: "/vendors", icon: Store },
      { label: "Create Store", href: "/vendors/new", icon: PlusCircle },
      { label: "Vendor Accounts", href: "/accounts", icon: Users },
    ],
  },
  {
    label: "Management",
    items: [
      { label: "Coupons", href: "/coupons", icon: Ticket },
      { label: "Reviews", href: "/reviews", icon: Star },
      { label: "Bug Reports", href: "/bugs", icon: Bug, badgeKey: "pendingBugReports" },
      { label: "Support", href: "/support", icon: Headset },
    ],
  },
  {
    label: "Insights",
    items: [
      { label: "Rewards & Referrals", href: "/loyalty", icon: Gift },
      { label: "Announcements", href: "/announcements", icon: Radio },
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
      { label: "Tenant Health", href: "/health", icon: Activity },
      { label: "Reports", href: "/reports", icon: FileDown },
      { label: "AI Assistant", href: "/assistant", icon: Sparkles },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Platform Fees", href: "/platform-fees", icon: Wallet },
      { label: "Settlements", href: "/settlements", icon: Receipt },
      { label: "Pricing Plans", href: "/pricing", icon: Tags },
      {
        label: "Influencers",
        href: "/influencers",
        icon: Megaphone,
        badgeKey: "pendingInfluencerApplications",
      },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "My Account", href: "/account", icon: UserCircle },
      { label: "Website Content", href: "/website", icon: Globe },
      { label: "Platform Settings", href: "/settings", icon: Settings },
      { label: "Staff", href: "/staff", icon: Users },
      { label: "Audit Log", href: "/audit-log", icon: ScrollText },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);
