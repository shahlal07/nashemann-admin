"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CheckCircle2, Layers, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ImageUpload } from "@/components/public/ImageUpload";
import { TiltCard } from "@/components/public/TiltCard";
import { createVendorStoreAction } from "../actions";

const inputClass =
  "w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text-faint)] focus:border-[var(--accent-violet)] accent-ring";

const labelClass = "mb-1.5 block text-xs font-medium text-[var(--text-muted)]";

type CategorySchema = {
  category: string;
  model: "weight_based" | "variant_based" | "simple";
  fields: string[];
  variant_example: string | null;
  note: string;
};

export default function CreateStorePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [createdVendorId, setCreatedVendorId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");

  const [accentFrom, setAccentFrom] = useState("#8b6bff");
  const [accentTo, setAccentTo] = useState("#ffb020");
  const [logoEmoji] = useState("🏪");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [plan, setPlan] = useState<"per_order" | "monthly">("per_order");
  const [category, setCategory] = useState("");
  const [schemas, setSchemas] = useState<CategorySchema[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("category_product_schemas")
      .select("category, model, fields, variant_example, note")
      .then(({ data }) => setSchemas((data as CategorySchema[]) ?? []));
  }, []);

  const schema = schemas.find((s) => s.category === category) ?? null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const supabase = createClient();

    let logoUrl: string | null = null;
    if (logoFile) {
      const ext = logoFile.name.split(".").pop() ?? "png";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("vendor-logos").upload(path, logoFile);
      if (uploadError) {
        setError(`Couldn't upload the logo: ${uploadError.message}`);
        setSubmitting(false);
        return;
      }
      logoUrl = supabase.storage.from("vendor-logos").getPublicUrl(path).data.publicUrl;
    }

    try {
      const vendorId = await createVendorStoreAction({
        businessName,
        subdomain,
        category,
        city,
        plan,
        themeAccentFrom: accentFrom,
        themeAccentTo: accentTo,
        themeLogoEmoji: logoEmoji,
        themeLogoUrl: logoUrl,
        ownerName,
        ownerEmail,
        ownerPassword: tempPassword,
      });
      setCreatedVendorId(vendorId);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create the store.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ background: "var(--accent-gradient)" }}
        >
          <CheckCircle2 size={30} className="text-black" />
        </div>
        <h1 className="font-display text-xl font-semibold text-[var(--text)]">Store created</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {businessName} is now live on Nashemann&apos;s infrastructure. Relay the temporary password
          {tempPassword ? ` (${tempPassword})` : ""} to {ownerName} directly — it isn&apos;t stored here.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="secondary" onClick={() => router.push(createdVendorId ? `/vendors/${createdVendorId}` : "/vendors")}>
            View vendor
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setDone(false);
              setBusinessName("");
              setCity("");
              setSubdomain("");
              setOwnerName("");
              setOwnerEmail("");
              setTempPassword("");
              setCategory("");
              setLogoFile(null);
              setLogoPreview(null);
              setCreatedVendorId(null);
            }}
          >
            Create another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Create a new store"
        description="Provision a vendor directly — real owner account, seeded storefront, ready in seconds."
      />

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-[var(--radius-sm)] border border-[rgba(251,113,133,0.3)] bg-[var(--danger-bg)] px-3.5 py-2.5 text-sm text-[var(--danger)]">
          <AlertCircle size={15} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Business details" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className={labelClass}>Business name</span>
                <input
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Sabz Basket"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Category</span>
                <select required value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                  <option value="" disabled>
                    Choose a category
                  </option>
                  {schemas.map((s) => (
                    <option key={s.category} value={s.category}>
                      {s.category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={labelClass}>City</span>
                <input required value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Lahore" className={inputClass} />
              </label>
              <label className="block sm:col-span-2">
                <span className={labelClass}>Subdomain</span>
                <div className="flex items-center overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] focus-within:border-[var(--accent-violet)]">
                  <input
                    required
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                    placeholder="sabz-basket"
                    className="w-full bg-transparent px-3.5 py-2.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]"
                  />
                  <span className="shrink-0 pr-3.5 text-sm text-[var(--text-faint)]">.nashemann.store</span>
                </div>
              </label>
            </div>
          </Card>

          <Card>
            <CardHeader title="Owner account" description="A real login is created immediately — no email invite flow." />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={labelClass}>Owner name</span>
                <input required value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className={inputClass} />
              </label>
              <label className="block">
                <span className={labelClass}>Owner email</span>
                <input required type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} className={inputClass} />
              </label>
              <label className="block sm:col-span-2">
                <span className={labelClass}>Temporary password</span>
                <input
                  required
                  minLength={8}
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  className={inputClass}
                  placeholder="Relay this to the vendor directly"
                />
              </label>
            </div>
          </Card>

          <Card>
            <CardHeader title="Pricing plan" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(
                [
                  { id: "per_order" as const, title: "Pay Per Order", desc: "Customer pays Rs 15/order. No bill to the vendor." },
                  { id: "monthly" as const, title: "Monthly", desc: "Vendor pays Rs 7,000/month flat, any order volume." },
                ]
              ).map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setPlan(p.id)}
                  className={`rounded-[var(--radius-md)] border p-4 text-left transition-colors ${
                    plan === p.id ? "border-[var(--accent-violet)]" : "border-[var(--border)] hover:border-[var(--border-strong)]"
                  }`}
                  style={plan === p.id ? { background: "var(--accent-gradient-soft)" } : undefined}
                >
                  <p className="text-sm font-semibold text-[var(--text)]">{p.title}</p>
                  <p className="mt-1 text-xs text-[var(--text-faint)]">{p.desc}</p>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Starter theme" description="The vendor can customize this later from their own panel." />
            <div className="flex flex-wrap items-end gap-4">
              <label className="block">
                <span className={labelClass}>Accent — from</span>
                <input type="color" value={accentFrom} onChange={(e) => setAccentFrom(e.target.value)} className="h-10 w-16 cursor-pointer rounded-md border border-[var(--border)] bg-transparent" />
              </label>
              <label className="block">
                <span className={labelClass}>Accent — to</span>
                <input type="color" value={accentTo} onChange={(e) => setAccentTo(e.target.value)} className="h-10 w-16 cursor-pointer rounded-md border border-[var(--border)] bg-transparent" />
              </label>
            </div>
            <div className="mt-4">
              <ImageUpload
                label="3D logo"
                hint="Upload a logo mark — it renders with a tilting 3D preview, same treatment as the rest of the platform."
                onFileSelected={(file, url) => {
                  setLogoFile(file);
                  setLogoPreview(url);
                }}
              />
            </div>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => router.push("/vendors")}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? "Creating store…" : "Create store + owner account"}
            </Button>
          </div>
        </div>

        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {schema && (
            <Card>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
                <Layers size={13} /> Product settings for {category}
              </p>
              <p className="text-xs text-[var(--text-faint)]">{schema.note}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {schema.fields.map((f) => (
                  <span key={f} className="rounded-full bg-[var(--surface-hover)] px-2 py-0.5 text-[0.65rem] text-[var(--text-muted)]">
                    {f}
                  </span>
                ))}
              </div>
              {schema.variant_example && (
                <p className="mt-3 border-t border-[var(--border)] pt-3 text-[0.7rem] text-[var(--text-faint)]">
                  e.g. <span className="text-[var(--text-muted)]">{schema.variant_example}</span>
                </p>
              )}
            </Card>
          )}

          <Card>
            <p className="mb-3 text-xs font-medium text-[var(--text-muted)]">Live preview</p>
            <TiltCard strength={10} className="overflow-hidden !rounded-[var(--radius-md)] !border-[var(--border)]" glare>
              <div
                className="flex h-28 items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${accentFrom}, ${accentTo})` }}
              >
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                  <img
                    src={logoPreview}
                    alt="Store logo"
                    className="h-16 w-16 rounded-2xl border-2 border-white/40 object-cover shadow-lg"
                    style={{ transform: "translateZ(30px)" }}
                  />
                ) : (
                  <span className="text-4xl" style={{ transform: "translateZ(30px)" }}>
                    {logoEmoji}
                  </span>
                )}
              </div>
              <div className="space-y-3 bg-[var(--surface-solid)] p-4">
                <div
                  className="inline-block rounded-md px-3 py-1.5 text-xs font-semibold text-white"
                  style={{ background: `linear-gradient(135deg, ${accentFrom}, ${accentTo})` }}
                >
                  Shop now
                </div>
                <p className="text-xs text-[var(--text-faint)]">
                  {plan === "per_order" ? "Rs 15 platform fee at checkout" : "Rs 7,000/month, unlimited orders"}
                </p>
              </div>
            </TiltCard>
          </Card>
        </div>
      </form>
    </div>
  );
}
