import { Suspense } from "react";
import { connection } from "next/server";

import PaymentTransferFields from "@/components/ui/PaymentTransferFields";
import { getBanks } from "@/lib/actions/bank.actions";
import { getLoggedInUser } from "@/lib/auth";

export default function PaymentTransferForm() {
  return (
    <Suspense fallback={<PaymentTransferFallback />}>
      <PaymentTransferContent />
    </Suspense>
  );
}

async function PaymentTransferContent() {
  await connection();
  const user = await getLoggedInUser();
  const banks = user ? await getBanks({ userId: user.$id }) : [];
  const accounts = banks.flatMap((bank) =>
    bank.accounts.map((account) => ({
      id: account.account_id,
      bankRowId: account.bankRowId,
      label: `${bank.name} ${account.name}${
        account.mask ? ` •••• ${account.mask}` : ""
      }`,
      fundingSourceReady: account.fundingSourceReady,
      fundingSourceConflict: account.fundingSourceConflict,
    })),
  );

  return (
    <section className="mx-auto w-full max-w-5xl rounded-2xl border border-gray-100 bg-white px-5 py-6 shadow-sm sm:px-7 sm:py-8">
      <header className="mb-2 border-b border-gray-100 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Payment Transfer
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Please provide any specific details or notes related to the payment
          transfer
        </p>
      </header>

      <div className="pt-6">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">
          Send a bank-to-bank transfer
        </h2>
        <p className="mb-3 text-sm text-gray-500">
          Send funds from a linked bank account to another customer.
        </p>
        <PaymentTransferFields accounts={accounts} />
      </div>
    </section>
  );
}

function PaymentTransferFallback() {
  return (
    <section
      aria-label="Loading payment transfer"
      className="mx-auto w-full max-w-5xl animate-pulse space-y-5 rounded-2xl border border-gray-100 bg-white p-6"
    >
      <div className="h-14 rounded-lg bg-gray-200" />
      <div className="h-24 rounded-lg bg-gray-100" />
      <div className="h-24 rounded-lg bg-gray-100" />
      <div className="h-44 rounded-lg bg-gray-100" />
    </section>
  );
}
