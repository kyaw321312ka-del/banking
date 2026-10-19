import { Wallet, ArrowUpRight, Landmark } from "lucide-react";
import AnimatedCounter from "./AnimatedCounter";
import DoughnutChart from "./DoughnutChart";

interface TotalBalanceBoxProps {
  accounts: { id: string; name: string; balance: number }[];
  totalBanks: number;
  totalCurrentBalance: number;
}

const TotalBalanceBox = ({
  accounts,
  totalBanks,
  totalCurrentBalance,
}: TotalBalanceBoxProps) => {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-md sm:p-6">
      {/* Subtle decorative background */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-blue-50/80 blur-2xl" />

      <div className="relative">
        {/* Card heading */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Wallet size={21} strokeWidth={1.8} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Total Balance
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">
                Overview of your finances
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="View balance details"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
          >
            <ArrowUpRight size={18} />
          </button>
        </div>

        {/* Balance and chart */}
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="mb-2 text-sm text-gray-500">
              Combined account balance
            </p>

            <div className="break-words text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              <AnimatedCounter amount={totalCurrentBalance} />
            </div>

            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Across all connected accounts
            </div>
          </div>

          <div className="flex h-40 w-40 shrink-0 items-center justify-center">
            <DoughnutChart accounts={accounts} />
          </div>
        </div>

        {/* Account statistics */}
        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-gray-100 pt-5">
          <div className="rounded-xl bg-gray-50 p-3">
            <div className="mb-2 flex items-center gap-2 text-gray-500">
              <Landmark size={16} />
              <span className="text-xs">Banks</span>
            </div>

            <p className="text-xl font-bold text-gray-900">
              {totalBanks}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Connected banks
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 p-3">
            <div className="mb-2 flex items-center gap-2 text-gray-500">
              <Wallet size={16} />
              <span className="text-xs">Accounts</span>
            </div>

            <p className="text-xl font-bold text-gray-900">
              {accounts.length}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Total accounts
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TotalBalanceBox;