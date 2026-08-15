"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, ShieldOff, KeyRound, Mail, QrCode } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ImageUpload } from "@/components/public/ImageUpload";
import { TiltCard } from "@/components/public/TiltCard";
import { createClient } from "@/lib/supabase/client";
import { logAccountSecurityEventAction } from "./actions";

const inputClass =
  "w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none transition-colors focus:border-[var(--accent-violet)] accent-ring";
const labelClass = "mb-1.5 block text-xs font-medium text-[var(--text-muted)]";

export function AccountClient({
  userId,
  initialName,
  initialEmail,
  initialAvatarUrl,
}: {
  userId: string;
  initialName: string;
  initialEmail: string;
  initialAvatarUrl: string | null;
}) {
  const supabase = createClient();

  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatar, setAvatar] = useState<string | null>(initialAvatarUrl);
  const [uploading, setUploading] = useState(false);
  const [savingCreds, setSavingCreds] = useState(false);
  const [savedCreds, setSavedCreds] = useState(false);
  const [credsError, setCredsError] = useState<string | null>(null);
  const [credsNotice, setCredsNotice] = useState<string | null>(null);

  const [mfaStatus, setMfaStatus] = useState<"loading" | "disabled" | "enrolling" | "enabled">("loading");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [mfaError, setMfaError] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.mfa.listFactors();
      const verifiedTotp = data?.totp?.find((f) => f.status === "verified");
      if (verifiedTotp) {
        setFactorId(verifiedTotp.id);
        setMfaStatus("enabled");
      } else {
        setMfaStatus("disabled");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAvatarSelected(file: File | null, previewUrl: string | null) {
    if (!file) {
      setAvatar(null);
      return;
    }
    setAvatar(previewUrl);
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("staff-avatars").upload(path, file, {
        upsert: true,
      });
      if (uploadError) throw uploadError;
      const { data: publicUrl } = supabase.storage.from("staff-avatars").getPublicUrl(path);
      await supabase.from("staff_profiles").update({ avatar_url: publicUrl.publicUrl }).eq("id", userId);
      setAvatar(publicUrl.publicUrl);
    } catch {
      setCredsError("Avatar upload failed. Try a smaller image.");
    } finally {
      setUploading(false);
    }
  }

  async function saveCreds(e: React.FormEvent) {
    e.preventDefault();
    setCredsError(null);
    setCredsNotice(null);

    if (password && password !== confirmPassword) {
      setCredsError("Passwords don't match.");
      return;
    }

    setSavingCreds(true);
    try {
      if (name !== initialName) {
        const { error } = await supabase.from("staff_profiles").update({ name }).eq("id", userId);
        if (error) throw error;
        await logAccountSecurityEventAction("staff_profile_updated", `Name changed to ${name}`);
      }

      if (email !== initialEmail) {
        const { error } = await supabase.auth.updateUser({ email });
        if (error) throw error;
        setCredsNotice("Check your inbox to confirm the new email address.");
        await logAccountSecurityEventAction("staff_email_change_requested", `Requested change to ${email}`);
      }

      if (password) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setPassword("");
        setConfirmPassword("");
        await logAccountSecurityEventAction("staff_password_changed", "Password changed from account settings");
      }

      setSavedCreds(true);
      setTimeout(() => setSavedCreds(false), 1800);
    } catch (err) {
      setCredsError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSavingCreds(false);
    }
  }

  async function startEnroll() {
    setMfaError("");
    setMfaBusy(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error || !data) throw error ?? new Error("Failed to start enrollment");
      setFactorId(data.id);
      setQrSvg(data.totp.qr_code);
      setSecret(data.totp.secret);
      setMfaStatus("enrolling");
    } catch (err) {
      setMfaError(err instanceof Error ? err.message : "Failed to start 2FA enrollment");
    } finally {
      setMfaBusy(false);
    }
  }

  async function verifyMfa(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6 || !factorId) {
      setMfaError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setMfaBusy(true);
    setMfaError("");
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError || !challenge) throw challengeError ?? new Error("Challenge failed");
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (verifyError) throw verifyError;
      setMfaStatus("enabled");
      setCode("");
      await logAccountSecurityEventAction("staff_2fa_enabled", "Two-factor authentication enabled");
    } catch (err) {
      setMfaError(err instanceof Error ? err.message : "Invalid code, try again.");
    } finally {
      setMfaBusy(false);
    }
  }

  async function disableMfa() {
    if (!factorId) return;
    setMfaBusy(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      setMfaStatus("disabled");
      setFactorId(null);
      await logAccountSecurityEventAction("staff_2fa_disabled", "Two-factor authentication disabled");
    } catch (err) {
      setMfaError(err instanceof Error ? err.message : "Failed to disable 2FA");
    } finally {
      setMfaBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="My account" description="Your own super-admin login — separate from the platform's public identity." />

      <div className="space-y-4">
        <Card>
          <CardHeader title="Profile" />
          <div className="flex flex-col items-start gap-6 sm:flex-row">
            <div className="shrink-0">
              <TiltCard strength={10} className="!rounded-full p-0" glare>
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full" style={{ background: "var(--accent-gradient)" }}>
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage public URL
                    <img src={avatar} alt="Your avatar" className="h-full w-full object-cover" style={{ transform: "translateZ(20px)" }} />
                  ) : (
                    <span className="text-2xl font-bold text-black" style={{ transform: "translateZ(20px)" }}>
                      {name
                        .split(" ")
                        .map((p) => p[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase() || "SA"}
                    </span>
                  )}
                </div>
              </TiltCard>
              <div className="mt-3 w-24">
                <ImageUpload label="" hint={uploading ? "Uploading…" : "3D logo/avatar"} onFileSelected={handleAvatarSelected} />
              </div>
            </div>

            <form onSubmit={saveCreds} className="flex-1 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className={labelClass}>Full name</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
                </label>
                <label className="block">
                  <span className={labelClass}>
                    <Mail size={11} className="mr-1 inline" /> Login email
                  </span>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className={inputClass} />
                </label>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className={labelClass}>
                    <KeyRound size={11} className="mr-1 inline" /> New password
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave blank to keep current"
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Confirm new password</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Leave blank to keep current"
                    className={inputClass}
                  />
                </label>
              </div>
              {credsError && <p className="text-xs text-[var(--danger)]">{credsError}</p>}
              {credsNotice && <p className="text-xs text-[var(--info)]">{credsNotice}</p>}
              <Button type="submit" variant="primary" disabled={savingCreds}>
                {savingCreds ? "Saving…" : savedCreds ? "Saved ✓" : "Save changes"}
              </Button>
            </form>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Two-factor authentication"
            description="Require an authenticator app code at login, on top of your password."
            action={
              mfaStatus === "enabled" ? (
                <Badge tone="success" dot>
                  Enabled
                </Badge>
              ) : mfaStatus === "loading" ? (
                <Badge tone="neutral" dot>
                  Loading…
                </Badge>
              ) : (
                <Badge tone="neutral" dot>
                  Disabled
                </Badge>
              )
            }
          />

          {mfaStatus === "disabled" && (
            <Button variant="primary" onClick={startEnroll} disabled={mfaBusy}>
              <ShieldCheck size={15} /> Enable 2FA
            </Button>
          )}

          {mfaStatus === "enrolling" && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 gap-6 sm:grid-cols-[auto_1fr]">
              <div className="flex h-32 w-32 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-white p-3">
                {qrSvg ? (
                  <div className="h-full w-full [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
                ) : (
                  <QrCode size={96} className="text-black" strokeWidth={1} />
                )}
              </div>
              <form onSubmit={verifyMfa} className="space-y-3">
                <p className="text-xs text-[var(--text-muted)]">
                  Scan this with Google Authenticator, 1Password, or any TOTP app, then enter the 6-digit code it shows.
                </p>
                {secret && (
                  <p className="rounded-[var(--radius-sm)] bg-[var(--surface)] px-3 py-2 font-mono text-xs text-[var(--text-faint)]">
                    Secret: {secret}
                  </p>
                )}
                <label className="block max-w-[10rem]">
                  <span className={labelClass}>6-digit code</span>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className={`${inputClass} text-center font-mono tracking-[0.3em]`}
                  />
                </label>
                {mfaError && <p className="text-xs text-[var(--danger)]">{mfaError}</p>}
                <div className="flex gap-2">
                  <Button type="submit" variant="primary" disabled={mfaBusy}>
                    Verify &amp; enable
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setMfaStatus("disabled")}>
                    Cancel
                  </Button>
                </div>
              </form>
            </motion.div>
          )}

          {mfaStatus === "enabled" && (
            <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] p-4">
              <p className="text-sm text-[var(--text-muted)]">Your account now requires a code at every login.</p>
              <Button variant="danger" size="sm" onClick={disableMfa} disabled={mfaBusy}>
                <ShieldOff size={13} /> Disable
              </Button>
            </div>
          )}
          {mfaStatus === "enabled" && mfaError && <p className="mt-2 text-xs text-[var(--danger)]">{mfaError}</p>}
        </Card>
      </div>
    </div>
  );
}
