import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import Sidebar from "@/components/ui/Sidebar";
import MobileNav from "@/components/ui/MobileNav";
import { getLoggedInUser } from "@/lib/auth";
import { getUserNameParts } from "@/lib/utils";

export const metadata = {
  title: "NYX Banking",
  description: "Manage your finances with ease.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      <Suspense fallback={<NavigationFallback />}>
        <AuthenticatedLayout>{children}</AuthenticatedLayout>
      </Suspense>
    </div>
  );
}

async function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await connection();
  const sessionUser = await getLoggedInUser();
  if (!sessionUser) redirect("/sign-in");

  const user = getUserNameParts(sessionUser.name);

  return (
    <>
      <div className="hidden lg:block">
        <Sidebar user={user} />
      </div>
      <MobileNav user={user} />
      <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
        {children}
      </main>
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