import { NextResponse } from "next/server";
import { getOwner } from "@/lib/owner-authz";
import {
  toFounderProfile,
  type FounderProfile,
  type MembershipSource,
} from "@/lib/founders/profile";
import {
  COLLECTION_COLUMNS,
  COLLECTION_TABLES,
  RESOLVED_FIELDS,
  SCALAR_CONFIG,
  STORAGE_KEY_MAP,
  UPSERT_COLLECTIONS,
  isCollectionName,
  isScalarName,
  storageKeyForCollection,
  type CollectionName,
  type ScalarName,
} from "@/lib/owner-workspace-schema";

/**
 * Founder workspace data API.
 *
 * GET  /api/owner/workspace
 *   Returns everything the embedded founder workspace needs to hydrate:
 *     - `localStorageState` keyed by the workspace's storage keys
 *     - `session`          the signed-in founder plus the founder roster
 *     - `metrics`          headline numbers and an activity feed, both derived
 *                          from the records below (never hard-coded)
 *
 * POST /api/owner/workspace   { key: string, value: unknown }
 *   Writes one storage key back. Every write runs as the authenticated founder,
 *   so Row Level Security on the target table is the enforcement layer.
 */

export const dynamic = "force-dynamic";

type Supabase = NonNullable<Awaited<ReturnType<typeof getOwner>>>["supabase"];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* ------------------------------------------------------------------ reads */

type Row = Record<string, unknown>;

/** Maps database rows onto the prototype's record shape. */
function mapRows(collection: CollectionName, rows: Row[], namesByUserId?: Map<string, string>) {
  const columns = COLLECTION_COLUMNS[collection];
  return rows.map((row) => {
    const record: Row = {};
    for (const [field, column] of Object.entries(columns)) {
      if (Object.prototype.hasOwnProperty.call(row, column)) record[field] = row[column];
    }
    if (RESOLVED_FIELDS[collection]?.includes("by")) {
      const creator = typeof row.created_by === "string" ? row.created_by : "";
      record.by = namesByUserId?.get(creator) ?? "Founder";
    }
    return record;
  });
}

/** Id -> display name for every active founder; used to resolve `created_by`. */
function nameIndex(roster: FounderProfile[]) {
  return new Map(roster.map((profile) => [profile.id, profile.name]));
}

/**
 * The founder roster. Reading it is what lets the workspace show who the other
 * founders are; `owner_memberships` has a policy for exactly this.
 */
async function fetchRoster(supabase: Supabase) {
  const { data, error } = await supabase
    .from("owner_memberships")
    .select("user_id, username, display_name, status, responsibilities, capabilities")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[owner-workspace] reading owner_memberships:", error.message);
    return [] as FounderProfile[];
  }

  return ((data ?? []) as MembershipSource[])
    .filter((row) => row.status === "active")
    .map((row) => toFounderProfile(row))
    .filter((profile): profile is FounderProfile => profile !== null);
}

/** Reads every collection table in one round trip each, in parallel. */
async function fetchCollections(
  supabase: Supabase,
  namesByUserId: Map<string, string>,
): Promise<Record<string, string>> {
  const entries = await Promise.all(
    (Object.keys(COLLECTION_TABLES) as CollectionName[]).map(async (collection) => {
      const { data, error } = await supabase
        .from(COLLECTION_TABLES[collection])
        .select("*")
        .limit(1000);
      if (error) {
        console.error(`[owner-workspace] reading ${COLLECTION_TABLES[collection]}:`, error.message);
        return [storageKeyForCollection(collection), "[]"] as const;
      }
      return [
        storageKeyForCollection(collection),
        JSON.stringify(mapRows(collection, (data ?? []) as Row[], namesByUserId)),
      ] as const;
    }),
  );
  return Object.fromEntries(entries);
}

