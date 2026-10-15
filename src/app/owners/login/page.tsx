import Link from "next/link";
import { AlertCircle, ArrowRight, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { ownerLoginAction } from "./actions";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#0b101a] px-3.5 py-3.5 text-sm text-[#e8ecf4] outline-none transition placeholder:text-[#5f6b80] focus:border-[rgba(216,180,90,0.6)] focus:ring-4 focus:ring-[rgba(216,180,90,0.08)]";

export default async function OwnerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const showError = Boolean(params.error);

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#0a0e16] px-5 py-12 text-[#e8ecf4]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(1000px_600px_at_70%_15%,rgba(216,180,90,0.1),transparent_55%),radial-gradient(800px_600px_at_15%_85%,rgba(61,214,192,0.07),transparent_55%)]" />
      <section className="relative w-full max-w-[460px] animate-[fadeIn_.5s_ease-out]">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-5 grid size-[58px] place-items-center rounded-2xl bg-gradient-to-br from-[#f0d492] to-[#b38b35] text-2xl font-extrabold text-[#151108] shadow-[0_12px_34px_rgba(216,180,90,0.25)]">N</span>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d8b45a]">Private owner workspace</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#f2f4f8]">Nashemann <span className="block bg-gradient-to-r from-[#f0d492] to-[#d8b45a] bg-clip-text text-transparent">Co-Founder Platform</span></h1>
          <p className="mt-3 text-sm leading-6 text-[#9aa5b8]">Sign in with the individual username and password assigned by your Super Admin.</p>
        </div>

        <div className="rounded-[22px] border border-white/[0.09] bg-white/[0.035] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.38)] backdrop-blur-xl sm:p-8">
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-[rgba(61,214,192,0.16)] bg-[rgba(61,214,192,0.055)] px-3.5 py-3">
            <ShieldCheck size={18} className="shrink-0 text-[#3dd6c0]" />
            <p className="text-xs leading-5 text-[#aeb9c9]">Authorized access only. Your workspace and data are limited by your assigned permissions.</p>
          </div>

          <form action={ownerLoginAction} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-[#b8c1d0]">Username</span>
              <span className="relative block">
                <UserRound size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6f7b90]" />
                <input required name="username" type="text" autoComplete="username" minLength={3} maxLength={30} pattern="[a-zA-Z][a-zA-Z0-9._-]{2,29}" placeholder="your.username" className={inputClass + " pl-10"} />
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-[#b8c1d0]">Password</span>
              <span className="relative block">
                <LockKeyhole size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6f7b90]" />
                <input required name="password" type="password" autoComplete="current-password" placeholder="Enter your password" className={inputClass + " pl-10"} />
              </span>
            </label>

            {showError && (
              <div role="alert" className="flex items-start gap-2 rounded-xl border border-[rgba(229,100,108,0.3)] bg-[rgba(229,100,108,0.1)] px-3.5 py-3 text-sm text-[#ff9ba1]">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{params.error === "unavailable" ? "Owner sign-in is temporarily unavailable. Please try again later." : "Unable to sign in with those credentials."}</span>
              </div>
            )}

            <button type="submit" className="group mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f0d492] to-[#d8b45a] px-4 py-3.5 text-sm font-bold text-[#151108] shadow-[0_8px_24px_rgba(216,180,90,0.16)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(216,180,90,0.25)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0d492]">
              Sign in to owner workspace <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </button>
          </form>

          <div className="mt-6 border-t border-white/[0.07] pt-5 text-center">
            <p className="text-xs text-[#8994a8]">No owner credentials yet? Contact your Super Admin.</p>
            <p className="mt-3 text-xs text-[#8994a8]">Staff sign-in is separate. <Link href="/login" className="font-semibold text-[#f0d492] underline decoration-[rgba(216,180,90,0.4)] underline-offset-4 hover:text-white">Go to staff login</Link></p>
          </div>
        </div>
        <p className="mt-5 text-center text-[10px] tracking-wide text-[#5f6b80]">SUPABASE AUTHENTICATION <span className="px-1.5 text-[#d8b45a]">·</span> PRIVATE SESSION <span className="px-1.5 text-[#d8b45a]">·</span> ROLE-BASED ACCESS</p>
      </section>
    </main>
  );
}
