import { Suspense } from "react";
import { connection } from "next/server";

import HeaderBox from "@/components/ui/HeaderBox";
import PlaidLink from "@/components/ui/PlaidLink";
import TotalBalanceBox from "@/components/ui/TotalBalanceBox";
import RightSidebar from "@/components/ui/RightSidebar";
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

  const accounts = [
    { id: "checking", name: "Checking", balance: 900 },
    { id: "savings", name: "Savings", balance: 350 },
  ];

  const transactions = [
    {
      id: "txn1",
      description: "Grocery Store",
      amount: -50.25,
      date: "2026-10-18",
    },
    {
      id: "txn2",
      description: "Salary",
      amount: 2000,
      date: "2026-10-17",
    },
  ];

  const banks = [
    { id: "bank1", name: "Bank A", balance: 900 },
    { id: "bank2", name: "Bank B", balance: 350 },
  ];

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

          {sessionUser && (
            <PlaidLink user={{ email: sessionUser.email }} variant="ghost" />
          )}

          <TotalBalanceBox
            accounts={accounts}
            totalBanks={banks.length}
            totalCurrentBalance={1250}
          />

          {/* Add other dashboard cards here */}
        </div>

        {/* Right column */}
        <div className="min-w-0">
          <RightSidebar
            user={loggedInUser}
            transactions={transactions}
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