async function fetchScalar(
  supabase: Supabase,
  payloadKey: ScalarName,
): Promise<readonly [string, string] | null> {
  const config = SCALAR_CONFIG[payloadKey];

  if (config.strategy === "state") {
    const { data } = await supabase
      .from("owner_workspace_state")
      .select("value")
      .eq("key", config.storageKey)
      .maybeSingle();
    return [
      config.storageKey,
      (data?.value as string | undefined) ?? config.fallback ?? "null",
    ];
  }

  if (config.strategy === "profit") {
    const { data } = await supabase
      .from("owner_profit_settings")
      .select("value")
      .eq("key", config.storageKey)
      .maybeSingle();
    return [`nashe:${config.storageKey}`, (data?.value as string | undefined) ?? "0"];
  }

  const table = config.flagsTable;
  if (!table) return null;
  const { data } = await supabase.from(table).select("key, value");
  const flags: Record<string, boolean> = {};
  for (const row of (data ?? []) as { key: string; value: boolean }[]) {
    flags[row.key] = row.value;
  }
  return [config.storageKey, JSON.stringify(flags)];
}

/* ---------------------------------------------------------------- metrics */

const MONTH_LABELS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

type ActivityCategory = "finance" | "product" | "growth" | "ops" | "collab";

const ACTIVITY_SOURCES: Array<{
  collection: CollectionName;
  category: ActivityCategory;
  describe: (row: Row) => string | null;
}> = [
  {
    collection: "transactions",
    category: "finance",
    describe: (row) =>
      row.label ? `${row.type === "Expense" ? "Recorded an expense" : "Recorded income"}: ${row.label}` : null,
  },
  {
    collection: "tasks",
    category: "ops",
    describe: (row) => (row.done ? `Completed a task: ${row.title}` : `Added a task: ${row.title}`),
  },
  {
    collection: "campaigns",
    category: "growth",
    describe: (row) => `${row.status === "Running" ? "Started" : "Updated"} campaign: ${row.name}`,
  },
  {
    collection: "leads",
    category: "growth",
    describe: (row) => (row.name ? `Added a lead: ${row.name}` : null),
  },
  {
    collection: "techItems",
    category: "product",
    describe: (row) => (row.title ? `Roadmap item ${row.status}: ${row.title}` : null),
  },
  {
    collection: "platformFeatures",
    category: "product",
    describe: (row) => (row.title ? `Feature request ${row.status}: ${row.title}` : null),
  },
  {
    collection: "risks",
    category: "ops",
    describe: (row) => (row.title ? `Risk ${row.status}: ${row.title}` : null),
  },
  {
    collection: "milestones",
    category: "ops",
    describe: (row) => (row.title ? `Milestone ${row.status}: ${row.title}` : null),
  },
  {
    collection: "chatMessages",
    category: "collab",
    describe: (row) => (row.text ? `${row.name ?? "An owner"} posted in the owner chat` : null),
  },
  {
    collection: "notices",
    category: "ops",
    describe: (row) => (row.title ? `${row.title}` : null),
  },
];

