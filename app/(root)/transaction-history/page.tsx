import { Suspense } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, ReceiptText } from "lucide-react";
import { connection } from "next/server";

import { getTransactions } from "@/lib/actions/bank.actions";

const formatCurrency = (amount: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));

export default function TransactionHistory() {
  return (
    <Suspense fallback={<TransactionsFallback />}>
      <TransactionsContent />
    </Suspense>
  );
}

async function TransactionsContent() {
  await connection();
  const { transactions, errors } = await getTransactions();
  const sortedTransactions = [...transactions].sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">
          Transaction History
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Recent activity from your linked bank accounts.
        </p>
      </header>

      {errors.length > 0 && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="status"
        >
          {errors.map(({ message, code, requestId }) => (
            <p key={`${code}-${requestId ?? message}`}>
              {message}
              {code !== "UNKNOWN" ? ` Plaid code: ${code}.` : ""}
              {requestId ? ` Request ID: ${requestId}.` : ""}
            </p>
          ))}
          <Link
            href="/my-banks"
            className="mt-2 inline-block font-semibold underline underline-offset-2"
          >
            Manage bank connections
          </Link>
        </div>
      )}

      {sortedTransactions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <ReceiptText className="mx-auto mb-3 text-gray-400" size={28} />
          <h2 className="font-semibold text-gray-900">No transactions found</h2>
          <p className="mt-1 text-sm text-gray-500">
            Available activity from linked accounts will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <ul className="divide-y divide-gray-100">
            {sortedTransactions.map((transaction) => {
              const isIncome = transaction.amount < 0;
              const displayAmount = -transaction.amount;

              return (
                <li
                  key={transaction.transaction_id}
                  className="flex items-center gap-3 px-4 py-4 sm:px-5"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      isIncome
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-rose-50 text-rose-600"
                    }`}
                  >
                    {isIncome ? (
                      <ArrowDownLeft size={19} />
                    ) : (
                      <ArrowUpRight size={19} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-800">
                      {transaction.name}
                    </p>
                    <p className="mt-1 truncate text-xs text-gray-500">
                      {formatDate(transaction.date)}
                      {transaction.pending ? " · Pending" : ""}
                      {transaction.category?.[0]
                        ? ` · ${transaction.category[0]}`
                        : ""}
                    </p>
                  </div>

                  <p
                    className={`shrink-0 text-sm font-semibold tabular-nums ${
                      isIncome ? "text-emerald-600" : "text-gray-900"
                    }`}
                  >
                    {isIncome ? "+" : "−"}
                    {formatCurrency(
                      Math.abs(displayAmount),
                      transaction.iso_currency_code ?? "USD",
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

function TransactionsFallback() {
  return (
    <section
      aria-label="Loading transactions"
      className="mx-auto w-full max-w-5xl animate-pulse space-y-4"
    >
      <div className="h-16 rounded-2xl bg-gray-200" />
      <div className="h-72 rounded-2xl bg-gray-200" />
    </section>
  );
}
