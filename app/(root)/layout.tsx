import { Suspense } from "react";

import Sidebar from "@/components/ui/Sidebar";
import MobileNav from "@/components/ui/MobileNav";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import { getUserNameParts } from "@/lib/utils";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      <Suspense fallback={<NavigationFallback />}>
        <SessionNavigation />
      </Suspense>

      {/* Page content */}
      <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}

async function SessionNavigation() {
  const sessionUser = await getLoggedInUser();
  const user = sessionUser ? getUserNameParts(sessionUser.name) : null;

  return (
    <>
      <div className="hidden lg:block">
        <Sidebar user={user} />
      </div>
      <MobileNav user={user} />
    </>
  );
}

function NavigationFallback() {
  return (
    <>
      <div
        aria-hidden="true"
        className="hidden h-screen w-64 shrink-0 animate-pulse bg-[#111827] lg:block"
      />
      <div
        aria-hidden="true"
        className="h-16 animate-pulse border-b border-gray-200 bg-white lg:hidden"
      />
    </>
  );
}