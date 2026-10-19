"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  CreditCard,
  ChartNoAxesCombined,
  Settings,
  CircleHelp,
  LogOut,
} from "lucide-react";

import logo from "../icons/logo.webp";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "My Accounts", href: "/accounts", icon: Wallet },
  { name: "Transactions", href: "/transactions", icon: ArrowLeftRight },
  { name: "My Cards", href: "/cards", icon: CreditCard },
  { name: "Analytics", href: "/analytics", icon: ChartNoAxesCombined },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Help & Support", href: "/help", icon: CircleHelp },
];

const MobileNav = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const fullName = `${user.firstName} ${user.lastName}`;
  const initials =
    `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  const closeMenu = () => setIsOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-lg lg:hidden">
      {/* Top bar */}
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          onClick={closeMenu}
          className="flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-100 bg-white">
            <Image
              src={logo}
              alt="NYX Banking logo"
              width={30}
              height={30}
              className="object-contain"
            />
          </div>

          <div>
            <p className="text-base font-bold tracking-tight text-gray-900">
              NYX Banking
            </p>
            <p className="text-[11px] text-gray-500">
              Your money, simplified
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700 ring-1 ring-blue-100"
            aria-label={`Signed in as ${fullName}`}
          >
            {initials}
          </div>

          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isOpen}
            aria-controls="mobile-navigation"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-700 transition-colors hover:bg-gray-100"
          >
            {isOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>

      {/* Expandable navigation */}
      {isOpen && (
        <>
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={closeMenu}
            className="fixed inset-0 top-16 z-40 cursor-default bg-gray-950/30"
          />

          <nav
            id="mobile-navigation"
            aria-label="Mobile navigation"
            className="absolute inset-x-0 top-full z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-gray-200 bg-white px-4 pb-5 pt-4 shadow-xl sm:px-6"
          >
            {/* User details */}
            <div className="mb-5 flex items-center gap-3 rounded-2xl bg-gray-50 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white">
                {initials}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {fullName}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Personal Account
                </p>
              </div>
            </div>

            <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
              Navigation
            </p>

            <div className="space-y-1.5">
              {navigation.map(({ name, href, icon: Icon }) => {
                const isActive =
                  href === "/"
                    ? pathname === "/"
                    : pathname === href ||
                      pathname.startsWith(`${href}/`);

                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={closeMenu}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <Icon size={19} strokeWidth={1.8} />
                    <span className="flex-1">{name}</span>
                  </Link>
                );
              })}
            </div>

            <div className="mt-5 border-t border-gray-100 pt-4">
              <Link
                href="/logout"
                onClick={closeMenu}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                <LogOut size={19} />
                Sign out
              </Link>
            </div>
          </nav>
        </>
      )}
    </header>
  );
};

export default MobileNav;