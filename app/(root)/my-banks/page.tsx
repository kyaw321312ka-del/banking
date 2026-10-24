import { Suspense } from "react";
import { Landmark, Wallet } from "lucide-react";
import { connection } from "next/server";

import BankCard from "@/components/ui/BankCard";
import FundingSourceSetup from "@/components/ui/FundingSourceSetup";
import PlaidLink from "@/components/ui/PlaidLink";
import ResolveFundingSourceConflict from "@/components/ui/ResolveFundingSourceConflict";
import { getBanks, getTransactions } from "@/lib/actions/bank.actions";
import { getLoggedInUser } from "@/lib/auth";

const formatCurrency = (amount: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);

export default function MyBanks() {
  return (
    <Suspense fallback={<BanksFallback />}>
      <BanksContent />
    </Suspense>
  );
}

async function BanksContent() {
  await connection();
  const user = await getLoggedInUser();

  if (!user) return null;

  const [banks, transactionResult] = await Promise.all([
    getBanks({ userId: user.$id }),
    getTransactions(),
  ]);
  const topCategoriesByBank = new Map<
    string,
    { name: string; amount: number; percentage: number }[]
  >();

  for (const bank of banks) {
    const accountBankIds = new Set(
      bank.accounts.map((account) => account.bankRowId),
    );
    const totals = new Map<string, number>();

    for (const transaction of transactionResult.transactions) {
      if (
        !("bankId" in transaction) ||
        !accountBankIds.has(transaction.bankId) ||
        transaction.amount <= 0
      ) {
        continue;
      }

      const category =
        transaction.personal_finance_category?.primary ??
        transaction.category?.[0];
      if (category) {
        totals.set(category, (totals.get(category) ?? 0) + transaction.amount);
      }
    }

    const totalSpending = [...totals.values()].reduce(
      (total, amount) => total + amount,
      0,
    );
    topCategoriesByBank.set(
      bank.id,
      [...totals]
        .map(([name, amount]) => ({
          name,
          amount,
          percentage: totalSpending > 0 ? (amount / totalSpending) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount),
    );
  }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Banks</h1>
          <p className="mt-1 text-sm text-gray-500">
            Linked accounts and current balances from your financial
            institutions.
          </p>
        </div>
        <PlaidLink user={{ email: user.email }} variant="ghost" />
      </header>

      {banks.length > 0 && (
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-900">Your Bank Cards</h2>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {banks.map((bank) => {
              const currency =
                bank.accounts[0]?.balances.iso_currency_code ?? null;
              const hasOneCurrency =
                currency !== null &&
                bank.accounts.every(
                  (account) =>
                    account.balances.iso_currency_code === currency,
                );
              const hasAllBalances = bank.accounts.every(
                (account) => account.balances.current !== null,
              );
              const balance =
                bank.accounts.length > 0 &&
                hasAllBalances &&
                hasOneCurrency
                  ? bank.accounts.reduce(
                      (total, account) =>
                        total + (account.balances.current ?? 0),
                      0,
                    )
                  : null;
              const accountLabel =
                bank.accounts.length === 1
                  ? bank.accounts[0].mask
                    ? `Account •••• ${bank.accounts[0].mask}`
                    : "Account number unavailable"
                  : `${bank.accounts.length} linked accounts`;

              return (
                <BankCard
                  key={bank.id}
                  banks={[
                    {
                      id: bank.id,
                      name: bank.name,
                      cardholder: user.name,
                      balance,
                      currency: currency ?? undefined,
                      accountLabel,
                      topCategories: topCategoriesByBank.get(bank.id) ?? [],
                      accountIds: bank.accounts.map((account) => ({
                        id: account.account_id,
                        name: account.name,
                        shareableId: account.bankShareableId,
                      })),
                    },
                  ]}
                />
              );
            })}
          </div>
        </section>
      )}

      {banks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <Landmark className="mx-auto mb-3 text-gray-400" size={28} />
          <h2 className="font-semibold text-gray-900">No linked banks yet</h2>
          <p className="mt-1 text-sm text-gray-500">
            Connect a bank to see its accounts and live balances here.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {banks.map((bank) => (
            <section
              key={bank.id}
              className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Landmark size={20} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold text-gray-900">
                      {bank.name}
                    </h2>
                    <p className="text-xs text-gray-500">
                      {bank.accounts.length}{" "}
                      {bank.accounts.length === 1 ? "account" : "accounts"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {bank.items.map((item) => (
                    <PlaidLink
                      key={item.id}
                      user={{ email: user.email }}
                      updateBankRowId={item.id}
                      variant="ghost"
                    />
                  ))}
                </div>
              </div>

              <ul className="divide-y divide-gray-100">
                {bank.accounts.map((account) => (
                  <li
                    key={account.account_id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Wallet className="shrink-0 text-gray-400" size={18} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-800">
                          {account.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {account.mask
                            ? `•••• ${account.mask}`
                            : "Account number unavailable"}
                          {account.subtype
                            ? ` · ${account.subtype}`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-3">
                      <p className="text-sm font-semibold tabular-nums text-gray-900">
                        {account.balances.current === null
                          ? "Balance unavailable"
                          : formatCurrency(
                              account.balances.current,
                              account.balances.iso_currency_code ?? "USD",
                            )}
                      </p>
                      {account.fundingSourceConflict ? (
                        <span className="text-xs font-medium text-amber-700">
                          Transfer setup needs review
                        </span>
                      ) : account.fundingSourceReady ? (
                        <span className="text-xs font-medium text-emerald-700">
                          Transfers ready
                        </span>
                      ) : (
                        <FundingSourceSetup bankRowId={account.bankRowId} />
                      )}
                    </div>
                    {account.fundingSourceConflict && (
                      <div className="w-full space-y-2 text-right">
                        <p className="text-xs text-amber-700">
                          Multiple linked accounts share one Dwolla funding
                          source. Confirm which account matches in Dwolla
                          before resolving.
                        </p>
                        <div className="flex justify-end">
                          <ResolveFundingSourceConflict
                            bankRowId={account.bankRowId}
                            accountName={account.name}
                            accountMask={account.mask}
                          />
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

function BanksFallback() {
  return (
    <section
      aria-label="Loading bank accounts"
      className="mx-auto w-full max-w-5xl animate-pulse space-y-4"
    >
      <div className="h-16 rounded-2xl bg-gray-200" />
      <div className="h-48 rounded-2xl bg-gray-200" />
    </section>
  );
}
