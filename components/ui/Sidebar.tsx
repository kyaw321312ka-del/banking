"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  CreditCard,
  ChartNoAxesCombined,
  Settings,
  CircleHelp,
  LogOut,
  ChevronRight,
} from "lucide-react";

import logo from "../icons/logo.webp";

type SidebarProps = {
  user: {
    firstName: string;
    lastName: string;
  };
};

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "My Accounts", href: "/accounts", icon: Wallet },
  { name: "Transactions", href: "/transactions", icon: ArrowLeftRight },
  { name: "My Cards", href: "/cards", icon: CreditCard },
  { name: "Analytics", href: "/analytics", icon: ChartNoAxesCombined },
];

const Sidebar = ({ user }: SidebarProps) => {
  const pathname = usePathname();

  const fullName = `${user.firstName} ${user.lastName}`;
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  return (
    <aside className="flex min-h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-[#111827] px-4 py-6 text-white">
      {/* Brand */}
      <Link href="/" className="mb-10 flex items-center gap-3 px-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-lg">
          <Image
            src={logo}
            alt="Banking app logo"
            width={32}
            height={32}
            className="object-contain"
          />
        </div>

        <div>
          <h1 className="text-lg font-bold tracking-wide">NYX Banking</h1>
          <p className="text-xs text-gray-400">Your money, simplified</p>
        </div>
      </Link>

      {/* User profile */}
      <div className="mb-8 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-sm font-bold text-white">
          {initials}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{fullName}</p>
          <p className="mt-1 text-xs text-gray-400">Personal Account</p>
        </div>

        <ChevronRight size={16} className="text-gray-500" />
      </div>

      {/* Navigation */}
      <nav className="flex-1">
        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
          Main Menu
        </p>

        <div className="space-y-1.5">
          {navigation.map(({ name, href, icon: Icon }) => {
            const isActive =
              href === "/"
                ? pathname === "/"
                : pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={name}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30"
                    : "text-gray-400 hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                <Icon
                  size={19}
                  strokeWidth={1.8}
                  className={
                    isActive
                      ? "text-white"
                      : "text-gray-400 transition-colors group-hover:text-white"
                  }
                />

                <span className="flex-1">{name}</span>

                {isActive && (
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Support */}
        <p className="mb-3 mt-9 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
          Preferences
        </p>

        <div className="space-y-1.5">
          <Link
            href="/settings"
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
              pathname === "/settings" || pathname.startsWith("/settings/")
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:bg-white/[0.07] hover:text-white"
            }`}
          >
            <Settings size={19} strokeWidth={1.8} />
            Settings
          </Link>

          <Link
            href="/help"
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-gray-400 transition-colors hover:bg-white/[0.07] hover:text-white"
          >
            <CircleHelp size={19} strokeWidth={1.8} />
            Help & Support
          </Link>
        </div>
      </nav>

      {/* Bottom section */}
      <div className="mt-8 border-t border-white/10 pt-5">
        <div className="mb-4 rounded-xl bg-gradient-to-br from-blue-600/20 to-cyan-500/10 p-3">
          <p className="text-sm font-semibold text-white">
            Banking made easier
          </p>
          <p className="mt-1 text-xs leading-5 text-gray-400">
            Manage your money securely in one place.
          </p>
        </div>

        <Link
          href="/logout"
          className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-gray-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut size={19} strokeWidth={1.8} />
          Sign out
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;