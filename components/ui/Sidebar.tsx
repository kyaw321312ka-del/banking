"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Settings,
  CircleHelp,
  LogOut,
  ChevronRight,
} from "lucide-react";

import { logoutAccount } from "@/lib/actions/user.actions";
import PlaidLink from "./PlaidLink";
import logo from "../icons/logo.png";

type SidebarProps = {
  user: {
    firstName: string;
    lastName: string;
  } | null;
  email: string;
};

const navigation = [
  { name: "Home", href: "/", icon: LayoutDashboard },
  { name: "My Banks", href: "/my-banks", icon: Wallet },
  { name: "Transaction History", href: "/transaction-history", icon: ArrowLeftRight },
  { name: "Transfer Funds", href: "/payment-transfer", icon: ArrowLeftRight }
];

const isRouteActive = (pathname: string, href: string) =>
  href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);

const Sidebar = ({ user, email }: SidebarProps) => {
  const pathname = usePathname();

  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : "";
  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : "";

  const linkClass = (active: boolean) =>
    `group flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors duration-200 ${
      active
        ? "bg-[#2563EB] text-white shadow-sm shadow-blue-950/30"
        : "text-gray-400 hover:bg-white/[0.07] hover:text-white"
    }`;

  return (
    <aside
        className="
    sidebar-scroll sticky top-0 flex h-screen w-64 shrink-0
    flex-col overflow-y-auto
    border-r border-white/[0.08]
    bg-[#111827] px-4 py-6 text-white
  "
    >
      {/* Brand */}
      <Link
        href="/"
        className="mb-8 flex shrink-0 items-center gap-3 px-2"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
          <Image
            src={logo}
            alt="NYX Banking logo"
            width={32}
            height={32}
            className="object-contain"
          />
        </div>

        <div className="min-w-0">
          <h1 className="whitespace-nowrap text-lg font-bold tracking-wide">
            NYX Banking
          </h1>
          <p className="mt-0.5 whitespace-nowrap text-xs text-gray-400">
            Your money, simplified
          </p>
        </div>
      </Link>

      {/* User profile */}
      {user && (
        <div className="mb-7 flex shrink-0 items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-sm font-bold text-white">
            {initials}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {fullName}
            </p>
            <p className="mt-1 text-xs text-gray-400">Personal Account</p>
          </div>

          <ChevronRight
            size={16}
            className="shrink-0 text-gray-500"
            aria-hidden="true"
          />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1" aria-label="Main navigation">
        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
          Main Menu
        </p>

        <div className="space-y-1.5">
          {navigation.map(({ name, href, icon: Icon }) => {
            const active = isRouteActive(pathname, href);

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={linkClass(active)}
              >
                <Icon
                  size={19}
                  strokeWidth={1.8}
                  className="shrink-0"
                  aria-hidden="true"
                />

                <span className="flex-1">{name}</span>

                {active && (
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-white"
                    aria-hidden="true"
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Preferences */}
        <p className="mb-3 mt-8 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
          Preferences
        </p>

        <div className="space-y-1.5">
          <Link
            href="/settings"
            aria-current={
              isRouteActive(pathname, "/settings") ? "page" : undefined
            }
            className={linkClass(isRouteActive(pathname, "/settings"))}
          >
            <Settings
              size={19}
              strokeWidth={1.8}
              className="shrink-0"
              aria-hidden="true"
            />
            <span>Settings</span>
          </Link>

          <Link
            href="/help"
            aria-current={
              isRouteActive(pathname, "/help") ? "page" : undefined
            }
            className={linkClass(isRouteActive(pathname, "/help"))}
          >
            <CircleHelp
              size={19}
              strokeWidth={1.8}
              className="shrink-0"
              aria-hidden="true"
            />
            <span>Help & Support</span>
          </Link>
        </div>
      </nav>

      {/* Bottom section */}
      <div className="mt-7 shrink-0 border-t border-white/[0.08] pt-5">
        <PlaidLink user={{ email }} />

        <div className="rounded-xl border border-blue-400/10 bg-gradient-to-br from-blue-600/15 to-cyan-500/[0.06] p-3">
          <p className="text-sm font-semibold text-white">
            Banking made easier
          </p>
          <p className="mt-1 text-xs leading-5 text-gray-400">
            Manage your money securely in one place.
          </p>
        </div>

        <form action={logoutAccount}>
          <button
            type="submit"
            className="mt-3 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-gray-400 transition-colors duration-200 hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut
              size={19}
              strokeWidth={1.8}
              className="shrink-0"
              aria-hidden="true"
            />
            <span>Sign out</span>
          </button>
        </form>
      </div>
    </aside>
  );
};

export default Sidebar;