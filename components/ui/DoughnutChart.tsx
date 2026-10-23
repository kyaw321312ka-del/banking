"use client";

import { useMemo } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

interface DoughnutChartProps {
  accounts: {
    name: string;
    balance: number | null;
  }[];
}

const COLORS = [
  "#2563EB",
  "#06B6D4",
  "#8B5CF6",
  "#F59E0B",
  "#10B981",
  "#F43F5E",
  "#64748B",
];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
    notation: Math.abs(amount) >= 1_000_000 ? "compact" : "standard",
  }).format(amount);

const DoughnutChart = ({ accounts }: DoughnutChartProps) => {
  const chartAccounts = useMemo(
    () =>
      accounts.filter(
        (account): account is { name: string; balance: number } =>
          account.balance !== null && account.balance > 0,
      ),
    [accounts],
  );

  const totalBalance = chartAccounts.reduce(
    (total, account) => total + account.balance,
    0,
  );

  const data = useMemo(
    () => ({
      labels: chartAccounts.map((account) => account.name),
      datasets: [
        {
          data: chartAccounts.map((account) => account.balance),
          backgroundColor: chartAccounts.map(
            (_, index) => COLORS[index % COLORS.length],
          ),
          borderColor: "#FFFFFF",
          borderWidth: 3,
          borderRadius: 4,
          hoverOffset: 6,
          spacing: 2,
        },
      ],
    }),
    [chartAccounts],
  );

  const options: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "76%",
    animation: {
      animateRotate: true,
      duration: 800,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: "#111827",
        titleColor: "#FFFFFF",
        bodyColor: "#E5E7EB",
        padding: 12,
        cornerRadius: 10,
        callbacks: {
          label: (context) => {
            const value = Number(context.raw);
            const percentage =
              totalBalance > 0 ? (value / totalBalance) * 100 : 0;

            return ` ${formatCurrency(value)} (${percentage.toFixed(1)}%)`;
          },
        },
      },
    },
  };

  if (accounts.length === 0) {
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-2xl bg-gray-50 px-4 text-center">
        <p className="max-w-48 text-sm leading-6 text-gray-500">
          Link a bank account to see your balance breakdown.
        </p>
      </div>
    );
  }

  if (chartAccounts.length === 0) {
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-2xl bg-gray-50 px-4 text-center">
        <p className="text-sm text-gray-500">
          No positive balances to display.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      {/* Donut chart */}
      <div className="relative mx-auto h-44 w-full max-w-52">
        <Doughnut data={data} options={options} />

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs font-medium text-gray-500">
            Total balance
          </span>
          <span className="mt-1 max-w-[85%] truncate text-xl font-bold tracking-tight text-gray-900">
            {formatCurrency(totalBalance)}
          </span>
          <span className="mt-1 text-xs text-gray-400">
            {chartAccounts.length}{" "}
            {chartAccounts.length === 1 ? "account" : "accounts"}
          </span>
        </div>
      </div>

      {/* Account breakdown */}
      <div className="space-y-3">
        {chartAccounts.map((account, index) => {
          const percentage = (account.balance / totalBalance) * 100;

          return (
            <div key={`${account.name}-${index}`} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: COLORS[index % COLORS.length],
                    }}
                  />
                  <span className="truncate text-gray-600">
                    {account.name}
                  </span>
                </div>

                <span className="shrink-0 font-semibold text-gray-900">
                  {percentage.toFixed(1)}%
                </span>
              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: COLORS[index % COLORS.length],
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DoughnutChart;