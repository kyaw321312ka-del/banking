import AuthForm from "@/components/ui/AuthForm";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <AuthForm type="sign-in" />
    </main>
  );
}