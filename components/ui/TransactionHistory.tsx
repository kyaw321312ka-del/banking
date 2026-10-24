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
          Recent activity from linked bank accounts and transfers.
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
            Activity from linked bank accounts and transfers will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div
                className="grid grid-cols-[minmax(0,1fr)_150px_125px_100px_120px] gap-4 border-b border-gray-100 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400"
                aria-hidden="true"
              >
                <span>Transaction</span>
                <span>Category</span>
                <span>Date</span>
                <span>Status</span>
                <span className="text-right">Amount</span>
              </div>

              <ul className="divide-y divide-gray-100">
                {sortedTransactions.map((transaction) => {
                  const isIncome = transaction.amount < 0;
                  const displayAmount = -transaction.amount;

                  return (
                    <li
                      key={transaction.transaction_id}
                      className="grid grid-cols-[minmax(0,1fr)_150px_125px_100px_120px] items-center gap-4 px-5 py-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
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
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-800">
                            {transaction.name}
                          </p>
                        </div>
                      </div>

                      <p className="truncate text-sm text-gray-500">
                        {transaction.personal_finance_category?.primary ??
                          transaction.category?.[0] ??
                          "Uncategorized"}
                      </p>

                      <p className="text-sm text-gray-500">
                        {formatDate(transaction.date)}
                      </p>

                      <span
                        className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${
                          transaction.pending
                            ? "bg-amber-50 text-amber-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {transaction.pending ? "Pending" : "Posted"}
                      </span>

                      <p
                        className={`text-right text-sm font-semibold tabular-nums ${
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
          </div>
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
