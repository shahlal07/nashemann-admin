import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-5 py-16 text-center">
      <Compass size={26} className="text-[var(--text-faint)]" />
      <h1 className="font-display mt-4 text-lg font-semibold text-[var(--text)]">Page not found</h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">This page doesn&apos;t exist or has moved.</p>
      <Link href="/" className="mt-5">
        <Button variant="primary" size="sm">
          Back to dashboard
        </Button>
      </Link>
    </div>
  );
}
