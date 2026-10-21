import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
//   Building2,
  Clock3,
  CreditCard,
  Plus,
} from "lucide-react";
import BankCard from "./BankCard";

interface RightSidebarProps {
  user: { firstName: string; lastName: string } | null;
  transactions: {
    id: string;
    description: string;
    amount: number;
    date: string;
  }[];
  banks: {
    id: string;
    name: string;
    balance?: number;
    cardholder?: string;
    expiryDate?: string;
    cardNumber?: string;
    network?: "VISA" | "MASTERCARD";
    variant?: "purple" | "blue" | "dark";
  }[];
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

const RightSidebar = ({
  user,
  transactions,
  banks,
}: RightSidebarProps) => {
  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : "?";

  const recentTransactions = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);

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
      href="/banks"
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

      {/* Recent transactions */}
      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">
              Recent Transactions
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Your latest account activity
            </p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <Clock3 size={20} />
          </div>
        </div>

        {recentTransactions.length > 0 ? (
          <div className="space-y-4">
            {recentTransactions.map((transaction) => {
              const isIncome = transaction.amount >= 0;

              return (
                <div
                  key={transaction.id}
                  className="flex items-center gap-3"
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
                      {transaction.description}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {formatDate(transaction.date)}
                    </p>
                  </div>

                  <p
                    className={`shrink-0 text-sm font-semibold tabular-nums ${
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
          href="/transactions"
          className="mt-5 flex items-center justify-center gap-2 border-t border-gray-100 pt-4 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-800"
        >
          View All Transactions
          <ArrowRight size={16} />
        </Link>
      </section>
    </aside>
  );
};

export default RightSidebar;