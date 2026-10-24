import { Suspense } from "react";
import { connection } from "next/server";

import HeaderBox from "@/components/ui/HeaderBox";
import RecentTransactions from "@/components/ui/RecentTransactions";
import TotalBalanceBox from "@/components/ui/TotalBalanceBox";
import RightSidebar from "@/components/ui/RightSidebar";
import { getAccounts, getBanks, getTransactions } from "@/lib/actions/bank.actions";
import { getLoggedInUser } from "@/lib/auth";
import { getUserNameParts } from "@/lib/utils";

const Home = () => (
  <Suspense fallback={<DashboardFallback />}>
    <Dashboard />
  </Suspense>
);

const Dashboard = async () => {
  await connection();
  const sessionUser = await getLoggedInUser();
  const loggedInUser = sessionUser
    ? getUserNameParts(sessionUser.name)
    : null;

  const [connectedAccounts, transactionResult, connectedBanks] =
    sessionUser
      ? await Promise.all([
          getAccounts(),
          getTransactions(),
          getBanks({ userId: sessionUser.$id }),
        ])
      : [[], { transactions: [], errors: [] }, []];
  const plaidTransactions = transactionResult.transactions;

  const accounts = connectedAccounts.map(({ account }) => ({
    id: account.account_id,
    name: account.name,
    balance: account.balances.current,
  }));
  const totalCurrentBalance = accounts.every(
    (account) => account.balance !== null,
  )
    ? accounts.reduce((total, account) => total + (account.balance ?? 0), 0)
    : null;
  const banks = connectedBanks.map((bank) => ({
    id: bank.id,
    name: bank.name,
    currency:
      bank.accounts[0]?.balances.iso_currency_code ?? "USD",
    balance:
      bank.accounts.length > 0 &&
      bank.accounts.every(
      (account) => account.balances.current !== null,
      )
        ? bank.accounts.reduce(
            (total, account) => total + (account.balances.current ?? 0),
            0,
          )
        : undefined,
    accountLabel:
      bank.accounts.length === 1
        ? bank.accounts[0].mask
          ? `Account •••• ${bank.accounts[0].mask}`
          : "Account number unavailable"
        : `${bank.accounts.length} linked accounts`,
  }));
  const transactions = plaidTransactions.map((transaction) => ({
    id: transaction.transaction_id,
    description: transaction.name,
    amount: -transaction.amount,
    date: transaction.date,
  }));

  return (
    <section className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* Main dashboard */}
        <div className="min-w-0 space-y-6">
          <HeaderBox
            type="greeting"
            title="Welcome to NYX Banking!"
            user={loggedInUser}
            subtext="Manage your finances with ease."
          />

          <TotalBalanceBox
            accounts={accounts}
            totalBanks={banks.length}
            totalCurrentBalance={totalCurrentBalance}
          />

          <RecentTransactions
            transactions={transactions}
            errors={transactionResult.errors.map(
              ({ message, code, requestId }) =>
                `${message}${code !== "UNKNOWN" ? ` Plaid code: ${code}.` : ""}${
                  requestId ? ` Request ID: ${requestId}.` : ""
                }`,
            )}
          />

          {/* Add other dashboard cards here */}
        </div>

        {/* Right column */}
        <div className="min-w-0">
          <RightSidebar
            user={loggedInUser}
            banks={banks}
          />
        </div>
      </div>
    </section>
  );
};

const DashboardFallback = () => (
  <section
    aria-label="Loading dashboard"
    className="mx-auto w-full max-w-[1600px] animate-pulse space-y-6 p-4 sm:p-6 lg:p-8"
  >
    <div className="h-36 rounded-2xl bg-gray-200" />
    <div className="h-48 rounded-2xl bg-gray-200" />
  </section>
);

export default Home;