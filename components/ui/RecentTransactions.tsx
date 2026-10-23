"use client";

import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Clock3,
  CreditCard,
} from "lucide-react";

interface RecentTransactionsProps {
  transactions: {
    id: string;
    description: string;
    amount: number;
    date: string;
  }[];
  errors?: string[];
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

const formatDate = (date: string) => {
  const parsedDate = new Date(`${date.slice(0, 10)}T12:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsedDate);
};

const RecentTransactions = ({
  transactions,
  errors = [],
}: RecentTransactionsProps) => {
  const recentTransactions = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      {errors.length > 0 && (
        <div
          className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="status"
        >
          {errors.join(" ")}{" "}
          <Link
            href="/my-banks"
            className="font-semibold underline underline-offset-2"
          >
            Manage bank connections
          </Link>
        </div>
      )}

      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">Recent Transactions</h2>
          <p className="mt-1 text-xs text-gray-500">
            Your latest account activity
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
          <Clock3 size={20} />
        </div>
      </div>

      {recentTransactions.length > 0 ? (
        <div className="overflow-x-auto">
          <div className="min-w-[390px]">
            <div
              className="grid grid-cols-[minmax(0,1fr)_90px_95px] gap-3 border-b border-gray-100 px-1 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400"
              aria-hidden="true"
            >
              <span>Transaction</span>
              <span>Date</span>
              <span className="text-right">Amount</span>
            </div>

            <div className="divide-y divide-gray-100">
              {recentTransactions.map((transaction) => {
                const isIncome = transaction.amount >= 0;

                return (
                  <div
                    key={transaction.id}
                    className="grid grid-cols-[minmax(0,1fr)_90px_95px] items-center gap-3 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          isIncome
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-rose-50 text-rose-600"
                        }`}
                      >
                        {isIncome ? (
                          <ArrowDownLeft size={16} />
                        ) : (
                          <ArrowUpRight size={16} />
                        )}
                      </div>
                      <p className="truncate text-xs font-semibold text-gray-800">
                        {transaction.description}
                      </p>
                    </div>

                    <p className="text-xs text-gray-500">
                      {formatDate(transaction.date)}
                    </p>

                    <p
                      className={`text-right text-xs font-semibold tabular-nums ${
                        isIncome ? "text-emerald-600" : "text-gray-900"
                      }`}
                    >
                      {isIncome ? "+" : "−"}
                      {formatCurrency(Math.abs(transaction.amount))}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-gray-50 px-4 py-6 text-center">
          <CreditCard className="mx-auto mb-2 text-gray-400" size={24} />
          <p className="text-sm font-medium text-gray-700">
            No transactions yet
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Your latest activity will appear here.
          </p>
        </div>
      )}

      <Link
        href="/transaction-history"
        className="mt-5 flex items-center justify-center gap-2 border-t border-gray-100 pt-4 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-800"
      >
        View All Transactions
        <ArrowRight size={16} />
      </Link>
    </section>
  );
};

export default RecentTransactions;