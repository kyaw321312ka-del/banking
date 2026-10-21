import AuthForm from "@/components/ui/AuthForm";

const SignUpPage = async () => {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <AuthForm type="sign-up" />
    </main>
  );
}

export default SignUpPage;