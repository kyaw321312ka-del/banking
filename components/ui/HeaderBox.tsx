import React from "react";
import { Sparkles } from "lucide-react";

interface HeaderBoxProps {
  type: string;
  title: string;
  description: string;
  user: { firstName: string; lastName: string } | null;
  subtext: string;
}

const HeaderBox = ({
  type,
  title,
  description,
  user,
  subtext,
}: HeaderBoxProps) => {
  const firstName = user?.firstName?.trim();

  return (
    <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
      {/* Page heading */}
      <div className="min-w-0 space-y-2">
        {user && (
          <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
            <Sparkles size={16} />
            <span>
              {type === "greeting" ? "Welcome back" : "Hello"},
              {" "}
              {firstName}
            </span>
          </div>
        )}

        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          {title}
        </h1>

        <p className="max-w-2xl text-sm leading-6 text-gray-500 sm:text-base">
          {description}
        </p>

        {subtext && (
          <p className="text-sm font-medium text-gray-600">
            {subtext}
          </p>
        )}
      </div>

      {/* User identity */}
      {user && (
        <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700 ring-1 ring-blue-100">
            {user.firstName.charAt(0).toUpperCase()}
            {user.lastName.charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              {user.firstName} {user.lastName}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              Personal Account
            </p>
          </div>
        </div>
      )}
    </header>
  );
};

export default HeaderBox;