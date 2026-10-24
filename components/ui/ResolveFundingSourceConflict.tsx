"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wrench } from "lucide-react";

import { resolveFundingSourceConflict } from "@/lib/actions/funding.actions";

interface ResolveFundingSourceConflictProps {
  bankRowId: string;
  accountName: string;
  accountMask: string | null;
}

export default function ResolveFundingSourceConflict({
  bankRowId,
  accountName,
  accountMask,
}: ResolveFundingSourceConflictProps) {
  const router = useRouter();
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState("");

  const resolveConflict = async () => {
    const accountDescription = accountMask
      ? `${accountName} ending in ${accountMask}`
      : accountName;
    const confirmed = window.confirm(
      `Only continue if Dwolla confirms that its existing funding source belongs to ${accountDescription}. This keeps the source on this account and clears its reference from the other linked account so it can be set up separately. Continue?`,
    );
    if (!confirmed) return;

    setIsResolving(true);
    setError("");
    try {
      await resolveFundingSourceConflict(bankRowId);
      router.refresh();
    } catch (resolutionError) {
      console.error(
        "Failed to resolve bank funding-source conflict:",
        resolutionError,
      );
      setError(
        resolutionError instanceof Error
          ? resolutionError.message
          : "Could not resolve the funding-source conflict.",
      );
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={resolveConflict}
        disabled={isResolving}
        className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-50 disabled:cursor-wait disabled:opacity-60"
      >
        <Wrench size={14} aria-hidden="true" />
        {isResolving ? "Resolving..." : "Keep source for this account"}
      </button>
      {error && (
        <p className="max-w-sm text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
