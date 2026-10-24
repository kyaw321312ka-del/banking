"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, CreditCard, Landmark } from "lucide-react";

import FundingSourceSetup from "@/components/ui/FundingSourceSetup";
import { createTransaction } from "@/lib/actions/transactions.action";

interface PaymentTransferFieldsProps {
  accounts: {
    id: string;
    bankRowId: string;
    label: string;
    fundingSourceReady: boolean;
    fundingSourceConflict: boolean;
  }[];
}

interface TransferRequest {
  senderAccountId: string;
  recipientEmail: string;
  recipientShareableId: string;
  amount: string;
  note?: string;
  idempotencyKey: string;
}

const PaymentTransferFields = ({ accounts }: PaymentTransferFieldsProps) => {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [confirmation, setConfirmation] = useState<TransferRequest | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [readyAccountIds, setReadyAccountIds] = useState(
    () =>
      new Set(
        accounts
          .filter((account) => account.fundingSourceReady)
          .map((account) => account.id),
      ),
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const selectedAccount = accounts.find(
    (account) => account.id === selectedAccountId,
  );
  const selectedSourceReady =
    selectedAccount !== undefined && readyAccountIds.has(selectedAccount.id);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const formData = new FormData(event.currentTarget);
    setConfirmation({
      senderAccountId: String(formData.get("senderAccountId") ?? ""),
      recipientEmail: String(formData.get("recipientEmail") ?? ""),
      recipientShareableId: String(
        formData.get("recipientShareableId") ?? "",
      ),
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
      const result = await createTransaction(confirmation);
      setSuccessMessage(result.message);
      setConfirmation(null);
      formRef.current?.reset();
      setSelectedAccountId("");
      router.refresh();
    } catch (error) {
      console.error("Payment transfer failed:", error);
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
    <form ref={formRef} onSubmit={handleSubmit}>
      <fieldset disabled={Boolean(confirmation) || isSubmitting}>
        <div className="grid grid-cols-1 border-b border-gray-100 py-5 md:grid-cols-[minmax(0,0.55fr)_minmax(0,1fr)] md:gap-8">
          <div>
            <label
              htmlFor="source-account"
              className="text-sm font-medium text-gray-700"
            >
              Select Source Bank
            </label>
            <p className="mt-1 max-w-xs text-sm leading-5 text-gray-500">
              Select the bank account you want to transfer funds from
            </p>
          </div>
          <div className="mt-3 md:mt-0">
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
              <CreditCard
                size={18}
                className="shrink-0 text-blue-600"
                aria-hidden="true"
              />
              <select
                id="source-account"
                name="senderAccountId"
                required
                value={selectedAccountId}
                disabled={accounts.length === 0}
                onChange={(event) =>
                  setSelectedAccountId(event.currentTarget.value)
                }
                className="h-11 min-w-0 flex-1 appearance-none bg-transparent text-sm text-gray-800 outline-none disabled:text-gray-400"
              >
                <option value="" disabled>
                  {accounts.length > 0
                    ? "Choose a linked bank account"
                    : "No linked bank accounts"}
                </option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none shrink-0 text-gray-400"
                aria-hidden="true"
              />
            </div>
            {selectedAccount && !selectedSourceReady && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                {selectedAccount.fundingSourceConflict ? (
                  <p className="text-sm text-amber-900">
                    This account shares a Dwolla funding source with another
                    linked bank account. Contact support to verify the account
                    mapping before transferring.
                  </p>
                ) : (
                  <>
                    <p className="mb-2 text-sm text-amber-900">
                      This account needs Dwolla setup before it can send
                      transfers.
                    </p>
                    <FundingSourceSetup
                      bankRowId={selectedAccount.bankRowId}
                      onSetupComplete={() => {
                        setReadyAccountIds((current) =>
                          new Set(current).add(selectedAccount.id),
                        );
                      }}
                    />
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 border-b border-gray-100 py-5 md:grid-cols-[minmax(0,0.55fr)_minmax(0,1fr)] md:gap-8">
          <div>
            <label
              htmlFor="transfer-note"
              className="text-sm font-medium text-gray-700"
            >
              Transfer Note (Optional)
            </label>
            <p className="mt-1 max-w-xs text-sm leading-5 text-gray-500">
              Please provide any additional information or instructions related
              to the transfer
            </p>
          </div>
          <textarea
            id="transfer-note"
            name="note"
            rows={3}
            maxLength={100}
            placeholder="Write a short note here"
            className="mt-3 w-full resize-y rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:mt-0"
          />
        </div>

        <div className="border-b border-gray-100 py-5">
          <h2 className="text-base font-semibold text-gray-900">
            Bank account details
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Enter the bank account details of the recipient
          </p>
        </div>

        <div className="grid grid-cols-1 items-start gap-2 border-b border-gray-100 py-5 md:grid-cols-[minmax(0,0.55fr)_minmax(0,1fr)] md:gap-8">
          <label
            htmlFor="recipient-email"
            className="pt-2 text-sm font-medium text-gray-700"
          >
            Recipient&apos;s Email Address
          </label>
          <input
            id="recipient-email"
            name="recipientEmail"
            type="email"
            autoComplete="email"
            required
            maxLength={320}
            placeholder="ex: johndoe@gmail.com"
            className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="grid grid-cols-1 items-start gap-2 border-b border-gray-100 py-5 md:grid-cols-[minmax(0,0.55fr)_minmax(0,1fr)] md:gap-8">
          <label
            htmlFor="recipient-shareable-id"
            className="pt-2 text-sm font-medium text-gray-700"
          >
            Recipient&apos;s Bank Shareable ID
          </label>
          <div>
          <input
            id="recipient-shareable-id"
            name="recipientShareableId"
            type="text"
            autoComplete="off"
            required
            maxLength={100}
            placeholder="Enter the ID copied from the recipient's My Banks page"
            className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
            <p className="mt-1 text-xs text-gray-500">
              Ask the recipient to copy their Bank shareable ID from My Banks.
              This is different from the Plaid account ID.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-2 border-b border-gray-100 py-5 md:grid-cols-[minmax(0,0.55fr)_minmax(0,1fr)] md:gap-8">
          <label
            htmlFor="transfer-amount"
            className="pt-2 text-sm font-medium text-gray-700"
          >
            Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
              $
            </span>
            <input
              id="transfer-amount"
              name="amount"
              type="number"
              min="0.01"
              max="1000000"
              step="0.01"
              inputMode="decimal"
              required
              placeholder="ex: 5.00"
              className="h-11 w-full rounded-lg border border-gray-200 pl-8 pr-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
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
          className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4"
          role="alertdialog"
          aria-labelledby="confirm-transfer-heading"
          aria-describedby="confirm-transfer-description"
        >
          <h2
            id="confirm-transfer-heading"
            className="font-semibold text-gray-900"
          >
            Confirm bank transfer
          </h2>
          <p
            id="confirm-transfer-description"
            className="mt-1 text-sm text-gray-600"
          >
            Initiate a ${Number(confirmation.amount).toFixed(2)} transfer to{" "}
            {confirmation.recipientEmail}? Bank transfers may take time to
            settle.
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
        <div className="pt-6">
          <button
            type="submit"
            disabled={
              accounts.length === 0 ||
              !selectedAccount ||
              !selectedSourceReady
            }
            className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-blue-600 to-blue-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:from-blue-700 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Landmark size={17} aria-hidden="true" />
            Transfer Funds
          </button>
          {accounts.length === 0 && (
            <p className="mt-2 text-center text-xs text-gray-500">
              Link a bank account before initiating a transfer.
            </p>
          )}
          {accounts.length > 0 &&
            selectedAccount &&
            !selectedSourceReady &&
            !selectedAccount.fundingSourceConflict && (
            <p className="mt-2 text-center text-xs text-amber-700">
              Complete the setup above to enable transfers from this account.
            </p>
          )}
        </div>
      )}
    </form>
  );
};

export default PaymentTransferFields;
