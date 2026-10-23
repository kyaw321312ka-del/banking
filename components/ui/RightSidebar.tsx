import Link from "next/link";
import {
  ArrowRight,
  Plus,
} from "lucide-react";
import BankCard from "./BankCard";
import RecentTransactions from "./RecentTransactions";

interface RightSidebarProps {
  user: { firstName: string; lastName: string } | null;
  transactions: React.ComponentProps<typeof RecentTransactions>["transactions"];
  transactionErrors?: string[];
  banks: {
    id: string;
    name: string;
    balance?: number | null;
    cardholder?: string;
    accountLabel?: string;
    variant?: "purple" | "blue" | "dark";
  }[];
}

const RightSidebar = ({
  user,
  transactions,
  banks,
  transactionErrors = [],
}: RightSidebarProps) => {
  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : "?";

  return (
    <aside className="flex w-full flex-col gap-5">
      {/* User profile */}
      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="h-20 bg-gradient-to-r from-[#111827] via-blue-900 to-blue-600" />

        <div className="px-5 pb-5">
          <div className="-mt-9 mb-3 flex items-end justify-between">
            <div className="flex h-[68px] w-[68px] items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-cyan-400 to-blue-600 text-xl font-bold text-white shadow-sm">
              {initials}
            </div>

            {user && (
              <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Active
              </span>
            )}
          </div>

          <h2 className="text-lg font-bold text-gray-900">
            {user ? `${user.firstName} ${user.lastName}` : "Guest User"}
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            {user
              ? "Personal Banking Account"
              : "Sign in to view your account"}
          </p>

          {user && (
            <Link
              href="/settings"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              View Profile
              <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
  <div className="mb-4 flex items-center justify-between">
    <div>
      <h2 className="font-semibold text-gray-900">My Banks</h2>
      <p className="mt-1 text-xs text-gray-500">
        Your connected institutions
      </p>
    </div>

    <Link
      href="/my-banks"
      className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 transition hover:text-blue-600"
    >
      <Plus size={18} />
      
      Add bank
    </Link>
  </div>

  <BankCard
    banks={banks.map((bank) => ({
      ...bank,
      cardholder: user
        ? `${user.firstName} ${user.lastName}`.trim()
        : bank.cardholder,
    }))}
  />
</section>

      <RecentTransactions
        transactions={transactions}
        errors={transactionErrors}
      />
    </aside>
  );
};

export default RightSidebar;