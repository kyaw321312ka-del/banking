"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  Clipboard,
  ChevronLeft,
  ChevronRight,
  Plus,
  Wifi,
} from "lucide-react";

interface Bank {
  id: string;
  name: string;
  cardholder?: string;
  balance?: number | null;
  currency?: string;
  accountLabel?: string;
  accountIds?: { id: string; name: string; shareableId?: string }[];
  topCategories?: { name: string; amount: number; percentage: number }[];
  variant?: "purple" | "blue" | "dark";
}

interface BankCardProps {
  banks: Bank[];
}

const cardColors = {
  purple: "from-violet-400 via-purple-400 to-pink-300",
  blue: "from-sky-400 via-blue-500 to-blue-600",
  dark: "from-slate-700 via-slate-800 to-slate-900",
};

const formatCurrency = (amount: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);

const BankCard = ({ banks }: BankCardProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [copiedAccountId, setCopiedAccountId] = useState<string | null>(null);
  const [copyErrorAccountId, setCopyErrorAccountId] = useState<string | null>(
    null,
  );

  const showPrevious = () => {
    setActiveIndex((current) => (current - 1 + banks.length) % banks.length);
  };

  const showNext = () => {
    setActiveIndex((current) => (current + 1) % banks.length);
  };

  if (banks.length === 0) {
    return (
      <div className="py-5 text-center">
        <p className="text-sm text-gray-500">No connected banks yet.</p>
        <Link
          href="/my-banks"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800"
        >
          <Plus size={16} />
          Add bank
        </Link>
      </div>
    );
  }

  const activeBank = banks[activeIndex];

  const getBankStyle = (index: number) => {
    const bank = banks[index];

    if (bank.variant) return bank.variant;

    const styles = ["purple", "blue", "dark"] as const;
    return styles[index % styles.length];
  };

  const renderCard = (bank: Bank, index: number, className = "") => {
    const variant = getBankStyle(index);

    return (
      <div
        className={`relative aspect-[1.586/1] w-full overflow-hidden rounded-[20px] bg-gradient-to-br ${cardColors[variant]} text-white shadow-lg ${className}`}
      >
        {/* Decorative card pattern */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-20">
          <div className="absolute -bottom-20 -left-8 h-40 w-[125%] rotate-[-12deg] rounded-[50%] border border-white" />
          <div className="absolute -bottom-14 -left-8 h-32 w-[125%] rotate-[-12deg] rounded-[50%] border border-white" />
          <div className="absolute -bottom-8 -left-8 h-24 w-[125%] rotate-[-12deg] rounded-[50%] border border-white" />
        </div>

        {/* Header */}
        <div className="relative flex items-start justify-between gap-2 p-4">
          <p className="truncate text-sm font-bold sm:text-base">
            {bank.name}
          </p>
          <Wifi size={23} className="shrink-0 rotate-90" />
        </div>

        {/* Card details */}
        <div className="absolute inset-x-4 bottom-4">
          {bank.balance != null && (
            <p className="mb-2 text-lg font-bold tabular-nums sm:text-xl">
              {formatCurrency(bank.balance, bank.currency)}
            </p>
          )}

          <div className="mb-2 flex items-end justify-between gap-2">
            <p className="truncate text-[10px] font-semibold uppercase tracking-wide sm:text-xs">
              {bank.cardholder ?? "NYX ACCOUNT HOLDER"}
            </p>
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-mono text-xs font-semibold tracking-[0.12em] sm:text-sm">
              {bank.accountLabel ?? "Linked bank account"}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderAccountIds = (bank: Bank) => {
    if (!bank.accountIds?.length) return null;

    return (
      <div className="mt-3 space-y-2">
        {bank.accountIds.map((account) => (
          <div key={account.id} className="space-y-2">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-gray-700">
                  {account.name}
                </p>
                <p className="font-mono text-xs tracking-wider text-gray-500">
                  ••••••••{account.id.slice(-4)}
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  setCopyErrorAccountId(null);
                  try {
                    await navigator.clipboard.writeText(account.id);
                    setCopiedAccountId(account.id);
                    window.setTimeout(() => setCopiedAccountId(null), 2000);
                  } catch (error) {
                    console.error("Failed to copy Plaid account ID:", error);
                    setCopyErrorAccountId(account.id);
                  }
                }}
                aria-label={`Copy Plaid account ID for ${account.name}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {copiedAccountId === account.id ? (
                  <>
                    <Check size={14} />
                    Copied
                  </>
                ) : (
                  <>
                    <Clipboard size={14} />
                    Copy ID
                  </>
                )}
              </button>
            </div>
            {copyErrorAccountId === account.id && (
              <p className="px-1 text-xs text-red-600" role="alert">
                Couldn’t copy the ID. Check clipboard permissions and try
                again.
              </p>
            )}
            {account.shareableId && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-700">
                    Bank shareable ID
                  </p>
                  <p className="truncate font-mono text-xs tracking-wider text-gray-600">
                    {account.shareableId}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const copyKey = `shareable:${account.id}`;
                    setCopyErrorAccountId(null);
                    try {
                      await navigator.clipboard.writeText(account.shareableId!);
                      setCopiedAccountId(copyKey);
                      window.setTimeout(() => setCopiedAccountId(null), 2000);
                    } catch (error) {
                      console.error("Failed to copy bank shareable ID:", error);
                      setCopyErrorAccountId(copyKey);
                    }
                  }}
                  aria-label={`Copy bank shareable ID for ${account.name}`}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-blue-700 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {copiedAccountId === `shareable:${account.id}` ? (
                    <>
                      <Check size={14} />
                      Copied
                    </>
                  ) : (
                    <>
                      <Clipboard size={14} />
                      Copy ID
                    </>
                  )}
                </button>
              </div>
            )}
            {account.shareableId &&
              copyErrorAccountId === `shareable:${account.id}` && (
                <p className="px-1 text-xs text-red-600" role="alert">
                  Couldn’t copy the ID. Check clipboard permissions and try
                  again.
                </p>
              )}
          </div>
        ))}
      </div>
    );
  };

  const renderTopCategories = (bank: Bank) => {
    return (
      <section
        className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3"
        aria-label={`Top spending categories for ${bank.name}`}
      >
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Spending categories · last 30 days
        </h3>
        {bank.topCategories?.length ? (
          <ul className="space-y-3">
            {bank.topCategories.map((category) => (
              <li key={category.name} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-gray-700">{category.name}</span>
                  <span className="shrink-0 text-right font-semibold tabular-nums text-gray-900">
                    {category.percentage.toFixed(1)}% ·{" "}
                    {formatCurrency(category.amount, bank.currency)}
                  </span>
                </div>
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-gray-200"
                  role="progressbar"
                  aria-label={`${category.name} share of categorized spending`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(category.percentage)}
                >
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${Math.min(category.percentage, 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">
            No categorized spending in the last 30 days.
          </p>
        )}
      </section>
    );
  };

  if (banks.length === 1) {
    return (
      <div className="mx-auto w-full max-w-[340px]">
        {renderCard(banks[0], 0)}
        {renderAccountIds(banks[0])}
        {renderTopCategories(banks[0])}
      </div>
    );
  }

  return (
    <div>
      {/* Layered bank cards */}
      <div className="relative mx-auto w-full max-w-[340px]">
        <div className="relative aspect-[1.12/1] w-full">
          {banks.length > 2 && (
            <div className="absolute right-0 top-[16%] w-[88%] rotate-[3deg]">
              {renderCard(
                banks[(activeIndex + 2) % banks.length],
                (activeIndex + 2) % banks.length,
              )}
            </div>
          )}

          {banks.length > 1 && (
            <div className="absolute right-[2%] top-[9%] w-[88%] rotate-[-2deg]">
              {renderCard(
                banks[(activeIndex + 1) % banks.length],
                (activeIndex + 1) % banks.length,
              )}
            </div>
          )}

          <div className="absolute left-0 top-0 z-10 w-[92%]">
            {renderCard(activeBank, activeIndex)}
          </div>
        </div>
      </div>

      {/* Card controls */}
      {banks.length > 1 && (
        <div className="mt-1 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={showPrevious}
            aria-label="Previous bank card"
            className="rounded-full border border-gray-200 p-1.5 text-gray-600 transition hover:bg-gray-50 hover:text-blue-600"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex items-center gap-1.5">
            {banks.map((bank, index) => (
              <button
                key={bank.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Show ${bank.name}`}
                aria-current={index === activeIndex ? "true" : undefined}
                className={`h-1.5 rounded-full transition-all ${
                  index === activeIndex
                    ? "w-5 bg-blue-600"
                    : "w-1.5 bg-gray-300"
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={showNext}
            aria-label="Next bank card"
            className="rounded-full border border-gray-200 p-1.5 text-gray-600 transition hover:bg-gray-50 hover:text-blue-600"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {banks.length > 1 && (
        <p className="mt-2 text-center text-xs text-gray-400">
          Card {activeIndex + 1} of {banks.length}
        </p>
      )}
      <div className="mx-auto w-full max-w-[340px]">
        {renderTopCategories(activeBank)}
      </div>
    </div>
  );
};

export default BankCard;