function buildMetrics(
  collections: Record<string, string>,
  namesByUserId: Map<string, string>,
  roster: FounderProfile[],
  owner: FounderProfile | null,
) {
  const read = (key: CollectionName): Row[] => {
    try {
      const parsed = JSON.parse(collections[storageKeyForCollection(key)]);
      return Array.isArray(parsed) ? (parsed as Row[]) : [];
    } catch {
      return [];
    }
  };

  const transactions = read("transactions");
  const tasks = read("tasks");
  const leads = read("leads");
  const campaigns = read("campaigns");
  const risks = read("risks");
  const notices = read("notices");
  const milestones = read("milestones");
  const documents = read("documents");
  const platformFeatures = read("platformFeatures");
  const chatMessages = read("chatMessages");

  // Net revenue per month for the trailing window, straight from the ledger.
  const now = new Date();
  const months = Array.from({ length: 8 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (7 - index), 1);
    return { key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`, label: MONTH_LABELS[date.getMonth()] };
  });
  const totals = new Map(months.map((month) => [month.key, 0]));
  for (const row of transactions) {
    const date = typeof row.date === "string" ? row.date.slice(0, 7) : "";
    if (!totals.has(date)) continue;
    totals.set(date, (totals.get(date) ?? 0) + Number(row.amount ?? 0));
  }
  const revenueMonthly = months.map((month) => ({ label: month.label, value: Math.round(totals.get(month.key) ?? 0) }));
  const thisMonth = revenueMonthly.at(-1)?.value ?? 0;
  const lastMonth = revenueMonthly.at(-2)?.value ?? 0;
  const deltaPct = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / Math.abs(lastMonth)) * 1000) / 10 : null;

  const activity = ACTIVITY_SOURCES.flatMap(({ collection, category, describe }) => {
    const rosterName = new Map(roster.map((profile) => [profile.id, profile]));
    return read(collection)
      .map((row, index) => {
        const text = describe(row);
        if (!text) return null;
        const createdBy = typeof row.created_by === "string" ? row.created_by : "";
        const profile = rosterName.get(createdBy) ?? null;
        return {
          id: `${collection}-${row.id ?? index}`,
          at: (row.created_at as string | undefined) ?? (row.date as string | undefined) ?? "",
          category,
          actor: profile?.name ?? namesByUserId.get(createdBy) ?? owner?.name ?? "Founder",
          initials: profile?.initials ?? owner?.initials ?? "?",
          color: profile?.color ?? owner?.color ?? "#8b5cf6",
          text,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  })
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
    .slice(0, 40);

  return {
    generatedAt: new Date().toISOString(),
    revenue: {
      monthly: revenueMonthly,
      thisMonth,
      deltaPct,
      netTotal: transactions.reduce((sum, row) => sum + Number(row.amount ?? 0), 0),
    },
    counts: {
      openTasks: tasks.filter((row) => !row.done).length,
      completedTasks: tasks.filter((row) => row.done).length,
      openRisks: risks.filter((row) => row.status !== "Resolved").length,
      highSeverityRisks: risks.filter((row) => row.severity === "High" && row.status !== "Resolved").length,
      activeCampaigns: campaigns.filter((row) => row.status === "Running").length,
      openLeads: leads.filter((row) => row.stage !== "Won" && row.stage !== "Lost").length,
      pipelineValue: leads
        .filter((row) => row.stage !== "Won" && row.stage !== "Lost")
        .reduce((sum, row) => sum + Number(row.value ?? 0), 0),
      unreadNotices: notices.filter((row) => !row.read).length,
      upcomingMilestones: milestones.filter((row) => row.status !== "Complete").length,
      savedDocuments: documents.length,
      openFeatureRequests: platformFeatures.filter((row) => row.status !== "shipped").length,
      chatMessages: chatMessages.length,
      founders: roster.length,
    },
    activity,
  };
}

/* ------------------------------------------------------------------ GET */

export async function GET() {
  const owner = await getOwner();
  if (!owner) {
    return NextResponse.json({ error: "Founder access is required." }, { status: 401 });
  }
  const { supabase, membership } = owner;

  // The roster resolves `created_by` for the feature register, so it has to
  // settle before the collections are mapped.
  const roster = await fetchRoster(supabase);
  const names = nameIndex(roster);

  const [collections, scalarEntries] = await Promise.all([
    fetchCollections(supabase, names),
    Promise.all(
      (Object.keys(SCALAR_CONFIG) as ScalarName[]).map((key) => fetchScalar(supabase, key)),
    ),
  ]);

  const scalars = Object.fromEntries(
    scalarEntries.filter((entry): entry is readonly [string, string] => entry !== null),
  );
  const session = { owner: toFounderProfile(membership), roster };

  return NextResponse.json({
    localStorageState: { ...collections, ...scalars },
    session,
    metrics: buildMetrics(collections, names, roster, session.owner),
    serverTime: new Date().toISOString(),
  });
}

/* ------------------------------------------------------------------ POST */

type WriteResult = { ok: boolean; error?: string };

/** Validates a record and drops unknown/oversized fields before the insert. */
function toRow(collection: CollectionName, record: Row): Row | null {
  const columns = COLLECTION_COLUMNS[collection];
  const row: Row = {};

  for (const [field, column] of Object.entries(columns)) {
    if (!Object.prototype.hasOwnProperty.call(record, field)) continue;
    if (RESOLVED_FIELDS[collection]?.includes(field)) continue;
    row[column] = record[field];
  }

  const id = typeof row.id === "string" ? row.id.trim() : "";
  if (!id) return null;
  if (UPSERT_COLLECTIONS.has(collection) && !UUID_PATTERN.test(id)) return null;

  // Attachments are inlined base64 payloads; keep rows bounded.
  if (typeof row.data_url === "string" && row.data_url.length > 1_000_000) return null;
  if (row.attachments !== undefined) {
    const size = JSON.stringify(row.attachments).length;
    if (size > 1_000_000) return null;
  }

  return row;
}

async function writeCollection(
  supabase: Supabase,
  collection: CollectionName,
  value: unknown,
  userId: string,
): Promise<WriteResult> {
  const table = COLLECTION_TABLES[collection];
  const records = Array.isArray(value) ? (value as Row[]) : [];
  const rows = records
    .map((record) => toRow(collection, record))
    .filter((row): row is Row => row !== null);

  if (UPSERT_COLLECTIONS.has(collection)) {
    if (!rows.length) return { ok: true };

    // Never re-attribute an existing proposal: `created_by` is only set for rows
    // this request is actually introducing.
    const { data: existing, error: readError } = await supabase.from(table).select("id");
    if (readError) {
      console.error(`[owner-workspace] reading ${table}:`, readError.message);
      return { ok: false, error: readError.message };
    }
    const known = new Set((existing ?? []).map((row) => String((row as Row).id)));
    const payload = rows.map((row) =>
      known.has(String(row.id)) ? row : { ...row, created_by: userId },
    );

    const { error } = await supabase.from(table).upsert(payload, { onConflict: "id" });
    if (error) {
      console.error(`[owner-workspace] upserting ${table}:`, error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }

  // Text-keyed operational tables are owned wholesale by the workspace, so the
  // simplest correct sync is delete-then-insert inside one request.
  const { error: clearError } = await supabase.from(table).delete().neq("id", "");
  if (clearError) {
    console.error(`[owner-workspace] clearing ${table}:`, clearError.message);
    return { ok: false, error: clearError.message };
  }
  if (rows.length) {
    const { error } = await supabase.from(table).insert(rows.map((row) => ({ ...row, created_by: userId })));
    if (error) {
      console.error(`[owner-workspace] inserting ${table}:`, error.message);
      return { ok: false, error: error.message };
    }
  }
  return { ok: true };
}

async function writeScalar(
  supabase: Supabase,
  payloadKey: ScalarName,
  value: unknown,
  userId: string,
): Promise<WriteResult> {
  const config = SCALAR_CONFIG[payloadKey];

  if (config.strategy === "state") {
    const { error } = await supabase
      .from("owner_workspace_state")
      .upsert({ key: config.storageKey, value: JSON.stringify(value), updated_by: userId }, { onConflict: "key" });
    return { ok: !error, ...(error ? { error: error.message } : null) };
  }

  if (config.strategy === "profit") {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) return { ok: false, error: "Value must be a non-negative number." };
    const { error } = await supabase
      .from("owner_profit_settings")
      .upsert(
        { key: config.storageKey, value: JSON.stringify(numeric), updated_by: userId },
        { onConflict: "key" },
      );
    return { ok: !error, ...(error ? { error: error.message } : null) };
  }

  const table = config.flagsTable;
  if (!table || !value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Expected a set of boolean flags." };
  }
  const rows = Object.entries(value as Record<string, unknown>)
    .filter(([, flag]) => typeof flag === "boolean")
    .slice(0, 64)
    .map(([key, flag]) => ({ key, value: flag, updated_by: userId }));
  if (!rows.length) return { ok: true };

  const { error } = await supabase.from(table).upsert(rows, { onConflict: "key" });
  return { ok: !error, ...(error ? { error: error.message } : null) };
}

export async function POST(request: Request) {
  const owner = await getOwner();
  if (!owner) {
    return NextResponse.json({ error: "Founder access is required." }, { status: 401 });
  }
  const { supabase, user } = owner;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Request body must be valid JSON." }, { status: 400 });
  }

  const record = (body ?? {}) as Record<string, unknown>;
  const key = typeof record.key === "string" ? record.key : "";
  const payloadKey = STORAGE_KEY_MAP[key];

  if (!payloadKey) {
    return NextResponse.json({ ok: false, error: `Unknown storage key: ${key || "(empty)"}` }, { status: 400 });
  }

  let result: WriteResult;
  if (isCollectionName(payloadKey)) {
    result = await writeCollection(supabase, payloadKey, record.value, user.id);
  } else if (isScalarName(payloadKey)) {
    result = await writeScalar(supabase, payloadKey, record.value, user.id);
  } else {
    result = { ok: false, error: `Unhandled storage key: ${key}` };
  }

  if (!result.ok) {
    return NextResponse.json(result, { status: result.error ? 400 : 500 });
  }
  return NextResponse.json(result);
}
