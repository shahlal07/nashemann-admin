/**
 * Maps the founder workspace's storage keys onto the normalized Supabase
 * tables that back them.
 *
 * The founder workspace is embedded as `public/founder-workspace.html` and
 * hydrates from a JSON snapshot served by `/api/owner/workspace`. This module
 * is the single source of truth for translating between the two
 * representations, so the embedded document never needs to know about
 * Supabase.
 */

export type CollectionName =
  | "transactions"
  | "tasks"
  | "leads"
  | "campaigns"
  | "notices"
  | "techItems"
  | "documents"
  | "milestones"
  | "risks"
  | "vendors"
  | "customerIssues"
  | "platformFeatures"
  | "chatMessages";

export type ScalarName =
  | "pipeline"
  | "decisionVotes"
  | "profitTotal"
  | "reservePct"
  | "permissions"
  | "settings";

/** Collection key -> Supabase table. */
export const COLLECTION_TABLES: Record<CollectionName, string> = {
  transactions: "owner_transactions",
  tasks: "owner_tasks",
  leads: "owner_leads",
  campaigns: "owner_campaigns",
  notices: "owner_notices",
  techItems: "owner_tech_items",
  documents: "owner_documents",
  milestones: "owner_milestones",
  risks: "owner_risks",
  vendors: "owner_vendors",
  customerIssues: "owner_customer_issues",
  platformFeatures: "owner_feature_requests",
  chatMessages: "owner_chat_messages",
};

/**
 * Prototype record field -> database column. `by` on the feature register is
 * resolved separately (`RESOLVED_COLLECTION_FIELDS`) because it is derived from
 * the creating owner's membership rather than stored on the row.
 */
export const COLLECTION_COLUMNS: Record<CollectionName, Record<string, string>> = {
  transactions: {
    id: "id",
    date: "date",
    type: "type",
    label: "label",
    amount: "amount",
    status: "status",
  },
  tasks: { id: "id", title: "title", owner: "owner", due: "due", done: "done" },
  leads: {
    id: "id",
    name: "name",
    contact: "contact",
    value: "value",
    stage: "stage",
  },
  campaigns: {
    id: "id",
    name: "name",
    channel: "channel",
    status: "status",
    progress: "progress",
    owner: "owner",
  },
  notices: {
    id: "id",
    icon: "icon",
    title: "title",
    desc: "desc",
    read: "read",
    time: "time",
  },
  techItems: {
    id: "id",
    title: "title",
    desc: "desc",
    tag: "tag",
    status: "status",
  },
  documents: {
    id: "id",
    name: "name",
    size: "size",
    type: "type",
    dataUrl: "data_url",
    date: "date",
    owner: "owner",
  },
  milestones: {
    id: "id",
    title: "title",
    date: "date",
    owner: "owner",
    kind: "kind",
    status: "status",
  },
  risks: {
    id: "id",
    title: "title",
    area: "area",
    severity: "severity",
    owner: "owner",
    status: "status",
    next: "next",
  },
  vendors: {
    id: "id",
    name: "name",
    stage: "stage",
    priority: "priority",
    owner: "owner",
    next: "next",
  },
  customerIssues: {
    id: "id",
    title: "title",
    type: "type",
    priority: "priority",
    status: "status",
    owner: "owner",
    next: "next",
  },
  platformFeatures: {
    id: "id",
    title: "title",
    scope: "target_platform",
    description: "description",
    status: "status",
  },
  chatMessages: {
    id: "id",
    owner: "owner",
    name: "name",
    initials: "initials",
    color: "color",
    text: "text",
    time: "time",
    attachments: "attachments",
  },
};

/**
 * Collections whose primary key is a UUID supplied by the client.
 *
 * These cannot use the delete-and-reinsert strategy: the underlying tables are
 * append-mostly governance registers that forbid deletes. Writes are upserts on
 * `id` instead, and the client is expected to generate the id with
 * `crypto.randomUUID()`.
 */
export const UPSERT_COLLECTIONS: ReadonlySet<string> = new Set(["platformFeatures"]);

/** Fields computed at read time from another table rather than stored on the row. */
export const RESOLVED_FIELDS: Partial<Record<CollectionName, string[]>> = {
  platformFeatures: ["by"],
};

export type StorageStrategy =
  /** One row per key in `owner_workspace_state`; the whole value is JSON. */
  | "state"
  /** One row per key in `owner_profit_settings`. */
  | "profit"
  /** One row per flag key in `owner_permissions` / `owner_settings`. */
  | "flags";

export const SCALAR_CONFIG: Record<
  ScalarName,
  { strategy: StorageStrategy; storageKey: string; flagsTable?: string; fallback?: string }
> = {
  pipeline: { strategy: "state", storageKey: "nashe:pipeline", fallback: "[]" },
  decisionVotes: { strategy: "state", storageKey: "nashe:decision-votes", fallback: "{}" },
  profitTotal: { strategy: "profit", storageKey: "profit-total" },
  reservePct: { strategy: "profit", storageKey: "reserve-pct" },
  permissions: {
    strategy: "flags",
    storageKey: "nashe:permissions",
    flagsTable: "owner_permissions",
  },
  settings: {
    strategy: "flags",
    storageKey: "nashe:settings",
    flagsTable: "owner_settings",
  },
};

/**
 * Prototype storage key -> payload key.
 *
 * `nashe:workspace`, `nashe:theme` and `nashe:active-owner` are intentionally
 * absent: those stay per-device preferences and are never synced.
 */
export const STORAGE_KEY_MAP: Record<string, string> = {
  "nashe:transactions": "transactions",
  "nashe:tasks": "tasks",
  "nashe:leads": "leads",
  "nashe:campaigns": "campaigns",
  "nashe:notices": "notices",
  "nashe:tech-items": "techItems",
  "nashe:documents": "documents",
  "nashe:milestones": "milestones",
  "nashe:risks": "risks",
  "nashe:vendors": "vendors",
  "nashe:customer-issues": "customerIssues",
  "nashe:platform-features": "platformFeatures",
  "nashe:owner-chat": "chatMessages",
  "nashe:pipeline": "pipeline",
  "nashe:decision-votes": "decisionVotes",
  "nashe:profit-total": "profitTotal",
  "nashe:reserve-pct": "reservePct",
  "nashe:permissions": "permissions",
  "nashe:settings": "settings",
};

/**
 * Prototype storage key for a collection, e.g. `techItems` -> `nashe:tech-items`.
 *
 * A few keys do not follow the mechanical rule and are listed explicitly so the
 * embedded document and this module always agree.
 */
const COLLECTION_STORAGE_KEYS: Partial<Record<CollectionName, string>> = {
  chatMessages: "nashe:owner-chat",
};

export function storageKeyForCollection(name: CollectionName): string {
  return COLLECTION_STORAGE_KEYS[name] ?? `nashe:${name.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
}

export function isCollectionName(value: string): value is CollectionName {
  return Object.prototype.hasOwnProperty.call(COLLECTION_TABLES, value);
}

export function isScalarName(value: string): value is ScalarName {
  return Object.prototype.hasOwnProperty.call(SCALAR_CONFIG, value);
}
