"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { DwollaBalanceResult } from "@/lib/actions/dwolla.actions";
import { createDwollaBalanceTransaction } from "@/lib/actions/transactions.action";

interface DwollaBalanceTransferFieldsProps {
  balance: DwollaBalanceResult;
  destinations: {
    id: string;
    label: string;
    fundingSourceReady: boolean;
    fundingSourceConflict: boolean;
  }[];
}

interface TransferRequest {
  destinationBankRowId: string;
  destinationLabel: string;
  amount: string;
  note?: string;
  idempotencyKey: string;
}

const formatUsd = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

export default function DwollaBalanceTransferFields({
  balance,
  destinations,
}: DwollaBalanceTransferFieldsProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const eligibleDestinations = destinations.filter(
    (destination) =>
      destination.fundingSourceReady && !destination.fundingSourceConflict,
  );
  const [destinationBankRowId, setDestinationBankRowId] = useState("");
  const [confirmation, setConfirmation] = useState<TransferRequest | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const destination = eligibleDestinations.find(
      (item) => item.id === destinationBankRowId,
    );
    if (!destination) {
      setErrorMessage("Choose a linked bank account that is ready for transfers.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    setConfirmation({
      destinationBankRowId: destination.id,
      destinationLabel: destination.label,
      amount: String(formData.get("amount") ?? ""),
      note: String(formData.get("note") ?? "").trim() || undefined,
      idempotencyKey: crypto.randomUUID(),
    });
  };

  const confirmTransfer = async () => {
    if (!confirmation || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const result = await createDwollaBalanceTransaction(confirmation);
      setSuccessMessage(result.message);
      setConfirmation(null);
      formRef.current?.reset();
      setDestinationBankRowId("");
      router.refresh();
    } catch (error) {
      console.error("Dwolla Balance transfer failed:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The transfer could not be completed. Please try again.",
      );
      setConfirmation(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="border-b border-gray-100 py-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Transfer from Dwolla Balance
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Move available funds to one of your own linked bank accounts.
        </p>
      </div>

      {balance.status === "available" ? (
        <p className="mb-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Available Dwolla Balance:{" "}
          <strong>{formatUsd(balance.balance.available)}</strong>
        </p>
      ) : (
        <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {balance.status === "not_configured"
            ? "Set up your Dwolla customer account before transferring from your balance."
            : balance.status === "not_available"
              ? "A Dwolla Balance is not available for this customer."
              : "Your Dwolla Balance could not be loaded. Try again later."}
        </p>
      )}

      {eligibleDestinations.length === 0 && (
        <p className="mb-4 text-sm text-gray-600">
          No linked destination bank is ready for Dwolla transfers.{" "}
          <Link
            href="/my-banks"
            className="font-semibold text-blue-700 underline underline-offset-2"
          >
            Set up a bank in My Banks
          </Link>
          .
        </p>
      )}

      <form ref={formRef} onSubmit={handleSubmit}>
        <fieldset
          disabled={
            balance.status !== "available" ||
            eligibleDestinations.length === 0 ||
            Boolean(confirmation) ||
            isSubmitting
          }
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="dwolla-destination"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Destination bank account
            </label>
            <select
              id="dwolla-destination"
              name="destinationBankRowId"
              required
              value={destinationBankRowId}
              onChange={(event) =>
                setDestinationBankRowId(event.currentTarget.value)
              }
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:text-gray-400"
            >
              <option value="" disabled>
                {eligibleDestinations.length > 0
                  ? "Choose your destination account"
                  : "No eligible bank account"}
              </option>
              {eligibleDestinations.map((destination) => (
                <option key={destination.id} value={destination.id}>
                  {destination.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="dwolla-transfer-amount"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                $
              </span>
              <input
                id="dwolla-transfer-amount"
                name="amount"
                type="number"
                min="0.01"
                max={
                  balance.status === "available"
                    ? Math.min(balance.balance.available, 1_000_000)
                    : undefined
                }
                step="0.01"
                inputMode="decimal"
                required
                placeholder="0.00"
                className="h-11 w-full rounded-lg border border-gray-200 pl-8 pr-3 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="dwolla-transfer-note"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Note (optional)
            </label>
            <input
              id="dwolla-transfer-note"
              name="note"
              type="text"
              maxLength={100}
              placeholder="Add a note"
              className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </fieldset>

        {errorMessage && (
          <p
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {errorMessage}
          </p>
        )}

        {successMessage && (
          <p
            className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
            role="status"
          >
            {successMessage}
          </p>
        )}

        {confirmation ? (
          <div
            className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4"
            role="alertdialog"
            aria-labelledby="dwolla-confirm-heading"
            aria-describedby="dwolla-confirm-description"
          >
            <h3
              id="dwolla-confirm-heading"
              className="font-semibold text-gray-900"
            >
              Confirm transfer
            </h3>
            <p
              id="dwolla-confirm-description"
              className="mt-1 text-sm text-gray-600"
            >
              Transfer {formatUsd(Number(confirmation.amount))} from your
              Dwolla Balance to {confirmation.destinationLabel}? Transfers may
              take time to settle.
            </p>
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setConfirmation(null)}
                className="h-10 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={confirmTransfer}
                className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
              >
                {isSubmitting ? "Submitting transfer..." : "Confirm transfer"}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="submit"
            disabled={
              balance.status !== "available" ||
              eligibleDestinations.length === 0 ||
              !destinationBankRowId
            }
            className="mt-4 h-11 w-full rounded-md bg-gradient-to-r from-blue-600 to-blue-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:from-blue-700 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Transfer to my bank
          </button>
        )}
      </form>
    </section>
  );
}
