"use client";

import { useState } from "react";
import { CheckCircle2, Landmark } from "lucide-react";

import { setupDwollaFundingSource } from "@/lib/actions/funding.actions";
import { US_STATES } from "@/lib/us-states";

interface FundingSourceSetupProps {
  bankRowId: string;
  onSetupComplete?: () => void;
}

export default function FundingSourceSetup({
  bankRowId,
  onSetupComplete,
}: FundingSourceSetupProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [state, setState] = useState("");
  const [ssn, setSsn] = useState("");
  const [requiresSsn, setRequiresSsn] = useState(false);
  const [message, setMessage] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState("");

  const setupFundingSource = async () => {
    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const result = await setupDwollaFundingSource(
        bankRowId,
        state.trim(),
        requiresSsn ? ssn : undefined,
      );
      setMessage(result.message);
      if (result.success) {
        setIsReady(true);
        setSsn("");
        onSetupComplete?.();
      } else if (result.requiresSsn) {
        setRequiresSsn(true);
      }
    } catch (setupError) {
      setSsn("");
      setError(
        setupError instanceof Error
          ? setupError.message
          : "Could not set up this bank account for transfers.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isReady) {
    return (
      <p className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
        <CheckCircle2 size={15} aria-hidden="true" />
        {message}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block max-w-xs">
        <span className="text-xs text-gray-500">State (required)</span>
        <select
          value={state}
          onChange={(event) => setState(event.currentTarget.value)}
          required
          autoComplete="address-level1"
          className="mt-1 min-h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none focus:border-blue-400"
        >
          <option value="" disabled>
            Select a state
          </option>
          {US_STATES.map(({ code, name }) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </label>
      {requiresSsn && (
        <label className="block max-w-xs">
          <span className="text-xs text-gray-500">
            Social Security number (required by Dwolla)
          </span>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={ssn}
            onChange={(event) =>
              setSsn(event.currentTarget.value.replace(/\D/g, "").slice(0, 9))
            }
            required
            maxLength={9}
            pattern="\d{9}"
            className="mt-1 min-h-9 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-800 outline-none focus:border-blue-400"
            placeholder="9 digits"
          />
          <span className="mt-1 block text-xs text-gray-500">
            Used to create your Dwolla customer profile; it is not saved in
            your profile.
          </span>
        </label>
      )}
      <button
        type="button"
        onClick={setupFundingSource}
        disabled={
          isSubmitting || !state.trim() || (requiresSsn && ssn.length !== 9)
        }
        className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-wait disabled:opacity-60"
      >
        <Landmark size={15} aria-hidden="true" />
        {isSubmitting ? "Setting up..." : "Set up transfers"}
      </button>
      {error && (
        <p className="max-w-sm text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
