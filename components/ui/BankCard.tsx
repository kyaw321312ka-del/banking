"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Wifi } from "lucide-react";

interface Bank {
  id: string;
  name: string;
  cardholder?: string;
  expiryDate?: string;
  cardNumber?: string;
  network?: "VISA" | "MASTERCARD";
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

const BankCard = ({ banks }: BankCardProps) => {
  const [activeIndex, setActiveIndex] = useState(0);

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
          href="/banks"
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
          <div className="mb-2 flex items-end justify-between gap-2">
            <p className="truncate text-[10px] font-semibold uppercase tracking-wide sm:text-xs">
              {bank.cardholder ?? "NYX ACCOUNT HOLDER"}
            </p>
            <p className="shrink-0 text-xs font-semibold">
              {bank.expiryDate ?? "••/••"}
            </p>
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-mono text-xs font-semibold tracking-[0.12em] sm:text-sm">
              {bank.cardNumber ?? "•••• •••• •••• 1234"}
            </p>
            <span className="shrink-0 text-[10px] font-black italic sm:text-xs">
              {bank.network ?? "VISA"}
            </span>
          </div>
        </div>
      </div>
    );
  };

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

      <p className="mt-2 text-center text-xs text-gray-400">
        Card {activeIndex + 1} of {banks.length}
      </p>
    </div>
  );
};

export default BankCard;