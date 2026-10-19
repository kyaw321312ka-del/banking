import Sidebar from "@/components/ui/Sidebar";
import MobileNav from "@/components/ui/MobileNav";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const loggedInUser = {
    firstName: "John",
    lastName: "Doe",
  };

  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar user={loggedInUser} />
      </div>

      {/* Mobile top navigation */}
      <MobileNav user={loggedInUser} />

      {/* Page content */}
      <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}