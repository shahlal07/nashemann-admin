"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X, Mail, Phone, MapPin, Globe, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";

type ApplicationStatus = "pending" | "approved" | "rejected";
type RequestedPlan = "per_order" | "monthly";

type Application = {
  id: string;
  business_name: string;
  business_type: string;
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  city: string;
  subdomain_preference: string;
  requested_plan: RequestedPlan;
  status: ApplicationStatus;
  submitted_at: string;
  message: string;
};

const PLAN_LABEL: Record<RequestedPlan, string> = { per_order: "Pay Per Order", monthly: "Monthly (Rs 7,000)" };

function ApplicationCard({
  app,
  onDecide,
  deciding,
}: {
  app: Application;
  onDecide: (app: Application, status: "approved" | "rejected") => void;
  deciding: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24, transition: { duration: 0.25 } }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="font-display text-base font-semibold text-[var(--text)]">{app.business_name}</h3>
              <Badge tone="violet">{app.business_type}</Badge>
              <Badge tone="neutral">{PLAN_LABEL[app.requested_plan]}</Badge>
            </div>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{app.message}</p>
          </div>
          <span className="shrink-0 text-xs text-[var(--text-faint)]">{formatDateTime(app.submitted_at)}</span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-[var(--text-muted)] sm:grid-cols-2">
          <p className="flex items-center gap-2">
            <Mail size={14} className="text-[var(--text-faint)]" /> {app.owner_email}
          </p>
          <p className="flex items-center gap-2">
            <Phone size={14} className="text-[var(--text-faint)]" /> {app.owner_phone}
          </p>
          <p className="flex items-center gap-2">
            <MapPin size={14} className="text-[var(--text-faint)]" /> {app.city}
          </p>
          <p className="flex items-center gap-2">
            <Globe size={14} className="text-[var(--text-faint)]" /> {app.subdomain_preference}.nashemann.com
          </p>
        </div>

        {app.status === "pending" ? (
          <div className="mt-5 flex items-center gap-2 border-t border-[var(--border)] pt-4">
            <Button variant="primary" size="sm" disabled={deciding} onClick={() => onDecide(app, "approved")}>
              <Check size={14} /> Approve &amp; create store
            </Button>
            <Button variant="danger" size="sm" disabled={deciding} onClick={() => onDecide(app, "rejected")}>
              <X size={14} /> Reject
            </Button>
          </div>
        ) : (
          <div className="mt-5 border-t border-[var(--border)] pt-4">
            <Badge tone={app.status === "approved" ? "success" : "danger"}>
              {app.status === "approved" ? "Approved — store provisioned" : "Rejected"}
            </Badge>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ApplicationStatus>("pending");
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("vendor_applications")
      .select(
        "id, business_name, business_type, owner_name, owner_email, owner_phone, city, subdomain_preference, requested_plan, status, submitted_at, message"
      )
      .order("submitted_at", { ascending: false })
      .then(({ data }) => {
        setApplications((data as Application[]) ?? []);
        setLoading(false);
      });
  }, []);

  async function decide(app: Application, status: "approved" | "rejected") {
    setError(null);
    setDecidingId(app.id);
    const supabase = createClient();

    if (status === "approved") {
      const { data: vendor, error: vendorError } = await supabase
        .from("vendors")
        .insert({
          name: app.business_name,
          subdomain: app.subdomain_preference,
          category: app.business_type,
          city: app.city,
          plan: app.requested_plan,
          status: "active",
        })
        .select("id")
        .single();

      if (vendorError || !vendor) {
        setError(
          vendorError?.code === "23505"
            ? `Subdomain "${app.subdomain_preference}" is already taken — resolve the conflict before approving.`
            : `Couldn't create the vendor: ${vendorError?.message ?? "unknown error"}`
        );
        setDecidingId(null);
        return;
      }

      const { error: adminError } = await supabase.from("vendor_admins").insert({
        vendor_id: vendor.id,
        name: app.owner_name,
        email: app.owner_email,
        role: "owner",
      });

      if (adminError) {
        setError(`Vendor created, but couldn't add the owner admin: ${adminError.message}`);
      }
    }

    const { error: updateError } = await supabase
      .from("vendor_applications")
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq("id", app.id);

    if (updateError) {
      setError(`Couldn't update the application status: ${updateError.message}`);
      setDecidingId(null);
      return;
    }

    setApplications((prev) => prev.map((a) => (a.id === app.id ? { ...a, status } : a)));
    setDecidingId(null);
  }

  const filtered = applications.filter((a) => a.status === filter);
  const counts = {
    pending: applications.filter((a) => a.status === "pending").length,
    approved: applications.filter((a) => a.status === "approved").length,
    rejected: applications.filter((a) => a.status === "rejected").length,
  };

  return (
    <div>
      <PageHeader
        title="Vendor applications"
        description="Every small business that's applied for a Nashemann store — review, approve, and provision in one click."
      />

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-[var(--radius-sm)] border border-[rgba(251,113,133,0.3)] bg-[var(--danger-bg)] px-3.5 py-2.5 text-sm text-[var(--danger)]">
          <AlertCircle size={15} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      <div className="mb-5 flex gap-2">
        {(["pending", "approved", "rejected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              filter === f
                ? "text-black"
                : "border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
            style={filter === f ? { background: "var(--accent-gradient)" } : undefined}
          >
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filtered.map((app) => (
            <ApplicationCard key={app.id} app={app} onDecide={decide} deciding={decidingId === app.id} />
          ))}
        </AnimatePresence>
        {!loading && filtered.length === 0 && (
          <Card className="py-12 text-center text-sm text-[var(--text-faint)]">Nothing here.</Card>
        )}
      </div>
    </div>
  );
}
